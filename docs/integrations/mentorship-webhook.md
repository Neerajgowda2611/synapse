# Mentorship → Profiler Webhook Integration

Single reference for the **Mentorship** team: how to push observations to Profiler (shared envelope contract + Mentorship event catalog and example payloads).

This doc maps each observation from the Mentorship catalog to **example** observation envelope payloads. Mentorship keeps its own field names inside `payload`; Profiler stores them verbatim and maps to signals later via bindings.

> **Important — examples are not the contract**  
> Every JSON example below is **illustrative only**. Field names, nesting, and which related objects you include will depend on Mentorship’s real database schema and joins. The **actual** payload shapes will be defined and agreed with the Mentorship team during onboarding (via `payload_schema` versions). Do not treat these samples as copy-paste production schemas.

---

## Part 1 — Observation envelope (Profiler contract)

Every event Mentorship sends uses the same HTTP endpoint and envelope shape. Event semantics live entirely in the **request body**; the token in the URL is only used for routing and authentication.

### Endpoint

```
POST /api/v1/webhooks/ingest/{ingest_token}
Content-Type: application/json
```

`{ingest_token}` is generated **per org** — one unique ingest URL per org. In Profiler admin the org is called an *institution* (same thing). Each org admin creates a webhook data source and generates the URL (Data source → Credentials → Generate ingest URL).

### Request body — the observation envelope

All fields below are required unless marked optional.


| Field                | Type   | Notes                                                                                                                               |
| -------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `source_id`          | string | Your event's own id.                                                                                                                |
| `idempotency_key`    | string | Unique per logical event (e.g. `mentorship:session.booked:book-8821`). Retries with the same key are ignored.                       |
| `source_connector`   | string | For Mentorship, always `"mentorship"`.                                                                                              |
| `source_event_type`  | string | Mentorship event name (e.g. `session.attended`, `message.exchanged`).                                                               |
| `ingestion_altitude` | string | Always `"observation"` for now. (`"signal"` reserved for future use.)                                                               |
| `occurred_at`        | string | When it happened — ISO 8601 UTC.                                                                                                    |
| `payload`            | object | Your native event fields, any names, any shape. Stored verbatim.                                                                    |
| `payload_schema`     | string | *(optional)* Version pointer (e.g. `mentorship.session.booked@1`).                                                                  |
| `description`        | string | *(optional)* One-line summary of the event.                                                                                         |
| `attestation`        | object | *(optional)* Reserved for attested signals — omit for now; put mentor attestations in `payload` until signal altitude is supported. |


**Rules:**

- Wrap your data in the envelope; put native fields in `payload`.
- Do not rename fields to match Profiler.
- `payload` must be a JSON **object** (not an array or scalar).
- All timestamps ISO 8601 UTC.
- Reuse the same `idempotency_key` on retries — Profiler deduplicates automatically.

### Minimal curl example (Mentorship)

```bash
curl -X POST 'https://api.profiler.example/api/v1/webhooks/ingest/wh_abc123' \
  -H 'Content-Type: application/json' \
  -d '{
    "source_id": "req-4401",
    "idempotency_key": "mentorship:session.requested:req-4401",
    "source_connector": "mentorship",
    "source_event_type": "session.requested",
    "ingestion_altitude": "observation",
    "occurred_at": "2026-06-22T09:15:00Z",
    "payload": { "session_id": "sess-901", "mentee_user_id": "u_42" }
  }'
```

### Response

**202 Accepted — new event:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source_id": "req-4401",
  "source_event_type": "session.requested",
  "received_at": "2026-06-22T09:15:04Z",
  "duplicate": false
}
```

**202 Accepted — duplicate (`idempotency_key` already seen):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source_id": "req-4401",
  "source_event_type": "session.requested",
  "received_at": "2026-06-22T09:15:04Z",
  "duplicate": true
}
```

Both cases return `202` — retries are safe.

### Error codes


| Status | When                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------- |
| 400    | Missing required field, `payload` is not an object, `ingestion_altitude` is not `"observation"` |
| 403    | Data source exists but raw-storage consent has not been given                                   |
| 404    | Token not found or data source is not active                                                    |
| 500    | Unexpected server error                                                                         |


### How Profiler stores webhook data

Webhook events are stored in the `**observations**` table (not `raw_records`).


