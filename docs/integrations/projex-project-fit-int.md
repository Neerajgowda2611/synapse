# Profiler API Contract: Projex Project Fit

Contract for Projex → Profiler project trait weightage + batch fit (team formation / finder at org scale).

Same XINT surface as Placement. Scoring-only for MVP — projects do **not** appear in Profiler Discover.

Related: [placement-finder-int.md](./placement-finder-int.md), [placement-job-trait-weightage.md](./placement-job-trait-weightage.md).

**Status:** Implemented in Profiler.

---

## Projex setup

Required server-side environment variables in Projex:

```bash
PROFILER_API_URL=https://profiler.example.com
XINT_SERVICE_TOKEN=<same-shared-token-configured-in-profiler>
```

The token must only be used by the Projex backend. Never expose it through
`NEXT_PUBLIC_*`, browser code, or client-side requests.

Every Projex → Profiler request includes:

```http
X-Xint-Token: <XINT_SERVICE_TOKEN>
X-Xint-Source: projex
Content-Type: application/json
```

Profiler configuration:

```bash
XINT_ENABLED=true
XINT_SERVICE_TOKEN=<same-shared-token-configured-in-projex>
XINT_ALLOWED_SOURCES=placement,projex,shipx
FRONTEND_URL=https://profiler.example.com
PROFILE_LINK_TTL=1h
```

No additional signing secret is required. Project-fit links use
`XINT_SERVICE_TOKEN` by default. `PROFILE_LINK_SIGNING_SECRET` is an optional
key-separation override.

---

## Ownership


| System       | Owns                                                       |
| ------------ | ---------------------------------------------------------- |
| **Projex**   | Project record, creator-set trait weights, member emails   |
| **Profiler** | Learner trait profiles + fit % against a project’s weights |


Observation webhooks (existing) measure what learners do. This integration declares **what the project values**.

---

## Scoring unit (MVP)


| Kind    | `xint_source_ref`     | Discover? |
| ------- | --------------------- | --------- |
| Project | `projex:project:{id}` | No        |


Milestone / cohort scoring is out of scope for now.

---

## API overview

Projex directly calls three service-token APIs:

1. `GET /api/v1/xint/traits` — populate the project weight-selection UI.
2. `POST /api/v1/xint/jobs` — create, update, or close a project scoring target.
3. `POST /api/v1/xint/fit/batch` — score one or many candidate emails.

Optional reconciliation:

- `GET /api/v1/xint/jobs/lookup` — confirm the stored project target.

The returned `profile_url` opens Profiler's project-context learner page. That
page calls `GET /api/v1/project-fit` itself with the signed link token and the
viewer's Profiler login token. Projex does not call that endpoint directly.

---

## `jobs` table + `target_kind`

Reuse `POST /api/v1/xint/jobs` and the `jobs` table (no rename).

Profiler stores a slim scoring lens + display fields. Trait weights live in the linked `reward_system`.

The `target_kind` column supports `job` | `career_profile` | `project`. **Callers do not send it** — Profiler infers from `xint_source_ref`:


| Ref prefix                  | `target_kind`    |
| --------------------------- | ---------------- |
| `placement:job:`            | `job`            |
| `placement:career_profile:` | `career_profile` |
| `projex:project:`           | `project`        |
| seeded / no ref             | `job`            |


Unknown ref patterns → reject ingest (`400`).

Learner APIs (`GET /jobs`, `GET /jobs/:id`, learner fit) only return `target_kind = 'job'`.  
XINT lookup + batch fit resolve all kinds.

---

## 1. List available traits

```http
GET /api/v1/xint/traits
X-Xint-Token: <shared_secret>
X-Xint-Source: projex
```

Example call:

```bash
curl "$PROFILER_API_URL/api/v1/xint/traits" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: projex"
```

```json
{
  "traits": [
    {
      "construct_id": "conscientiousness",
      "trait": "conscientiousness",
      "name": "Conscientiousness",
      "description": "Planning, monitoring, and following through on commitments."
    }
  ]
}
```

Projex uses `trait` as the stable value stored with the creator-selected weight.

---

## 2. Ingest project weights

### Endpoint

