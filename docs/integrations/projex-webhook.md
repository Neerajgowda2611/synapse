# Projex → Profiler Webhook Integration

Single reference for the **Projex** team: how to push observations to Profiler (shared envelope contract + Projex event catalog and example payloads).

This doc maps each observation from the Projex catalog (§6.2) to **example** observation envelope payloads. Projex keeps its own field names inside `payload`; Profiler stores them verbatim and maps to signals later via bindings.

> **Important — examples are not the contract**  
> Every JSON example below is **illustrative only**. Field names, nesting, and which related objects you include will depend on Projex’s real database schema and joins. The **actual** payload shapes will be defined and agreed with the Projex team during onboarding. Do not treat these samples as copy-paste production schemas.

---

## Part 1 — Observation envelope (Profiler contract)

Every event Projex sends uses the same HTTP endpoint and envelope shape. Event semantics live entirely in the **request body**; the token in the URL is only used for routing and authentication.

### Endpoint

```
POST /api/v1/webhooks/ingest/{ingest_token}
Content-Type: application/json
```

`{ingest_token}` is generated **per org** — one unique ingest URL per org. In Profiler admin the org is called an *institution* (same thing). Each org admin creates a webhook data source and generates the URL (Data source → Credentials → Generate ingest URL).

### Request body — the observation envelope

All fields below are required unless marked optional.


| Field                | Type   | Notes                                                                                                   |
| -------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `source_id`          | string | Your event's own id.                                                                                    |
| `idempotency_key`    | string | Unique per logical event (e.g. `projex:task.created:task-5001`). Retries with the same key are ignored. |
| `source_connector`   | string | For Projex, always `"projex"`.                                                                          |
| `source_event_type`  | string | Projex event name (e.g. `task.closed`, `milestone.submitted`).                                          |
| `ingestion_altitude` | string | Always `"observation"` for now. (`"signal"` reserved for future use.)                                   |
| `occurred_at`        | string | When it happened — ISO 8601 UTC.                                                                        |
| `payload`            | object | Your native event fields, any names, any shape. Stored verbatim.                                        |
| `payload_schema`     | object | *(optional)* **Skeleton** of `payload` — same keys/nesting, values are type placeholders (e.g. `"string"`, `"number"`). |
| `description`        | string | *(optional)* One-line summary of the event.                                                             |
| `attestation`        | object | *(optional)* Reserved for attested signals — omit for now.                                              |


**Rules:**

- Wrap your data in the envelope; put native fields in `payload`.
- Do not rename fields to match Profiler.
- `payload` must be a JSON **object** (not an array or scalar).
- If sent, `payload_schema` must also be a JSON **object** — a structural mirror of `payload`, not a version string.
- All timestamps ISO 8601 UTC.
- Reuse the same `idempotency_key` on retries — Profiler deduplicates automatically.

### Minimal curl example (Projex)

```bash
curl -X POST 'https://api.profiler.example/api/v1/webhooks/ingest/wh_abc123' \
  -H 'Content-Type: application/json' \
  -d '{
    "source_id": "task-5001",
    "idempotency_key": "projex:task.created:task-5001",
    "source_connector": "projex",
    "source_event_type": "task.created",
    "ingestion_altitude": "observation",
    "occurred_at": "2026-06-22T11:00:00Z",
    "payload": { "task_id": "task-5001", "project_id": "proj-42" }
  }'
```

### Response

**202 Accepted — new event:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source_id": "task-5001",
  "source_event_type": "task.created",
  "received_at": "2026-06-22T11:00:04Z",
  "duplicate": false
}
```

**202 Accepted — duplicate (`idempotency_key` already seen):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source_id": "task-5001",
  "source_event_type": "task.created",
  "received_at": "2026-06-22T11:00:04Z",
  "duplicate": true
}
```

Both cases return `202` — retries are safe.

### Error codes


| Status | When                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------- |
| 400    | Missing required field, `payload` or `payload_schema` is not an object, `ingestion_altitude` is not `"observation"` |
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