| Table          | Used by            | What it holds                                                             |
| -------------- | ------------------ | ------------------------------------------------------------------------- |
| `observations` | Webhook ingest     | Parsed envelope + inner `payload` verbatim; `status` starts as `received` |
| `raw_records`  | Postgres sync only | Rows pulled from external PostgreSQL sources                              |


`**observations` columns (Stage 1 dump):**


| Column                                                                                                       | Set by   | Notes                                                                        |
| ------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------- |
| `id`                                                                                                         | Profiler | Primary key (contract name: `profiler_id`)                                   |
| `received_at`                                                                                                | Profiler | When ingested                                                                |
| `source_id`, `source_connector`, `source_event_type`, `idempotency_key`, `ingestion_altitude`, `occurred_at` | App      | From envelope                                                                |
| `payload`                                                                                                    | App      | Inner payload, verbatim                                                      |
| `payload_schema`, `description`, `attestation`                                                               | App      | Optional                                                                     |
| `status`                                                                                                     | Profiler | `received` on ingest; `canonicalized` or `quarantined` after binding (later) |
| `observation_type`, `domain`, `binding_id`, `binding_version`, `quarantine_reason`                           | Profiler | Null until binding pipeline runs                                             |
| `data_source_id`                                                                                             | Profiler | Internal — which webhook data source received the event                      |


Duplicate events (same `idempotency_key` per data source) are never written twice. Admin UI **Collected data** for webhook sources reads from `observations`.

### Schema discovery

After sending at least one event, run **Discover schema** in the Profiler admin UI. Profiler samples payloads grouped by `source_event_type` and infers field names/types from the inner `payload`.

### Not yet supported

- `ingestion_altitude: "signal"` — separate signal pipeline with attestation.
- Bindings — field mappings from `source_event_type` → canonical observation type.
- Canonical observations — derived typed table (Stage 2).
- HMAC request signatures.
- Batch ingest (`/ingest/:token/batch`).

### Onboarding checklist (Profiler + Mentorship)

1. Org admin creates a webhook data source in Profiler admin (one per org).
2. Accept raw-storage consent and generate the ingest URL.
3. Share Mentorship `source_event_type` list and **actual** payload shapes per event.
4. Send test events; confirm in **Collected data**.
5. Profiler writes bindings on our side — Mentorship does not map to canonical types.

---

## Part 2 — Mentorship-specific integration

### Mentorship constants


| Constant                  | Value                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `source_connector`        | `"mentorship"`                                                                                                     |
| `ingestion_altitude`      | `"observation"` (always, for now)                                                                                  |
| User ids in `payload`     | `mentee_user_id`, `mentor_user_id`, `user_id` — Mentorship’s own identifiers (Profiler resolves to a person later) |
| `idempotency_key` pattern | `mentorship:{source_event_type}:{source_id}`                                                                       |
| `payload_schema` pattern  | `mentorship.{source_event_type}@1` — **example version tag only**; real version agreed at onboarding               |


**When to push:** Emit an observation **as soon as the event happens** in Mentorship (or on a reliable outbox retry). One envelope per logical event — do not batch multiple events in one POST.

### Per-org routing

Each org gets its **own ingest URL**. The token in the URL tells Profiler which org the event belongs to.


| Step | Who                      | What                                                   |
| ---- | ------------------------ | ------------------------------------------------------ |
| 1    | Atria admin (Profiler)   | Create webhook data source → generate URL → copy it    |
| 2    | Atria admin (Mentorship) | Paste URL in Mentorship org settings for Atria         |
| 3    | Mentorship (runtime)     | Event for Atria org → POST to Atria’s URL              |
| 4    | Profiler                 | Token maps to Atria’s data source → observation stored |


RV College repeats steps 1–2 with **their own URL**. Mentorship picks the URL from the event’s `org_id`.

```
Event org_id  →  lookup profiler_ingest_url  →  POST envelope
```

### Scaling to many orgs (40, 50, …)

**You do not change Mentorship code for each new org.** Write the publisher once; store URLs in config.


| Do                                                               | Don’t                       |
| ---------------------------------------------------------------- | --------------------------- |
| Table `org_profiler_config(org_id, ingest_url)` in Mentorship DB | Hardcode 50 URLs in code    |
| Org admin pastes their Profiler URL in Mentorship org settings   | Require a deploy per org    |
| One background worker: `url = lookup(org_id); POST`              | Copy-paste curl per college |


**New org onboarding:** admin gets URL from Profiler → pastes in Mentorship → done. No developer involved.

---

