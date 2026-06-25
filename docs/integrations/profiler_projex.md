# Profiler Webhook Integration (Projex → Profiler)

**Status:** Design / implementation guide (target architecture).  
Mirror of the [Ship-ee (Mentorship) implementation doc](profiler_mentorship.md). Use this when building Profiler outbound webhooks in the **Projex** repo.

**Contract reference:** [Projex → Profiler Webhook Integration](projex-webhook.md) (envelope, event catalog, examples).

Projex sends **observation** events to Profiler using a **per-organization** ingest URL. Events are queued in an outbox (`webhook_delivery`) and delivered asynchronously with retries — never inline from the user’s HTTP request.

---

## Architecture

```
domain action (e.g. task created)
  └─ emitTaskEvent / emitProfilerObservation(...)     fire-and-forget
       ├─ load project / task / user / milestone + embed related records
       ├─ wrap Profiler observation envelope
       ├─ INSERT webhook_delivery (status=pending)
       └─ immediate dispatch + cron drainer

org admin pastes ingest URL → organization_settings.profiler_ingest_url
                         → upsert webhook_endpoint (source=profiler, subscribedEvents=['*'])
```

**Cron (recommended):**


| Schedule                      | Route                                   | Purpose                                                                     |
| ----------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `*/5 * * * `*                 | `/api/cron/dispatch-webhooks`           | Drain pending outbox rows + reclaim stuck `delivering`                      |
| `0 2 * * 0` (weekly) or daily | `/api/cron/emit-contribution-snapshots` | Emit `contribution.counted` per project/milestone window (optional Phase B) |


---

## Configuration vs monitoring


| Surface                                                   | Purpose                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Admin → Organization → Profiler** (or Project settings) | Configure the per-org ingest URL (one URL per organization).                 |
| **Admin → Webhooks**                                      | Monitor endpoints, view delivery logs, activate/deactivate, resend failures. |


Profiler endpoints are created automatically when an ingest URL is saved. There is **no global** ingest URL — each org’s project events only POST to that org’s endpoint.

---

## Per-org configuration

1. Profiler org admin creates a webhook data source, **accepts raw-storage consent**, and generates an ingest URL.
2. Org admin (or platform admin) pastes the URL in **Projex org settings** (Profiler card).
3. Projex stores the URL in `organization_settings.profiler_ingest_url` and mirrors it to `webhook_endpoint` (`source = 'profiler'`, `organization_id` set, `subscribed_events = ['*']`).

No code deploy for new orgs — only paste the URL.

---

## Reliability (outbox + retries)

Events are **not** sent inline over HTTP from the request path.


| Behaviour          | Detail                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------- |
| Enqueue            | Each event → one row in `webhook_delivery` (`status = pending`) with full envelope JSON |
| Immediate dispatch | After insert, trigger worker (e.g. `ctx.waitUntil` or background job)                   |
| Cron backup        | Every 5 minutes drain pending + reclaim stuck `delivering` rows                         |
| Concurrency        | One outbox row per event — parallel task activity does not drop events                  |
| Retries            | Up to 6 attempts, exponential backoff; `FOR UPDATE SKIP LOCKED` avoids double-send      |
| Profiler dedup     | Same `idempotency_key` → HTTP 202 + `duplicate: true` → mark delivery success           |


**Caveat:** Emit runs after the domain DB write, not always in the same transaction. Crash between commit and outbox insert can lose one event. After insert, delivery is at-least-once with retries.

---

## Observation envelope

Every POST body uses this shape (store verbatim in `webhook_delivery.payload`):

```json
{
  "source_id": "task-5001",
  "idempotency_key": "projex:task.created:task-5001",
  "source_connector": "projex",
  "source_event_type": "task.created",
  "ingestion_altitude": "observation",
  "occurred_at": "2026-06-22T11:00:00Z",
  "payload_schema": {
    "task_id": "string",
    "project_id": "string",
    "project": { "id": "string", "name": "string" },
    "title": "string"
  },
  "description": "Optional one-line summary",
  "payload": { }
}
```

- `source_connector` is always `"projex"`.
- `idempotency_key` = `projex:{source_event_type}:{source_id}`.
- `payload_schema` = JSON **object** skeleton mirroring `payload` (type placeholders, not a version string).
- Profiler returns **HTTP 202** for new and duplicate events.
- Plain JSON only (no HMAC until Profiler supports it).