### Onboarding checklist (Profiler + Projex)

1. Org admin creates a webhook data source in Profiler admin (one per org).
2. Accept raw-storage consent and generate the ingest URL.
3. Share Projex `source_event_type` list and **actual** payload shapes per event.
4. Send test events; confirm in **Collected data**.
5. Profiler writes bindings on our side — Projex does not map to canonical types.

---

## Part 2 — Projex-specific integration

### Projex constants


| Constant                  | Value                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `source_connector`        | `"projex"`                                                                                       |
| `ingestion_altitude`      | `"observation"` (always, for now)                                                                |
| User id in `payload`      | `user_id` — Projex’s own user identifier (Profiler resolves to a person later)                   |
| `idempotency_key` pattern | `projex:{source_event_type}:{source_id}`                                                         |


**When to push:** Emit an observation **as soon as the event happens** in Projex (or on a reliable outbox retry). One envelope per logical event — do not batch multiple events in one POST.

### Per-org routing

Each org gets its **own ingest URL**. The token in the URL tells Profiler which org the event belongs to.


| Step | Who                    | What                                                   |
| ---- | ---------------------- | ------------------------------------------------------ |
| 1    | Atria admin (Profiler) | Create webhook data source → generate URL → copy it    |
| 2    | Atria admin (Projex)   | Paste URL in Projex org settings for Atria             |
| 3    | Projex (runtime)       | Event for Atria org → POST to Atria’s URL              |
| 4    | Profiler               | Token maps to Atria’s data source → observation stored |


RV College repeats steps 1–2 with **their own URL**. Projex picks the URL from the event’s `org_id`.

```
Event org_id  →  lookup profiler_ingest_url  →  POST envelope
```

### Scaling to many orgs (40, 50, …)

**You do not change Projex code for each new org.** Write the publisher once; store URLs in config.


| Do                                                                     | Don’t                           |
| ---------------------------------------------------------------------- | ------------------------------- |
| Table `org_profiler_config(org_id, ingest_url)` in Projex DB           | Hardcode 50 URLs in code        |
| Org admin pastes their Profiler URL in Projex org settings             | Require a Projex deploy per org |
| One generic outbox worker: `url = lookup(org_id); POST(url, envelope)` | Copy-paste curl per college     |


**New org onboarding:** org admin gets URL from Profiler → pastes in Projex → done. No developer involved.

**Optional later:** Profiler provisioning API so Projex auto-registers an org and receives a token when the org is created in Projex (removes manual copy-paste).

---

## Event catalog


| `source_event_type`    | When to emit                                              | Emitted today?          |
| ---------------------- | --------------------------------------------------------- | ----------------------- |
| `milestone.defined`    | A milestone is created with a due date                    | verify with Projex team |
| `milestone.submitted`  | Work is submitted against a milestone                     | verify                  |
| `task.created`         | A task is created                                         | verify                  |
| `task.assigned`        | A task is assigned to someone                             | verify                  |
| `task.self_claimed`    | A user claims an unassigned task                          | verify                  |
| `task.started`         | User starts working on a task                             | verify                  |
| `task.status_changed`  | Task moves between statuses                               | verify                  |
| `task.closed`          | Task is marked done                                       | verify                  |
| `task.time_logged`     | Actual time recorded (vs estimate if known)               | verify                  |
| `task.reopened`        | A closed task is reopened                                 | verify                  |
| `comment.posted`       | Comment on a task or milestone                            | verify                  |
| `feedback.posted`      | Faculty posts feedback                                    | verify                  |
| `revision.submitted`   | User submits a revision after feedback                    | verify                  |
| `review.requested`     | Someone requests a review                                 | verify                  |
| `review.given`         | Review is completed                                       | verify                  |
| `blocker.raised`       | A blocker is logged on a task                             | verify                  |
| `role.assigned`        | Team role assigned (lead / member)                        | verify                  |
| `meeting.scheduled`    | A meeting is scheduled                                    | verify                  |
| `meeting.attended`     | Attendance recorded for a meeting                         | verify                  |
| `contribution.counted` | Periodic or milestone snapshot of per-member contribution | verify                  |
| `evaluation.received`  | Faculty rubric evaluation received                        | verify                  |
| `peer_rating.given`    | Peer rates another member                                 | verify                  |