## Event catalog

Profiler signals (right column) are **derived later** — Mentorship only sends observations.


| `source_event_type`        | Observation / data captured                                  | Signals Profiler can derive                       | Emitted today?              |
| -------------------------- | ------------------------------------------------------------ | ------------------------------------------------- | --------------------------- |
| `session.requested`        | `session_requested_at` — timestamp when mentee requests help | `help_seeking_latency`                            | verify with Mentorship team |
| `session.booked`           | Booking confirmed — timestamp                                | `proactive_help_seeking`                          | verify                      |
| `session.attended`         | Attendance + check-in (boolean, check-in time)               | `reliability`, `seriousness`                      | verify                      |
| `session.no_show`          | Mentee or mentor no-show                                     | `reliability` (−)                                 | verify                      |
| `session.cancelled`        | Session cancelled (who, reason if known)                     | `reliability` (−)                                 | verify                      |
| `session.rescheduled`      | Session moved to a new slot                                  | `reliability` (−)                                 | verify                      |
| `session.completed`        | Session ended — includes `duration_seconds` (or equivalent)  | `engagement`                                      | verify                      |
| `mentor.role_assigned`     | User marked as mentor (boolean / role change)                | `mentoring_others` (leadership, agreeableness)    | verify                      |
| `session.notes_posted`     | Mentor free-text session notes                               | `communication_quality`, themes (LLM-derived)     | verify                      |
| `mentor.attestation_given` | Mentor attests a trait + level for mentee                    | `mentor_attested_punctuality` (high verification) | verify                      |
| `session.rated`            | Post-session rating (scalar)                                 | `satisfaction`                                    | verify                      |
| `session.cadence.reported` | Rolling frequency of sessions over a window                  | `sustained_engagement`                            | verify                      |
| `follow_up.logged`         | Follow-up action recorded after session                      | `follow_through_post_session`                     | verify                      |
| `message.exchanged`        | Message sent in mentorship thread (timestamp + text)         | `responsiveness`, `communication_quality`         | verify                      |


---

## Payload conventions

- **Timestamps:** ISO 8601 UTC (`2026-06-22T09:00:00Z`).
- **Duration:** Prefer integer seconds (`duration_seconds`) or ISO 8601 duration — pick one and document at onboarding; examples use `duration_seconds`.
- **Ids:** Always include Mentorship’s native id fields (`session_id`, `mentor_user_id`, `mentee_user_id`, etc.) — do not remap to Profiler ids.
- **Embed related records — required:** Sending only a foreign key (e.g. `session_id`) is **not enough**. At emit time, **join the relevant Mentorship tables** and include a snapshot of related entities in `payload` so Profiler has context without calling back into Mentorship.
- **Optional fields:** Omit keys rather than sending `null`, unless the value is genuinely unknown vs absent.
- **Text fields:** Send as plain strings; Profiler stores verbatim (LLM processing happens on Profiler’s side later).

### Embedding pattern (illustrative)


| Id field in payload | Also include (example key) | Example fields to join in                                    |
| ------------------- | -------------------------- | ------------------------------------------------------------ |
| `session_id`        | `session`                  | `status`, `scheduled_at`, `topic`, `format`, `program_id`, … |
| `program_id`        | `program`                  | `name`, `cohort`, `term`, `institution_id`, …                |
| `mentor_user_id`    | `mentor`                   | `display_name`, `email`, `is_mentor`, `specializations`, …   |
| `mentee_user_id`    | `mentee`                   | `display_name`, `email`, `cohort`, `year`, …                 |
| `message_id`        | `message`                  | `body`, `sent_at`, `sender_user_id`, `thread_id`, …          |


Example nested objects (**not** prescriptive — adapt to Mentorship’s schema):

```json
"session_id": "sess-901",
"session": {
  "id": "sess-901",
  "status": "scheduled",
  "scheduled_at": "2026-06-25T14:00:00Z",
  "topic": "Career planning",
  "format": "video",
  "program_id": "prog-capstone-2026"
}
```

```json
"mentor_user_id": "u_mentor_7",
"mentor": {
  "id": "u_mentor_7",
  "display_name": "Dr. Alex Kim",
  "email": "alex.kim@college.edu",
  "is_mentor": true
}
```

Profiler stores whatever you send; bindings are written against the **actual** Mentorship payload shape you register at onboarding.

---

## Examples (illustrative — one per event type)