### Payload contract (proposed — inner `payload` + `payload_schema` skeleton)

Compact, high-level inner `payload`. Adapt field names to Projex’s real schema; version bump to `@2` when frozen.

**Always embed (when available):**

```json
{
  "organization": { "id": "org-atria", "name": "Atria Institute" },
  "project": {
    "id": "proj-42",
    "name": "Capstone Alpha",
    "code": "CS499-A",
    "courseId": "course-101",
    "courseName": "Capstone Project",
    "term": "2026-S1",
    "status": "active"
  }
}
```

**Event-specific blocks** (include only what applies):


| Field                         | Events                                               |
| ----------------------------- | ---------------------------------------------------- |
| `task`                        | Task lifecycle (`task.`*)                            |
| `milestone`                   | `milestone.defined`, `milestone.submitted`           |
| `user` / `assignee` / `actor` | Assignments, comments, status changes                |
| `comment`                     | `comment.posted`                                     |
| `feedback`                    | `feedback.posted`, `revision.submitted`              |
| `review`                      | `review.requested`, `review.given`                   |
| `blocker`                     | `blocker.raised`                                     |
| `meeting`                     | `meeting.scheduled`, `meeting.attended`              |
| `contribution`                | `contribution.counted` (snapshot metrics per member) |
| `evaluation`                  | `evaluation.received`                                |
| `peerRating`                  | `peer_rating.given`                                  |


Example `task` block:

```json
{
  "task": {
    "id": "task-5001",
    "title": "Implement auth module",
    "status": "open",
    "dueAt": "2026-07-01T23:59:59Z",
    "milestoneId": "ms-1001"
  }
}
```

Do **not** dump full DB rows or internal-only columns. Whitelist fields in a serializer (same pattern as Ship-ee `serializers.ts`).

---

## Event catalog → where to hook

Map each `source_event_type` to a Projex trigger. Adjust paths to your actual module layout.


| `source_event_type`    | Suggested trigger (Projex)     | Notes                                |
| ---------------------- | ------------------------------ | ------------------------------------ |
| `milestone.defined`    | Milestone create service / API | After milestone + due date persisted |
| `milestone.submitted`  | Submission handler             | Include `submitted_at` vs `due_at`   |
| `task.created`         | Task create                    |                                      |
| `task.assigned`        | Assignment mutation            |                                      |
| `task.self_claimed`    | Claim-unassigned-task flow     |                                      |
| `task.started`         | Status → in progress           |                                      |
| `task.status_changed`  | Generic status transition      | Include `from` / `to`                |
| `task.closed`          | Status → done                  |                                      |
| `task.time_logged`     | Time entry create/update       | Include estimate if known            |
| `task.reopened`        | Reopen closed task             |                                      |
| `comment.posted`       | Comment create                 | Task or milestone parent             |
| `feedback.posted`      | Faculty feedback create        |                                      |
| `revision.submitted`   | Revision upload after feedback |                                      |
| `review.requested`     | Review request create          |                                      |
| `review.given`         | Review complete                |                                      |
| `blocker.raised`       | Blocker log on task            |                                      |
| `role.assigned`        | Project member role change     | lead / member                        |
| `meeting.scheduled`    | Meeting create                 |                                      |
| `meeting.attended`     | Attendance recorded            |                                      |
| `contribution.counted` | **Cron** or milestone close    | Snapshot, not per-click              |
| `evaluation.received`  | Rubric evaluation save         |                                      |
| `peer_rating.given`    | Peer rating submit             |                                      |


**Phase A (MVP):** `task.created`, `task.closed`, `milestone.submitted` — proves pipeline end-to-end.  
**Phase B:** Remaining catalog + `contribution.counted` cron.

---

## Database changes (Projex Postgres)

**No changes to Profiler.** All migrations are in Projex.

### 1. Column on org settings

```sql
ALTER TABLE organization_settings
  ADD COLUMN profiler_ingest_url text;
```

Human-edited URL from admin UI.

### 2. `webhook_endpoint`

Delivery target per org (normalized for the worker).