---

## Payload conventions

- **Timestamps:** ISO 8601 UTC (`2026-06-22T09:00:00Z`).
- **Ids:** Always include Projex’s native id fields (`project_id`, `task_id`, `user_id`, etc.) — do not remap to Profiler ids.
- **Embed related records — required:** Sending only a foreign key (e.g. `project_id`) is **not enough**. At emit time, **join the relevant Projex tables** and include a snapshot of related entities in `payload` so Profiler has context without calling back into Projex. Use your real column names; the shapes below are examples only.
- **Optional fields:** Omit keys rather than sending `null`, unless the value is genuinely unknown vs absent.
- **Text fields:** Send as plain strings; Profiler stores verbatim.

### Embedding pattern (illustrative)

When an event references an entity, include **both** the id **and** a nested object with the fields you have at emit time:


| Id field in payload     | Also include (example key)       | Example fields to join in                                                               |
| ----------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| `project_id`            | `project`                        | `name`, `code`, `course_id`, `course_name`, `term`, `status`, `starts_at`, `ends_at`, … |
| `task_id`               | `task`                           | `title`, `status`, `due_at`, `milestone_id`, …                                          |
| `milestone_id`          | `milestone`                      | `title`, `due_at`, `release_at`, …                                                      |
| `user_id` / `*_user_id` | `user` / `assignee` / `reviewer` | `display_name`, `email`, `role_in_project`, …                                           |


Example nested objects ( **not** prescriptive — adapt to Projex’s schema):

```json
"project_id": "proj-42",
"project": {
  "id": "proj-42",
  "name": "Capstone Alpha",
  "code": "CS499-A",
  "course_id": "course-101",
  "course_name": "Capstone Project",
  "term": "2026-S1",
  "status": "active",
  "starts_at": "2026-01-15T00:00:00Z",
  "ends_at": "2026-05-30T23:59:59Z"
}
```

```json
"user_id": "u_99",
"user": {
  "id": "u_99",
  "display_name": "Jane Doe",
  "email": "jane.doe@college.edu",
  "role_in_project": "member"
}
```

Profiler stores whatever you send; bindings are written against the **actual** Projex payload shape you register at onboarding.

### `payload_schema` — skeleton of `payload`

`payload_schema` is **not** a version label. It is a JSON **object** with the same shape as `payload`, where leaf values are **type placeholders** (`"string"`, `"number"`, `"boolean"`, `"object"`, …). Nested objects use the same keys as `payload` but only describe structure.

```json
{
  "source_id": "sub-abc",
  "source_event_type": "milestone.submitted",
  "payload_schema": {
    "submission_id": "string",
    "milestone_id": "string",
    "milestone": { "id": "string", "title": "string" },
    "project": { "id": "string", "name": "string" },
    "user_id": "string",
    "submitted_at": "string"
  },
  "payload": {
    "submission_id": "sub-abc",
    "milestone_id": "ms-1001",
    "milestone": { "id": "ms-1001", "title": "Phase 1 delivery" },
    "project": { "id": "proj-42", "name": "Capstone Alpha" },
    "user_id": "u_99",
    "submitted_at": "2026-06-28T18:30:00Z"
  }
}
```

Send `payload_schema` on every event (recommended) so Profiler knows the contract without inferring from samples alone.

---

## Examples (illustrative — one per event type)

The envelopes below demonstrate **envelope structure + embedding style**. Production payloads will differ.

### `milestone.defined`

Emitted when a milestone is created with a due date.