```http
POST /api/v1/xint/jobs
X-Xint-Token: <shared_secret>
X-Xint-Source: projex
Content-Type: application/json
```

### Example

```json
{
  "xint_source_ref": "projex:project:abc-123",
  "title": "Capstone Alpha",
  "subtitle": "CS499 · 2026-S1",
  "external_url": "https://projex.example.com/projects/abc-123",
  "status": "active",
  "criteria": {
    "label": "Capstone Alpha",
    "traits": [
      { "trait": "agency", "weight": 1.0 },
      { "trait": "collaboration", "weight": 0.8 },
      { "trait": "communication", "weight": 0.7 }
    ]
  }
}
```

### Response

First ingest returns `201 Created`; an update with the same ref returns `200 OK`.

```json
{
  "job_id": "4a295ca4-6275-4d6c-b0f4-3a1f79a50784",
  "reward_system_id": "xint:projex:project:abc-123",
  "source_app": "projex",
  "xint_source_ref": "projex:project:abc-123",
  "target_kind": "project",
  "created": true
}
```

### Rules

- `xint_source_ref` required — upsert key with `(source_app, xint_source_ref)`.
- `title` + `criteria.traits` (at least one trait + weight) required.
- Weights are relative (need not sum to 1). Same 8 Profiler traits as Placement.
- Re-POST on edit. Same ref → update.
- Archive / delete → re-POST the full payload with `"status": "closed"` before deleting local
data. The close request still requires `title` and `criteria.traits`.

### Lookup

```http
GET /api/v1/xint/jobs/lookup?xint_source_ref=projex:project:abc-123
X-Xint-Token: <shared_secret>
X-Xint-Source: projex
```

```json
{
  "job_id": "4a295ca4-6275-4d6c-b0f4-3a1f79a50784",
  "title": "Capstone Alpha",
  "reward_system_id": "xint:projex:project:abc-123",
  "status": "active",
  "source_app": "projex",
  "xint_source_ref": "projex:project:abc-123",
  "target_kind": "project",
  "subtitle": "CS499 · 2026-S1",
  "external_url": "https://projex.example.com/projects/abc-123"
}
```

---

## 3. Batch fit by emails

### Endpoint

```http
POST /api/v1/xint/fit/batch
X-Xint-Token: <shared_secret>
X-Xint-Source: projex
Content-Type: application/json
```

### Request

```json
{
  "xint_source_ref": "projex:project:abc-123",
  "emails": ["student1@college.edu", "student2@college.edu"],
  "as_of": null
}
```

- `emails` required, non-empty, max 500.
- `as_of` optional RFC3339 (or null / omit).
- Use the same endpoint with a one-item `emails` array for a single candidate.

### Response

```json
{
  "xint_source_ref": "projex:project:abc-123",
  "job_id": "4a295ca4-6275-4d6c-b0f4-3a1f79a50784",
  "results": [
    {
      "email": "student1@college.edu",
      "status": "available",
      "fit_percent": 86.5,
      "score": 0.865,
      "user_id": "721480a9-97d9-4cb8-88cd-cf2ab16f52eb",
      "profile_url": "https://profiler.example.com/project-fit?token=<signed-token>",
      "traits": [
        {
          "trait": "agency",
          "weight": 1.0,
          "trait_percent": 90.0,
          "fit_percent": 90.0,
          "contribution_percent": 36.0,
          "usable": true,
          "missing": false
        }
      ]
    },
    {
      "email": "student2@college.edu",
      "status": "unavailable"
    }
  ],
  "summary": {
    "requested": 2,
    "available": 1,
    "unavailable": 1,
    "error": 0
  }
}
```

`results[].status`: `available` | `unavailable` | `error` (same as Placement finder).

For available results:

- `trait_percent` is the learner's measured level for that trait.
- `fit_percent` is the trait score after applying the scoring shape.
- `contribution_percent` is that weighted trait's contribution to the overall fit.
- `usable` / `missing` indicate whether Profiler had enough scoring data.
- `profile_url` is issued only for available Projex project results. It contains a signed,
short-lived project + learner entitlement and no email.
- Do not store `profile_url` as permanent project data. Refresh the candidate scores when a
new link is needed.