| Column                     | Type          | Notes                             |
| -------------------------- | ------------- | --------------------------------- |
| `id`                       | uuid PK       |                                   |
| `organization_id`          | uuid FK       |                                   |
| `source`                   | text          | `'profiler'`                      |
| `url`                      | text NOT NULL | Full ingest URL                   |
| `is_active`                | boolean       | Default true                      |
| `subscribed_events`        | text[]        | `['*']` for Profiler (all events) |
| `consecutive_failures`     | int           | Optional health tracking          |
| `created_at`, `updated_at` | timestamptz   |                                   |


Unique: one active Profiler endpoint per org (or upsert on save).

### 3. `webhook_delivery` (outbox + logs)


| Column                | Type           | Notes                                           |
| --------------------- | -------------- | ----------------------------------------------- |
| `id`                  | uuid PK        |                                                 |
| `webhook_endpoint_id` | uuid FK        |                                                 |
| `organization_id`     | uuid FK        | Denormalized for admin filters                  |
| `source_event_type`   | text           | e.g. `task.created`                             |
| `idempotency_key`     | text           | For admin search + dedup visibility             |
| `payload`             | jsonb NOT NULL | **Full Profiler envelope**                      |
| `status`              | text           | `pending` | `delivering` | `success` | `failed` |
| `attempts`            | int            | Default 0                                       |
| `next_retry_at`       | timestamptz    |                                                 |
| `last_http_status`    | int            |                                                 |
| `last_error`          | text           |                                                 |
| `delivered_at`        | timestamptz    |                                                 |
| `created_at`          | timestamptz    |                                                 |


Indexes: `(status, next_retry_at)` for worker; `(webhook_endpoint_id, created_at DESC)` for logs UI.

> Apply via your ORM migrations (`db:push` / Flyway / etc.) before testing.

---

## How it works (end-to-end)

1. **Configure** — Admin saves Profiler ingest URL → `organization_settings` + upsert `webhook_endpoint`.
2. **Trigger** — Domain code (task create, milestone submit, …) calls `emit`* in `webhook-emit.ts` with IDs only.
3. **Build payload** — `payloads.ts` loads project/task/user/milestone; `serializers.ts` shapes compact `@1` JSON.
4. **Enqueue** — Active Profiler endpoints for that org get a `webhook_delivery` row (`pending`).
5. **Dispatch** — Worker POSTs JSON to endpoint URL immediately + cron every 5 minutes.
6. **Retry** — Failures → `pending` with backoff; permanent failure → `failed` (admin can resend).
7. **Monitor** — Admin → Webhooks shows endpoints and delivery logs.

---

## Proposed code layout (Projex repo)

Adapt package paths to Projex’s stack (Node/Go/etc.). Names follow Ship-ee for consistency.

### Core library (`lib/webhooks/` or `internal/webhooks/`)


| File             | Responsibility                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `events.ts`      | `PROFILER_EVENTS` enum, envelope type, `buildIdempotencyKey()`, `buildPayloadSchemaSkeleton()` per event |
| `payloads.ts`    | Per-event builders: `buildTaskPayload`, `buildMilestonePayload`, `buildMeetingPayload`, …                   |
| `serializers.ts` | Whitelist fields on project, task, user, milestone — `buildCompactPayload()`                                |
| `config.ts`      | `isWebhooksEnabled()` ← `WEBHOOK_ENABLED=true`                                                              |
| `url-guard.ts`   | SSRF check before save/send; allowlist Profiler host                                                        |


### Services


| File                       | Responsibility                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `webhook-emit.ts`          | **Entry point:** `emitTaskEvent`, `emitMilestoneEvent`, `emitCommentEvent`, `emitContributionSnapshot`, … Fire-and-forget; never throw to caller. |
| `webhook-dispatch.ts`      | Claim pending rows, POST, record result, backoff, `resendDeliveryNow()`                                                                           |
| `profiler-ingest.ts`       | Validate URL, save `profiler_ingest_url`, upsert `webhook_endpoint`                                                                               |
| `contribution-snapshot.ts` | **Cron helper:** compute per-member contribution → emit `contribution.counted`                                                                    |


### Data access


| File               | Responsibility                                                |
| ------------------ | ------------------------------------------------------------- |
| `repo/webhooks.ts` | CRUD endpoints; insert/claim/update deliveries; stuck reclaim |


### API routes