```json
{
  "source_id": "ms-1001",
  "idempotency_key": "projex:milestone.defined:ms-1001",
  "source_connector": "projex",
  "source_event_type": "milestone.defined",
  "ingestion_altitude": "observation",
  "occurred_at": "2026-06-22T10:00:00Z",
  "payload_schema": {
    "milestone_id": "string",
    "project_id": "string",
    "project": { "id": "string", "name": "string", "term": "string" },
    "title": "string",
    "due_at": "string"
  },
  "description": "Milestone defined on project Alpha",
  "payload": {
    "milestone_id": "ms-1001",
    "project_id": "proj-42",
    "project": {
      "id": "proj-42",
      "name": "Capstone Alpha",
      "code": "CS499-A",
      "course_id": "course-101",
      "course_name": "Capstone Project",
      "term": "2026-S1",
      "status": "active",
      "starts_at": "2026-01-15T00:00:00Z",
      "ends_at": "2026-05-30T23:59:59Z"
    },
    "title": "Phase 1 delivery",
    "due_at": "2026-07-01T23:59:59Z",
    "defined_by_user_id": "u_faculty_12",
    "release_at": "2026-06-22T10:00:00Z"
  }
}
```

---

### `milestone.submitted`

Emitted when work is submitted against a milestone.

```json
{
  "source_id": "sub-abc",
  "idempotency_key": "projex:milestone.submitted:sub-abc",
  "source_connector": "projex",
  "source_event_type": "milestone.submitted",
  "ingestion_altitude": "observation",
  "occurred_at": "2026-06-28T18:30:00Z",
  "payload_schema": {
    "submission_id": "string",
    "milestone_id": "string",
    "milestone": { "id": "string", "title": "string" },
    "project_id": "string",
    "project": { "id": "string", "name": "string", "term": "string" },
    "user_id": "string",
    "submitted_at": "string",
    "due_at": "string"
  },
  "payload": {
    "submission_id": "sub-abc",
    "milestone_id": "ms-1001",
    "milestone": { "id": "ms-1001", "title": "Phase 1 delivery" },
    "project_id": "proj-42",
    "project": {
      "id": "proj-42",
      "name": "Capstone Alpha",
      "code": "CS499-A",
      "course_id": "course-101",
      "course_name": "Capstone Project",
      "term": "2026-S1",
      "status": "active",
      "starts_at": "2026-01-15T00:00:00Z",
      "ends_at": "2026-05-30T23:59:59Z"
    },
    "user_id": "u_99",
    "submitted_at": "2026-06-28T18:30:00Z",
    "due_at": "2026-07-01T23:59:59Z"
  }
}
```

---