Scoring math matches single-user fit; batch does **not** persist per-row `metric_runs` / `reward_scores`.

### Errors

- `200` processed (including partial row failures)
- `400` invalid body
- `401` invalid XINT token/source
- `404` unknown `xint_source_ref`
- `503` XINT disabled

---

## 4. Project-context learner profile

Projex opens `results[].profile_url` when its user selects **View profile**.

- The user must sign in to Profiler.
- The signed link authorizes only its project + learner pair and expires after
`PROFILE_LINK_TTL` (default `1h`).
- Profiler recomputes the score when the page opens; it does not trust the earlier batch result.
- The page shows only the project's selected traits, learner levels, project weights,
weighted contributions, confidence, and evidence density.

The frontend resolves the signed link through:

```http
GET /api/v1/project-fit?token=<signed-token>
Authorization: Bearer <profiler-user-token>
```

Example response:

```json
{
  "target_id": "4a295ca4-6275-4d6c-b0f4-3a1f79a50784",
  "target_kind": "project",
  "project_name": "Capstone Alpha",
  "xint_source_ref": "projex:project:abc-123",
  "learner": {
    "id": "721480a9-97d9-4cb8-88cd-cf2ab16f52eb",
    "name": "Student One",
    "email": "student1@college.edu"
  },
  "as_of": "2026-07-16T18:30:00Z",
  "fit_percent": 86.5,
  "score": 0.865,
  "confidence": {
    "point": 0.865,
    "lower": 0.78,
    "upper": 0.93,
    "level": 0.95
  },
  "traits": [
    {
      "trait": "agency",
      "weight": 1.0,
      "weight_share_percent": 40.0,
      "trait_percent": 90.0,
      "fit_percent": 90.0,
      "contribution_percent": 36.0,
      "usable": true,
      "missing": false,
      "confidence": {
        "point": 0.9,
        "lower": 0.81,
        "upper": 0.96,
        "level": 0.95
      },
      "evidence": {
        "n_signals": 8,
        "n_effective": 6.4,
        "distinct_signal_types": 3,
        "n_observations": 12
      }
    }
  ],
  "missing_traits": []
}
```

Possible page/API errors:

- `401` viewer is not signed in to Profiler
- `400` malformed or tampered link
- `410` link expired; Projex should request batch fit again
- `422` learner has no usable scoring data

---

## End-to-end

```text
1. Creator sets project + trait weights in Projex
2. Projex POSTs /xint/jobs (ref=projex:project:{id})
3. Finder / team UI needs ranks → POST /xint/fit/batch with emails
4. Projex shows fit % + View profile link; Profiler Discover unchanged
5. Profiler login + signed link opens the project-context fit breakdown
6. Archive → POST /xint/jobs with status=closed
```

---

## Projex implementation notes

- Call Profiler only from Projex server code (route handler, tRPC procedure, job, or worker).
- Store the selected `{ trait, weight }[]` on the Projex project.
- Use the immutable Projex project ID in `projex:project:{id}`; do not use a project name.
- Sync after the Projex project transaction succeeds. Queue + retry is preferred so project
creation is not blocked when Profiler is temporarily unavailable.
- On the Add Member screen, send the visible/eligible candidate emails to batch fit and render
`fit_percent`, `traits`, and `profile_url` from each result.
- Preserve input email order if the UI depends on it; Profiler returns results in request order.
- Treat per-row `unavailable` as a normal result (unknown learner or insufficient profile data).
- Treat per-row `error` as retryable/diagnostic without failing the other candidates.

Common request-level failures:

- `400` invalid ref, unknown trait, invalid weight, empty emails, or more than 500 emails
- `401` wrong/missing XINT token or source
- `404` project target was not ingested (or is no longer active)
- `503` Profiler XINT integration is disabled

---

## Projex checklist

- [ ] Project create/edit: creator picks traits + weights
- [ ] Persist criteria on project in Projex DB
- [ ] On create/update: POST `/api/v1/xint/jobs`
- [ ] On archive/delete: POST `status: closed`
- [ ] Finder: POST `/api/v1/xint/fit/batch` with member/candidate emails
- [ ] Render `profile_url` as **View profile** for available candidates
- [ ] Log `xint_source_ref` + last sync status