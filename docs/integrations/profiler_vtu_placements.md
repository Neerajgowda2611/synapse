# Profiler Webhook Integration (VTU Placements → Profiler)

**Status:** Design / implementation guide for the VTU Placements platform.

**Stack:** Go API (backend) + Next.js (frontend). Emits and outbox live in **Go**; Next.js admin calls Go to save the ingest URL and view delivery logs.

**Contract:** [VTU Placements webhook integration](vtu-placements-webhook.md)

**Split context (separate repos):**

- [Next.js / frontend context](vtu-placements-frontend-context.md)
- [Go API / backend context](vtu-placements-backend-context.md)

---

## Architecture

```
Next.js UI  ──HTTP──►  Go API (placements)
                           │
Student applies / updates profile
  └─ handler commits domain row
       └─ go emit.EmitApplicationSubmitted(ctx, ids...)   // goroutine / async, non-blocking
            ├─ load student, job, org from Postgres
            ├─ build envelope + payload_schema skeleton
            ├─ INSERT webhook_deliveries (status=pending)
            └─ go dispatcher.DispatchPending(ctx)

College admin pastes URL (Next.js) ──► Go PUT /admin/organizations/:id/profiler-ingest-url
                                    ──► organization_settings + webhook_endpoints
```

**Cron (external or in-process):** every 5 min → `GET /internal/cron/dispatch-webhooks` (or separate worker binary).

---

## Configuration vs monitoring

| Surface | Owner | Purpose |
| --- | --- | --- |
| **Next.js → College settings → Profiler** | Next.js page | Paste per-college ingest URL; calls Go API |
| **Next.js → Admin → Webhooks** | Next.js page | List endpoints, delivery logs, resend (reads Go API) |
| **Profiler admin** | Profiler | Create webhook data source, consent, generate URL |

Each **college** has its own ingest URL (confirmed). No global VTU URL.

---

## Per-org configuration

1. College admin creates webhook data source in Profiler → accepts consent → copies ingest URL.
2. College admin pastes URL in **Placements admin** (Next.js).
3. Next.js `POST /api/admin/organizations/:id/profiler-ingest-url` → **Go API** validates URL, saves:
   - `organization_settings.profiler_ingest_url`
   - upsert `webhook_endpoints` (`source = 'profiler'`, `subscribed_events = ['*']`)

New college = paste URL only. No deploy.

---

## Reliability (outbox + retries)

Same pattern as Ship-ee:

| Piece | Behaviour |
| --- | --- |
| **No inline POST** | User HTTP handler returns after DB commit; emit is async |
| **Outbox table** | `webhook_deliveries` — one row per event |
| **Immediate dispatch** | `go dispatcher.DispatchPending(ctx)` after enqueue |
| **Cron backup** | Every 5 min drain `pending` + reclaim stuck `delivering` |
| **Retries** | Up to 6 attempts, exponential backoff |
| **Concurrency** | `SELECT … FOR UPDATE SKIP LOCKED` when claiming rows |
| **Dedup** | Profiler 202 + `duplicate: true` → mark success |

**Caveat:** Emit after domain commit, not always same transaction. Rare crash between commit and enqueue can drop one event.

---

## Observation envelope

```json
{
  "source_id": "app-8821",
  "idempotency_key": "vtu_placements:application.submitted:app-8821",
  "source_connector": "vtu_placements",
  "source_event_type": "application.submitted",
  "ingestion_altitude": "observation",
  "occurred_at": "2026-06-22T14:00:00Z",
  "payload_schema": {
    "application_id": "string",
    "job_id": "string",
    "student": { "id": "string" },
    "submitted_at": "string"
  },
  "payload": { }
}
```

See [contract doc](vtu-placements-webhook.md) for full catalog and examples.

---

## Event catalog → Go hook points

Emit from **Go handlers/services** after successful writes. Next.js must not POST to Profiler directly.