| Route                                       | Responsibility                             |
| ------------------------------------------- | ------------------------------------------ |
| `POST /api/admin/.../profiler-ingest-url`   | Save URL (or tRPC `saveProfilerIngestUrl`) |
| `GET /api/cron/dispatch-webhooks`           | Cron drainer (`CRON_SECRET` header)        |
| `GET /api/cron/emit-contribution-snapshots` | Weekly/daily contribution events (Phase B) |
| `webhook.list` / `webhook.listDeliveries`   | Admin monitoring API                       |


### Admin UI


| Screen                  | Responsibility                                                        |
| ----------------------- | --------------------------------------------------------------------- |
| **Org → Profiler card** | Text field for ingest URL, save, optional “Test connection”           |
| **Admin → Webhooks**    | Table: org, URL, active, call count; logs sheet with payload + resend |
| Sidebar link            | `/admin/webhooks`                                                     |


Gate all UI behind `WEBHOOK_ENABLED`.

---

## Emit pattern (code change per action)

Routers/services **only pass IDs**. Never build JSON in handlers.

```typescript
// After task is created and DB commit succeeds:
void emitTaskEvent({
  organizationId: project.organizationId,
  projectId: project.id,
  taskId: task.id,
  eventType: 'task.created',
})
```

Inside `emitTaskEvent`:

```typescript
if (!isWebhooksEnabled()) return
const endpoints = await findActiveProfilerEndpoints(organizationId)
if (endpoints.length === 0) return

const innerPayload = await buildTaskPayload({ projectId, taskId, eventType })
const envelope = buildProfilerEnvelope({
  sourceId: taskId,
  sourceEventType: eventType,
  occurredAt: new Date(),
  payload: innerPayload,
})

await insertDeliveries(endpoints, envelope)
void dispatchPendingDeliveries({ organizationId })
```

## Cron jobs

### 1. `dispatch-webhooks` (required)

- **Schedule:** every 5 minutes
- **Auth:** `CRON_SECRET` header or Vercel cron signature
- **Logic:** `dispatchPendingDeliveries({ limit: 100 })`
- **Also reclaims:** rows stuck in `delivering` > N minutes

### 2. `emit-contribution-snapshots` (Phase B)

- **Schedule:** weekly or on milestone close (product decision)
- **Logic:** For each active project/org with Profiler URL configured, compute contribution metrics → one `contribution.counted` envelope per member (or per project rollup — agree with Profiler)
- **Why cron:** Not tied to a single user click; snapshot over a time window

---

## Environment variables


| Variable                          | Purpose                                       |
| --------------------------------- | --------------------------------------------- |
| `WEBHOOK_ENABLED`                 | `true` to enable emit + admin UI; default off |
| `WEBHOOK_INTERNAL_HOST_ALLOWLIST` | Profiler API hostname(s) for SSRF guard       |
| `WEBHOOK_ALLOW_INSECURE_LOCAL`    | Allow `http://localhost` for dev              |
| `CRON_SECRET`                     | Auth for cron routes                          |


---

## Implementation phases


| Phase           | Scope                                                                                                       | Effort     |
| --------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| **A**           | DB tables + org URL UI + outbox + dispatch + hooks for `task.created`, `task.closed`, `milestone.submitted` | ~1 week    |
| **B**           | Full event catalog hooks + serializers for all entity types                                                 | ~1–2 weeks |
| **C**           | `contribution.counted` cron + admin webhook monitoring polish                                               | ~3–5 days  |
| **Per new org** | Admin pastes URL                                                                                            | **0 dev**  |


---

## Testing

1. Configure test ingest URL for one org (`WEBHOOK_ENABLED=true`).
2. Create a task → expect one `task.created` with `project`, `task`, `organization` in `payload`.
3. Retry delivery with same `idempotency_key` → Profiler `duplicate: true`, delivery `success`.
4. Second org with different URL → events do not cross orgs.
5. Org with no URL → emit is no-op (no delivery rows).
6. Kill Profiler temporarily → rows stay `pending`, cron retries, eventually `success` or `failed` with resend in admin UI.

---

## Related docs

- [Projex webhook contract + examples](projex-webhook.md)
- [Ship-ee implementation (reference)](profiler_mentorship.md)
- [Webhook ingestion index](../webhook-ingestion.md)