The envelopes below demonstrate **envelope structure + embedding style**. Production payloads will differ.

### `session.requested`

Emitted when a mentee requests a mentorship session (`session_requested_at`).

```json
{
  "source_id": "req-4401",
  "idempotency_key": "mentorship:session.requested:req-4401",
  "source_connector": "mentorship",
  "source_event_type": "session.requested",
  "ingestion_altitude": "observation",
  "occurred_at": "2026-06-22T09:15:00Z",
  "payload_schema": "mentorship.session.requested@1",
  "description": "Mentee requested a session",
  "payload": {
    "request_id": "req-4401",
    "session_id": "sess-901",
    "session": {
      "id": "sess-901",
      "status": "requested",
      "topic": "Resume review",
      "program_id": "prog-capstone-2026"
    },
    "program_id": "prog-capstone-2026",
    "program": {
      "id": "prog-capstone-2026",
      "name": "Capstone Mentorship 2026",
      "cohort": "2026-S1",
      "term": "2026-S1"
    },
    "mentee_user_id": "u_42",
    "mentee": {
      "id": "u_42",
      "display_name": "Jane Doe",
      "email": "jane.doe@college.edu"
    },
    "session_requested_at": "2026-06-22T09:15:00Z"
  }
}
```

---

### `session.booked`

Emitted when a session slot is confirmed.

```json
{
  "source_id": "book-8821",
  "idempotency_key": "mentorship:session.booked:book-8821",
  "source_connector": "mentorship",
  "source_event_type": "session.booked",
  "ingestion_altitude": "observation",
  "occurred_at": "2026-06-22T10:30:00Z",
  "payload_schema": "mentorship.session.booked@1",
  "payload": {
    "booking_id": "book-8821",
    "session_id": "sess-901",
    "session": {
      "id": "sess-901",
      "status": "scheduled",
      "scheduled_at": "2026-06-25T14:00:00Z",
      "topic": "Resume review",
      "format": "video",
      "program_id": "prog-capstone-2026"
    },
    "mentor_user_id": "u_mentor_7",
    "mentor": {
      "id": "u_mentor_7",
      "display_name": "Dr. Alex Kim",
      "email": "alex.kim@college.edu",
      "is_mentor": true
    },
    "mentee_user_id": "u_42",
    "mentee": {
      "id": "u_42",
      "display_name": "Jane Doe",
      "email": "jane.doe@college.edu"
    },
    "booked_at": "2026-06-22T10:30:00Z"
  }
}
```

---

### `session.attended`

Emitted when check-in is recorded (attended or not).

```json
{
  "source_id": "checkin-3310",
  "idempotency_key": "mentorship:session.attended:checkin-3310",
  "source_connector": "mentorship",
  "source_event_type": "session.attended",
  "ingestion_altitude": "observation",
  "occurred_at": "2026-06-25T14:05:00Z",
  "payload_schema": "mentorship.session.attended@1",
  "payload": {
    "checkin_id": "checkin-3310",
    "session_id": "sess-901",
    "session": {
      "id": "sess-901",
      "status": "in_progress",
      "scheduled_at": "2026-06-25T14:00:00Z",
      "topic": "Resume review"
    },
    "mentor_user_id": "u_mentor_7",
    "mentor": {
      "id": "u_mentor_7",
      "display_name": "Dr. Alex Kim",
      "is_mentor": true
    },
    "mentee_user_id": "u_42",
    "mentee": {
      "id": "u_42",
      "display_name": "Jane Doe"
    },
    "attended": true,
    "mentee_checked_in_at": "2026-06-25T14:04:00Z",
    "mentor_checked_in_at": "2026-06-25T14:03:00Z"
  }
}
```

---

## Getting started — what each team builds

### Profiler side

Ingest is **mostly done** already. Per-org URL works today.


| Done                                  | Later (not blocking) |
| ------------------------------------- | -------------------- |
| Ingest API, observations table, dedup | Bindings / signals   |
| Org admin can generate ingest URL     | Auto-provision API   |
| View collected data in admin UI       |                      |


**Per new org:** org admin creates webhook data source → generates URL → copies it. No Profiler code change.

---

### Mentorship side

Build this **once** in Mentorship. Org #50 only needs an admin to paste a URL — **no new deploy**.

#### The idea in one sentence

When something happens in Mentorship → save it to a send-queue → a background job wraps it as JSON → looks up that org’s Profiler URL → POSTs it.