| `source_event_type` | Suggested Go trigger |
| --- | --- |
| `profile.field_updated` | `ProfileService.UpdateField` — one event per changed field (or batch if you prefer one envelope with `fields[]`; default: per field) |
| `profile.completeness_updated` | End of `ProfileService.Save` / `UpdateProfile` — **every save**, include `completeness_percent` |
| `project.added` | `ProfileService.AddProject` |
| `certificate.added` | `ProfileService.AddCertificate` |
| `experience.added` | `ProfileService.AddExperience` |
| `skill.declared` | `SkillService.Declare` |
| `skill.endorsed` | `SkillService.Endorse` |
| `application.submitted` | `ApplicationService.Submit` — include `requirement_match_score` if computed |
| `job.viewed` | `JobService.RecordView` |
| `job.saved` | `JobService.Save` |
| `application.recruiter_responded` | `ApplicationService.RecordRecruiterResponse` — `response_duration_seconds` |
| `interview.scheduled` | `ApplicationService.ScheduleInterview` |
| `offer.received` | `ApplicationService.RecordOffer` |

**Phase A (MVP):** `profile.completeness_updated`, `application.submitted`, `job.viewed`  
**Phase B:** Full catalog

---

## Database changes (Go / Postgres)

Migrations in **Placements Go repo** (e.g. `migrations/`, `goose`, `atlas`). Profiler DB unchanged.

### 1. Column on organization settings

```sql
ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS profiler_ingest_url text;
```

### 2. `webhook_endpoints`

```sql
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  source text NOT NULL DEFAULT 'profiler',
  url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  subscribed_events text[] NOT NULL DEFAULT ARRAY['*'],
  consecutive_failures int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source)
);
```

### 3. `webhook_deliveries` (outbox + logs)

```sql
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id uuid NOT NULL REFERENCES webhook_endpoints(id),
  organization_id uuid NOT NULL,
  source_event_type text NOT NULL,
  idempotency_key text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  last_http_status int,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending
  ON webhook_deliveries (status, next_retry_at)
  WHERE status = 'pending';
```

`payload` column stores the **full Profiler envelope** (same as Ship-ee).

---

## Go package layout (proposed)

```
placements-api/
├── internal/
│   ├── webhooks/
│   │   ├── events.go          # event types, idempotency key, envelope struct
│   │   ├── payloads.go        # build inner payload per event
│   │   ├── serializers.go     # whitelist fields (student, job, org)
│   │   ├── schema_skeleton.go # build payload_schema object from payload shape
│   │   ├── urlguard.go        # SSRF check on ingest URL
│   │   └── config.go          # WEBHOOK_ENABLED
│   ├── webhooks/emit/
│   │   └── emit.go            # EmitApplicationSubmitted, EmitProfileCompleteness, ...
│   ├── webhooks/dispatch/
│   │   └── dispatch.go        # HTTP POST, retry, claim pending rows
│   ├── webhooks/repo/
│   │   └── repo.go            # endpoints + deliveries CRUD
│   └── handler/
│       ├── admin_profiler.go  # SaveProfilerIngestURL
│       ├── admin_webhooks.go  # List endpoints, deliveries, resend
│       └── cron_webhooks.go   # DispatchPending handler
├── cmd/
│   └── api/main.go
└── migrations/
```

### Envelope struct (Go)

```go
type ObservationEnvelope struct {
    SourceID          string          `json:"source_id"`
    IdempotencyKey    string          `json:"idempotency_key"`
    SourceConnector   string          `json:"source_connector"` // "vtu_placements"
    SourceEventType   string          `json:"source_event_type"`
    IngestionAltitude string          `json:"ingestion_altitude"` // "observation"
    OccurredAt        time.Time       `json:"occurred_at"`
    Payload           json.RawMessage `json:"payload"`
    PayloadSchema     json.RawMessage `json:"payload_schema,omitempty"`
    Description       *string         `json:"description,omitempty"`
}
```

### Emit pattern (Go)

```go
// After application submit succeeds:
go func() {
    ctx := context.Background()
    _ = emit.ApplicationSubmitted(ctx, emit.ApplicationSubmittedParams{
        OrganizationID: orgID,
        ApplicationID:  appID,
    })
}()
```

Inside `ApplicationSubmitted`:

1. If `!webhooks.Enabled()` return  
2. Load endpoints for `organization_id`  
3. `payloads.BuildApplicationSubmitted(...)`  
4. `schema_skeleton.FromPayload(payload)`  
5. `repo.InsertDelivery(...)`  
6. `dispatch.DispatchPending(ctx)`

