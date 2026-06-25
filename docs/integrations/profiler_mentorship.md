# Profiler Webhook Integration (Mentorship → Profiler)

Ship-ee sends **observation** events to [Profiler](https://github.com/Moonshotedx/ship-ee) using a per-organization ingest URL. Events are queued in a transactional outbox (`webhook_delivery`) and delivered asynchronously with retries.

## Architecture

```
domain action (e.g. session booked)
  └─ emitSessionEvent / emitProfilerObservation(...)     fire-and-forget
       ├─ load native entities + embed related records
       ├─ wrap Profiler observation envelope
       ├─ INSERT webhook_delivery (status=pending)
       └─ ctx.waitUntil(dispatch) + cron drainer

org admin pastes ingest URL → organization_settings.profiler_ingest_url
                         → upsert webhook_endpoint (source=profiler, subscribedEvents=['*'])
```

Cron: `*/5 * * * *` → `/api/cron/dispatch-webhooks`

## Configuration vs monitoring

| Surface | Purpose |
| --- | --- |
| **Admin → Program → Overview → Profiler** | Configure the per-org ingest URL (one URL per organization). |
| **Admin → Webhooks** | Monitor endpoints, view delivery logs, activate/deactivate, and resend failures. |

Profiler endpoints are created automatically when you save an ingest URL on the program overview page. There is no global ingest URL — each organization’s sessions and messages only fan out to that org’s endpoint.

## Per-org configuration

1. Profiler admin creates a webhook data source and generates an ingest URL.
2. Platform admin pastes the URL in **Admin → Program → Overview → Profiler** ([`admin-program-organization-page.tsx`](../src/app/admin/components/admin-program-organization-page.tsx)).
3. The URL is stored in `organization_settings.profiler_ingest_url` and mirrored to a `webhook_endpoint` row (`source = 'profiler'`, `organization_id` set, `subscribedEvents = ['*']`).

No code deploy is needed for new orgs — only paste the URL.

## Reliability (outbox + retries)

Events are **not** sent inline over HTTP from the request path. Each matching event inserts a row into `webhook_delivery` (`status = pending`), then a worker delivers it:

- **Immediate dispatch** after insert via `ctx.waitUntil(dispatchPendingDeliveries)`.
- **Cron backup** every 5 minutes drains pending rows and reclaims stuck `delivering` rows.
- **Concurrent events** each get their own outbox row — parallel session/message activity does not drop earlier events.
- **Retries:** up to 6 attempts with exponential backoff; `FOR UPDATE SKIP LOCKED` prevents double-send under concurrent workers.
- **Profiler dedup:** same `idempotency_key` returns HTTP 202 with `duplicate: true`; delivery is marked success.

**Caveat:** emit runs after the domain DB write, not in the same transaction. If the process crashes between commit and outbox insert, that single event could be lost. After insert, delivery is at-least-once with retries.

## Observation envelope

Every POST body uses this shape (stored verbatim in `webhook_delivery.payload`):

```json
{
  "source_id": "sess-abc123",
  "idempotency_key": "mentorship:session.booked:sess-abc123",
  "source_connector": "mentorship",
  "source_event_type": "session.booked",
  "ingestion_altitude": "observation",
  "occurred_at": "2026-06-22T10:30:00Z",
  "payload_schema": {
    "booking_id": "string",
    "session_id": "string",
    "session": { "id": "string", "status": "string", "scheduled_at": "string" },
    "mentor": { "id": "string", "display_name": "string" },
    "mentee": { "id": "string", "display_name": "string" },
    "booked_at": "string"
  },
  "description": "Optional one-line summary",
  "payload": { }
}
```

Payloads use a compact inner `payload` contract. Each user action triggers **one** webhook call. Include **`payload_schema`** as a JSON object skeleton (same shape as `payload`, type placeholders as values) on every event.

### Payload contract (`@2`)

```json
{
  "organization": { "id": "org-1", "name": "Acme" },
  "relation": { "id": "rel-1", "status": "active", "groupMentorshipId": null },
  "mentor": {
    "id": "user-mentor",
    "profileId": "mp-1",
    "name": "Jane Coach",
    "avatarUrl": "https://…",
    "educations": [],
    "experiences": [],
    "skills": "leadership"
  },
  "mentee": { "id": "user-mentee", "profileId": "mep-1", "name": "Alex", "avatarUrl": null, "educations": [], "experiences": [], "skills": null },
  "session": {
    "id": "sess-1",
    "status": "scheduled",
    "sessionType": "regular",
    "sessionMode": "online",
    "scheduledStartAt": "2026-06-22T10:00:00Z",
    "scheduledEndAt": "2026-06-22T11:00:00Z",
    "mentorshipRelationId": "rel-1"
  },
  "cadence": {
    "weeklyCount": 1,
    "monthlyCount": 3,
    "requiredCount": 1,
    "frequency": "weekly",
    "isCompliant": true
  }
}
```

Event-specific fields (only one primary entity per event):

| Field | Events |
| --- | --- |
| `session` | Session lifecycle events |
| `cadence` | `session.booked` only (folded in; no separate cadence webhook on book) |
| `message` + `sender` | `message.exchanged` |
| `note` (`title`, `description`) | `note.created`, `note.updated` |
| `task` (`title`, `description`, `status`, `assignees`) | `task.created`, `task.updated`, `task.completed` |
| `rating` | `session.rated` (when ratings exist on session) |
| `sessionPrivateNotes` | `session.notes_posted` |
| `attendance` | `session.attended`, `session.completed`, `session.no_show`, `session.cancelled` |

`attendance` is a compact summary (not raw Zoom JSON):

```json
{
  "attendance": {
    "zoomMetricsStatus": "success",
    "participantCount": 2,
    "meetingHeld": true,
    "menteeAttended": true,
    "reportStatus": "report"
  }
}
```

- **`participantCount`** — number of Zoom participants when metrics were fetched.
- **`menteeAttended`** — whether the mentee matched a participant (`true` / `false` / `null` if unknown).
- **`meetingHeld`** — whether the meeting had any participants.

For **`session.completed`** and **`session.no_show`**, the cron job [`processSessionEndOutcomes`](src/lib/services/process-session-end-outcomes.ts) (via `/api/cron/update-session-status`) uses the same Zoom data to auto-resolve sessions 90 minutes after `scheduledEndAt`. It emits `session.completed` or `session.no_show` with this `attendance` block included.

`mentor` and `mentee` are **single merged person objects** (no separate `mentorProfile` / `menteeProfile`). Full Zoom payloads, calendar IDs, and full DB rows are excluded.

- Profiler returns **HTTP 202** for new and duplicate events (same `idempotency_key`).
- Profiler endpoints receive **plain JSON** (no HMAC).

The optional `description` on the observation envelope is set in code for some event types (e.g. session requested). Profiler ingest URL configuration does not expose a user-editable description field.

## Event catalog

| `source_event_type` | Trigger |
| --- | --- |
| `session.requested` | `mentorship.requestMentorship` |
| `session.booked` | All session booking paths (`scheduleSession`, trial, group, admin, org_admin) |
| `session.attended` | Zoom metrics fetched successfully |
| `session.no_show` | Status → `no_show`, cron `processSessionEndOutcomes` |
| `session.cancelled` | Cancel / status update |
| `session.rescheduled` | `reschedule` |
| `session.completed` | Manual complete, status update, or cron `processSessionEndOutcomes` (90 min after `scheduledEndAt`) |
| `session.rated` | Feedback submit, `updateMenteeFeedback` |
| `session.notes_posted` | `updateMentorPrivateNotes` |
| `message.exchanged` | `message.send` |
| `mentor.role_assigned` | Mentor profile created / org mentor access granted |
| `session.cadence.reported` | Reserved for future scheduled compliance jobs (not fired on session book) |
| `note.created` | `note.create` |
| `note.updated` | `note.update` |
| `task.created` | `task.create` |
| `task.updated` | `task.update` |
| `task.completed` | `task.complete` |

**Not implemented (no product model yet):** `mentor.attestation_given`, `follow_up.logged`

## Database tables

Two tables plus one settings column power the whole flow:

| Table / column | Role |
| --- | --- |
| `organization_settings.profiler_ingest_url` | Human-edited ingest URL on program overview. |
| `webhook_endpoint` | Normalized delivery target per org (URL, `is_active`, `subscribed_events`, health counters). One row per org Profiler URL. |
| `webhook_delivery` | **Outbox + delivery logs.** One row per event sent (or attempted). Stores full envelope JSON in `payload`, retry state, HTTP result. Admin **Logs** and **Calls** read from here. |

Schema definitions: [`src/lib/db/schema.ts`](../src/lib/db/schema.ts) (`profilerIngestUrl` ~L1194, `webhookEndpoint` ~L1621, `webhookDelivery` ~L1654).

> **Note:** Apply migrations (or `npm run db:push`) so these tables exist in Postgres before testing in a new environment.

## How it works (end-to-end)

1. **Configure** — Platform admin saves Profiler ingest URL → `organization_settings` + upsert `webhook_endpoint`.
2. **Trigger** — Domain code (session book, message send, etc.) calls an `emit*` function in `webhook-emit.ts`.
3. **Build payload** — `payloads.ts` loads DB entities and `serializers.ts` shapes the compact `@2` JSON.
4. **Enqueue** — Matching active endpoints get a row in `webhook_delivery` (`status = pending`) with the full Profiler envelope in `payload`.
5. **Dispatch** — `dispatchPendingDeliveries()` POSTs to the endpoint URL immediately (`ctx.waitUntil`) and via cron every 5 minutes.
6. **Retry** — Failures reset to `pending` with exponential backoff (up to 6 attempts); permanent failures stay `status = failed`.
7. **Monitor** — Admin → Webhooks lists endpoints and opens delivery logs from `webhook_delivery`.

## Implementation files

### Core library (`src/lib/webhooks/`)

| File | What it does |
| --- | --- |
| [`events.ts`](../src/lib/webhooks/events.ts) | **Event catalog** — `PROFILER_EVENTS` list, Zod enums, `ProfilerObservationEnvelope` type, `buildIdempotencyKey()` / `buildPayloadSchemaSkeleton()` for the outer POST body. |
| [`payloads.ts`](../src/lib/webhooks/payloads.ts) | **Payload builders** — Loads mentorship/session/message/note/task rows from Postgres and assembles the inner `payload` object per event (e.g. `buildSessionPayload`, `buildMessagePayload`). Calls serializers to slim fields. |
| [`serializers.ts`](../src/lib/webhooks/serializers.ts) | **Compact `@2` contract** — Whitelists fields on sessions, people, orgs, messages, notes, tasks. Exports `buildCompactPayload`, `buildWebhookPerson`, etc. Keeps webhooks high-level (no raw Zoom blobs). |
| [`config.ts`](../src/lib/webhooks/config.ts) | **Feature flag** — `isWebhooksEnabled()` reads `WEBHOOK_ENABLED=true`. When false, emit and admin UI are no-ops. |
| [`url-guard.ts`](../src/lib/webhooks/url-guard.ts) | **SSRF protection** — `assertSafeWebhookUrl()` blocks private IPs and validates scheme/host before save or send. Uses `WEBHOOK_INTERNAL_HOST_ALLOWLIST` for Profiler internal hosts. |

### Services (`src/lib/services/`)

| File | What it does |
| --- | --- |
| [`webhook-emit.ts`](../src/lib/services/webhook-emit.ts) | **Event emitter (main entry point).** Exports `emitSessionEvent`, `emitMessageEvent`, `emitNoteEvent`, `emitTaskEvent`, `emitMentorRoleAssignedEvent`, etc. Each runs fire-and-forget: build envelope → find subscribed endpoints → `insertDeliveries` → `dispatchPendingDeliveries`. Never throws into the caller. |
| [`webhook-dispatch.ts`](../src/lib/services/webhook-dispatch.ts) | **HTTP delivery worker.** Claims pending rows (`FOR UPDATE SKIP LOCKED`), POSTs JSON to endpoint URL, records success/failure, applies exponential backoff, auto-disables non-Profiler endpoints after 10 consecutive failures. Exports `resendDeliveryNow()` for admin manual resend. |
| [`profiler-ingest.ts`](../src/lib/services/profiler-ingest.ts) | **Ingest URL save.** Validates URL, writes `organization_settings.profiler_ingest_url`, upserts `webhook_endpoint` (`source = profiler`, `subscribedEvents = ['*']`). Called from admin TRPC. |
| [`session-attendance.ts`](../src/lib/services/session-attendance.ts) | **Attendance summary** — Builds compact `attendance` block (participant count, mentee attended, meeting held) for session lifecycle webhooks. |
| [`process-session-end-outcomes.ts`](../src/lib/services/process-session-end-outcomes.ts) | **Cron session resolver** — 90 min after `scheduledEndAt`, uses Zoom data to emit `session.completed` or `session.no_show` with attendance payload. |

### Data access

| File | What it does |
| --- | --- |
| [`src/lib/repo/webhooks.ts`](../src/lib/repo/webhooks.ts) | **Repository** — CRUD for `webhook_endpoint`; insert/claim/update for `webhook_delivery`; `countDeliveriesByEndpointIds` for Calls column; `upsertProfilerEndpoint`, `requeueDelivery`, stuck-delivery reclaim. |

### API & routing

| File | What it does |
| --- | --- |
| [`src/server/trpc/routers/webhook.ts`](../src/server/trpc/routers/webhook.ts) | **Admin webhook TRPC** — `list` (endpoints + call counts), `listDeliveries` (logs pagination), `activate` / `deactivate`, `resend`, `test`. Gated by `WEBHOOK_ENABLED` and org scope. |
| [`src/server/trpc/routers/admin.ts`](../src/server/trpc/routers/admin.ts) | **`saveProfilerIngestUrl`** mutation — delegates to `profiler-ingest.ts`. Also emits session status webhooks on admin session updates. |
| [`src/server/trpc/routers/_app.ts`](../src/server/trpc/routers/_app.ts) | Registers `webhook` router on the app router. |
| [`src/app/api/cron/dispatch-webhooks/route.ts`](../src/app/api/cron/dispatch-webhooks/route.ts) | **Cron drainer** — `GET` with `CRON_SECRET`; runs `dispatchPendingDeliveries({ limit: 100 })` every 5 minutes as backup to immediate dispatch. |

### Admin UI

| File | What it does |
| --- | --- |
| [`src/app/admin/webhooks/page.tsx`](../src/app/admin/webhooks/page.tsx) | Route shell for Admin → Webhooks. |
| [`src/app/admin/components/webhook-management.tsx`](../src/app/admin/components/webhook-management.tsx) | **Monitoring UI** — Org filter, endpoint table (URL, events, active, calls), activate/deactivate, **Logs** slide sheet (infinite scroll from `webhook_delivery`), resend + view payload. |
| [`src/app/admin/components/admin-program-organization-page.tsx`](../src/app/admin/components/admin-program-organization-page.tsx) | **Profiler ingest URL card** on program overview (platform admin only). Saves via `admin.saveProfilerIngestUrl`. |
| [`src/app/admin/components/admin-sidebar.tsx`](../src/app/admin/components/admin-sidebar.tsx) | Nav link to `/admin/webhooks`. |

### Environment

| File | What it does |
| --- | --- |
| [`src/lib/env.ts`](../src/lib/env.ts) | Zod schema for `WEBHOOK_ENABLED`, `WEBHOOK_INTERNAL_HOST_ALLOWLIST`, `WEBHOOK_ALLOW_INSECURE_LOCAL`. |

### Event trigger points (who calls `emit*`)

These files invoke the emitter after successful domain writes. They do **not** build payloads directly — they only pass IDs.

| File | Events emitted |
| --- | --- |
| [`src/server/trpc/routers/session.ts`](../src/server/trpc/routers/session.ts) | `session.booked`, `session.rescheduled`, `session.cancelled`, `session.completed`, `session.rated`, `session.notes_posted`, … |
| [`src/server/trpc/routers/mentorship.ts`](../src/server/trpc/routers/mentorship.ts) | `session.requested`, `session.cancelled` / status changes |
| [`src/server/trpc/routers/message.ts`](../src/server/trpc/routers/message.ts) | `message.exchanged` |
| [`src/server/trpc/routers/note.ts`](../src/server/trpc/routers/note.ts) | `note.created`, `note.updated` |
| [`src/server/trpc/routers/task.ts`](../src/server/trpc/routers/task.ts) | `task.created`, `task.updated`, `task.completed` |
| [`src/server/trpc/routers/mentor.ts`](../src/server/trpc/routers/mentor.ts) | `mentor.role_assigned` |
| [`src/server/trpc/routers/admin.ts`](../src/server/trpc/routers/admin.ts) | Session status webhooks on admin updates |
| [`src/server/trpc/routers/org_admin.ts`](../src/server/trpc/routers/org_admin.ts) | Session status webhooks on org-admin updates |
| [`src/lib/services/mentorship.ts`](../src/lib/services/mentorship.ts) | Cascade session cancels (sibling sessions) |
| [`src/lib/services/zoom-metrics.ts`](../src/lib/services/zoom-metrics.ts) | `session.attended` after Zoom metrics fetch |
| [`src/lib/services/process-session-end-outcomes.ts`](../src/lib/services/process-session-end-outcomes.ts) | `session.completed` / `session.no_show` from cron |

## Environment

| Variable | Purpose |
| --- | --- |
| `WEBHOOK_ENABLED` | Set to `true` to enable outbound webhooks and Profiler observations. **Defaults to false** when unset — no events are sent and admin UI is hidden. |
| `WEBHOOK_INTERNAL_HOST_ALLOWLIST` | Comma-separated hosts allowed past SSRF guard (Profiler internal host) |
| `WEBHOOK_ALLOW_INSECURE_LOCAL` | Allow `http://` URLs for local testing |
| `CRON_SECRET` | Auth for `/api/cron/dispatch-webhooks` |

## Onboarding checklist

**Profiler (per org):** create webhook data source → generate URL → copy to Mentorship admin.

**Mentorship (built once):**

1. Paste ingest URL in program overview (Profiler card).
2. Perform a test action (book a session).
3. Confirm event in Profiler **Collected data**.
4. Share actual payload shapes per `source_event_type` with Profiler for binding setup.

## Testing

1. Configure a test ingest URL for one org.
2. Book a session → expect **one** `session.booked` with slim `session`, `mentor`, `mentee`, `organization`, and `cadence` in `payload`.
3. Retry with same `idempotency_key` → Profiler returns `duplicate: true`, delivery marked success.
4. Second org with a different URL → events must not cross orgs.
5. Org with no URL → emit is a no-op (no delivery rows).