### `task.created`

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
  "payload": {
    "task_id": "task-5001",
    "project_id": "proj-42",
    "project": {
      "id": "proj-42",
      "name": "Capstone Alpha",
      "code": "CS499-A",
      "course_id": "course-101",
      "course_name": "Capstone Project",
      "term": "2026-S1",
      "status": "active",
      "starts_at": "2026-01-15T00:00:00Z",
      "ends_at": "2026-05-30T23:59:59Z"
    },
    "milestone_id": "ms-1001",
    "created_by_user_id": "u_faculty_12",
    "title": "Implement auth module",
    "created_at": "2026-06-22T11:00:00Z"
  }
}
```

---

### `task.assigned`

```json
{
  "source_id": "assign-771",
  "idempotency_key": "projex:task.assigned:assign-771",
  "source_connector": "projex",
  "source_event_type": "task.assigned",
  "ingestion_altitude": "observation",
  "occurred_at": "2026-06-22T11:05:00Z",
  "payload_schema": {
    "assignment_id": "string",
    "task_id": "string",
    "project_id": "string",
    "assignee_user_id": "string"
  },
  "payload": {
    "assignment_id": "assign-771",
    "task_id": "task-5001",
    "project_id": "proj-42",
    "project": {
      "id": "proj-42",
      "name": "Capstone Alpha",
      "code": "CS499-A",
      "course_id": "course-101",
      "course_name": "Capstone Project",
      "term": "2026-S1",
      "status": "active",
      "starts_at": "2026-01-15T00:00:00Z",
      "ends_at": "2026-05-30T23:59:59Z"
    },
    "assignee_user_id": "u_99",
    "assigned_by_user_id": "u_faculty_12",
    "assigned_at": "2026-06-22T11:05:00Z"
  }
}
```

---

## Getting started — what each team builds

### Profiler side (~1–3 dev-days)

Ingest is **mostly done** already. Per-org URL works today.


| Done                                  | Later (not blocking) |
| ------------------------------------- | -------------------- |
| Ingest API, observations table, dedup | Bindings / signals   |
| Org admin can generate ingest URL     | Auto-provision API   |
| View collected data in admin UI       |                      |


**Per new org:** org admin creates webhook data source → generates URL → copies it. No Profiler code change.

---

### Projex side 

Build this **once** in Projex. Org #50 only needs an admin to paste a URL — **no new deploy**.

#### The idea in one sentence

When something happens in Projex → save it to a send-queue → a background job wraps it as JSON → looks up that org’s Profiler URL → POSTs it.

```
task created  →  queue  →  wrap as envelope  →  lookup org URL  →  POST to Profiler
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
- Inner `payload`: your Projex data
- `payload_schema`: object skeleton matching `payload` shape (type placeholders)
- `idempotency_key`: `projex:task.created:task-5001` (so retries don’t duplicate)

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

#### Step 4 — Hook into actions that already exist in Projex

Where Projex already handles something, add **one line**: “also add to send-queue”.


| Projex action       | Queue as              |
| ------------------- | --------------------- |
| Task created        | `task.created`        |
| Task closed         | `task.closed`         |
| Milestone submitted | `milestone.submitted` |


Do this for every row in the [event catalog](#event-catalog).

*You’re not building 50 systems — just one extra line wherever something already happens.*

---

#### Step 5 — Send useful data, not just IDs

Bad — only IDs:

```json
{ "task_id": "t1", "project_id": "proj-42" }
```

Good — IDs **plus** context (join your tables when building the envelope):

```json
{
  "task_id": "t1",
  "project_id": "proj-42",
  "project": { "name": "Capstone Alpha", "term": "2026-S1" },
  "user": { "display_name": "Jane Doe" }
}
```

Also write down what you **actually** send per event type and share with Profiler (they’ll map it to signals later — not Projex’s job).

*Don’t send “order #99” alone — include customer and items on the same slip.*

---

#### Timeline


| When             | What                                                             | Dev time   |
| ---------------- | ---------------------------------------------------------------- | ---------- |
| **Phase A**      | Steps 1–3 + hook 2–3 events (e.g. `task.created`, `task.closed`) | ~1 week    |
| **Phase B**      | Hook remaining events + payload joins                            | ~1–2 weeks |
| **Each new org** | Admin pastes URL in settings                                     | **0**      |


---

#### How to test

1. **Atria:** paste Atria’s Profiler URL in Projex → do something in Atria → check Profiler **Collected data** (Atria only).
2. **RV College:** different URL → events must **not** mix with Atria’s.

---

#### Quick checklist

**Profiler (per org):** create webhook → generate URL → copy to Projex admin.

**Projex (build once):**

1. Org settings + URL table
2. Envelope wrapper function
3. Send-queue + background worker
4. Hooks on existing Projex actions
5. Rich payloads + document field list for Profiler

---

## Related docs

- **[Projex implementation guide](profiler_projex.md)** — DB schema, code layout, cron, UI (build like Ship-ee)
- [Ship-ee implementation (Mentorship)](profiler_mentorship.md) — live reference implementation

---

## Signals (for reference only — do not send)

Projex does **not** send signals like `milestone_timeliness` or `acted_on_feedback`. Profiler derives those later from observations via bindings. Projex only sends **observations** with `ingestion_altitude: "observation"`.

---