---

## Next.js changes (frontend + BFF)

Next.js **does not** implement the outbox. It only provides UI and proxies to Go.

| Page / route | Calls Go API |
| --- | --- |
| `app/admin/colleges/[id]/profiler/page.tsx` | `PUT /v1/admin/organizations/:id/profiler-ingest-url` |
| `app/admin/webhooks/page.tsx` | `GET /v1/admin/webhooks`, `GET /v1/admin/webhooks/deliveries` |
| Resend button | `POST /v1/admin/webhooks/deliveries/:id/resend` |

Use server actions or API routes with service token — never expose Go admin endpoints without auth.

**Example server action:**

```typescript
await placementsApi.saveProfilerIngestUrl(collegeId, { ingestUrl })
```

---

## Cron jobs

### 1. `dispatch-webhooks` (required)

| Item | Value |
| --- | --- |
| Schedule | `*/5 * * * *` |
| Handler | Go `GET /internal/cron/dispatch-webhooks` |
| Auth | `X-Cron-Secret` or platform scheduler secret |
| Logic | `dispatch.DispatchPending(ctx, limit: 100)` |

Options to run:

- **Kubernetes CronJob** hitting Go API  
- **GitHub Actions** / cloud scheduler  
- **In-process** `time.Ticker` in Go if single-instance (not ideal for multi-replica)

### 2. No separate cron for `profile.completeness_updated`

Emit on **every profile save** in Go (your choice). No weekly completeness cron unless you add `profile.completeness.reported` later.

---

## Environment variables

| Variable | Service | Purpose |
| --- | --- | --- |
| `WEBHOOK_ENABLED` | Go API | `true` to enqueue + deliver |
| `WEBHOOK_INTERNAL_HOST_ALLOWLIST` | Go API | Profiler hostname(s) for SSRF guard |
| `WEBHOOK_ALLOW_INSECURE_LOCAL` | Go API | Allow `http://localhost` in dev |
| `CRON_SECRET` | Go API | Protect cron route |
| `PLACEMENTS_API_URL` | Next.js | Go API base URL for admin calls |

---

## Implementation phases

| Phase | Scope | Effort |
| --- | --- | --- |
| **A** | Migrations + ingest URL API + outbox + dispatch + 3 events (`profile.completeness_updated`, `application.submitted`, `job.viewed`) + Next.js Profiler URL card | ~1–1.5 weeks |
| **B** | Remaining event hooks + serializers + Webhooks admin UI | ~1–2 weeks |
| **Per new college** | Paste URL in admin | **0 dev** |

---

## Onboarding checklist

**Profiler (per college):**

1. Create org / institution in Profiler.  
2. Create webhook data source.  
3. Accept raw-storage consent.  
4. Generate ingest URL → copy.

**VTU Placements:**

1. Run Go migrations.  
2. Set `WEBHOOK_ENABLED=true`.  
3. College admin pastes URL in Next.js admin.  
4. Student submits application → verify in Profiler **Collected data**.  
5. Share final `payload` + `payload_schema` per event with Profiler for bindings.

---

## Testing

1. One college with test ingest URL.  
2. Save profile → `profile.completeness_updated` with `completeness_percent`.  
3. Submit application → `application.submitted` with org + student + job embedded.  
4. View job → `job.viewed`.  
5. Second college, different URL → events isolated.  
6. College with no URL → no delivery rows.  
7. Stop Profiler → deliveries retry; recover when back up.

---

## Open items (confirm with Placements team)

| Topic | Question |
| --- | --- |
| `profile.field_updated` | One event per field change, or batched? |
| `requirement_match_score` | Already computed on submit? Scale 0–1 or 0–100? |
| Recruiter response | Single `application.recruiter_responded` or split by action type? |
| Issuer on certificates | Always self-reported or third-party verified flag? |
| Go module paths | Exact repo layout / handler names when implementation starts |

---

## Related docs

- [VTU Placements contract + catalog](vtu-placements-webhook.md)
- [Ship-ee implementation (reference)](profiler_mentorship.md)
- [Projex implementation (reference)](profiler_projex.md)