```
session booked  →  queue  →  wrap as envelope  →  lookup org URL  →  POST to Profiler
```

---

#### Step 1 — Let each org save their Profiler URL

- Add a field on **org settings**: “Profiler ingest URL”
- Save it in a small table: `org_id` + `ingest_url`
- Org admin copies URL from Profiler and pastes it here

*Like saving a contact number per college — look up “Atria”, get the right URL.*

---

#### Step 2 — Wrap events in Profiler’s JSON format

One shared function for **all** event types. It builds the envelope:

- Outer fields: `source_id`, `source_event_type`, `occurred_at`, …
- Inner `payload`: your Mentorship data
- `source_connector`: always `"mentorship"`
- `idempotency_key`: `mentorship:session.booked:book-8821` (so retries don’t duplicate)

*Like putting a letter in the right envelope with the right address.*

---

#### Step 3 — Queue events and send in the background

Don’t call Profiler while the user is waiting on a click.


| Part               | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| **Queue (outbox)** | Table of “events to send later”                           |
| **Worker**         | Reads queue → finds org’s URL → POSTs → retries if failed |


If an org has no URL yet, skip or hold in queue.

*Outbox = mail tray. Worker = mail carrier.*

---

#### Step 4 — Hook into actions that already exist in Mentorship

Where Mentorship already handles something, add **one line**: “also add to send-queue”.


| Mentorship action            | Queue as               |
| ---------------------------- | ---------------------- |
| Mentee requests a session    | `session.requested`    |
| Session booked               | `session.booked`       |
| Check-in recorded            | `session.attended`     |
| Session ends (with duration) | `session.completed`    |
| Mentor posts session notes   | `session.notes_posted` |
| Message sent in thread       | `message.exchanged`    |


Do this for every row in the [event catalog](#event-catalog).

*You’re not building 50 systems — just one extra line wherever something already happens.*

---

#### Step 5 — Send useful data, not just IDs

Bad — only IDs:

```json
{ "session_id": "sess-901", "mentee_user_id": "u_42" }
```

Good — IDs **plus** context (join session, mentor, mentee, program when building the envelope):

```json
{
  "session_id": "sess-901",
  "mentee_user_id": "u_42",
  "session": { "topic": "Resume review", "scheduled_at": "2026-06-25T14:00:00Z" },
  "mentor": { "display_name": "Dr. Alex Kim", "is_mentor": true },
  "mentee": { "display_name": "Jane Doe" }
}
```

Also write down what you **actually** send per event type and share with Profiler (they’ll map it to signals later — not Mentorship’s job).

*Don’t send “session #901” alone — include mentor, mentee, and topic on the same slip.*

---

#### How to test

1. **Atria:** paste Atria’s Profiler URL in Mentorship → book or attend a session in Atria → check Profiler **Collected data** (Atria only).
2. **RV College:** different URL → events must **not** mix with Atria’s.

---

#### Quick checklist

**Profiler (per org):** create webhook → generate URL → copy to Mentorship admin.

**Mentorship (build once):**

1. Org settings + URL table
2. Envelope wrapper function
3. Send-queue + background worker
4. Hooks on existing Mentorship actions
5. Rich payloads + document field list for Profiler

---

## Signals (for reference only — do not send)

Mentorship does **not** send signals like `help_seeking_latency`, `reliability`, or `mentor_attested_punctuality`. Profiler derives those later from observations via bindings. Mentorship only sends **observations** with `ingestion_altitude: "observation"`.

---

## Open items for Mentorship team (confirm at onboarding)


| Topic                      | Question                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `source_connector` slug    | Is `"mentorship"` correct, or does the app use another internal name?                             |
| Program / cohort model     | Do you have `program_id`, `cohort`, or pairing ids we should always embed?                        |
| `session.cadence.reported` | Is cadence emitted on a schedule (cron), or only on-demand? Per mentee, per pair, or per program? |
| `mentor.attestation_given` | Fixed trait enum (`punctuality`, …) or free-form? What are valid `level` values?                  |
| Ratings                    | One rating per session per rater, or multiple dimensions (e.g. communication, helpfulness)?       |
| `message.exchanged`        | One event per message, or batched thread export? (Profiler recommends one per message.)           |
| No-show vs cancelled       | Separate actors (mentee vs mentor no-show) — confirm `no_show_role` / `cancelled_by_role` values. |
| Privacy                    | Should message `body` be redacted or truncated before send for certain orgs?                      |


