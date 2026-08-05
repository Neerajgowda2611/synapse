# Profiler API Contract: Career Profile Batch Fit

Contract for Profiler changes needed by Placement backend to support finder filtering/ranking by Career Profile fit at org scale.

This document describes Profiler-side behavior for XINT flows (service token auth, no JWT).

---

## Jobs vs Career Profiles

Both use the same ingest endpoint (`POST /api/v1/xint/jobs`) and the same `jobs` table.

| Kind | `xint_source_ref` | `target_kind` (inferred) |
|------|-------------------|--------------------------|
| Real job | `placement:job:{id}` | `job` |
| Career profile | `placement:career_profile:{id}` | `career_profile` |

`target_kind` is inferred from `xint_source_ref` on ingest (callers do not send it). See also [projex-project-fit-int.md](./projex-project-fit-int.md) for `projex:project:{id}` → `project`.

Learner-facing job surfaces only show `target_kind = 'job'`:

- `GET /api/v1/jobs` excludes non-job kinds
- `GET /api/v1/jobs/:id` returns 404 for non-job kinds
- `GET /api/v1/users/:userId/jobs/:jobId/fit` returns 404 for non-job kinds

XINT lookup and XINT batch fit can resolve all kinds.

---

## Batch fit endpoint

### Endpoint

`POST /api/v1/xint/fit/batch`

### Auth

Same XINT auth as existing XINT routes:

- `X-Xint-Token: <shared_secret>`
- `X-Xint-Source: placement`

### Request body

```json
{
  "xint_source_ref": "placement:career_profile:42",
  "emails": ["student1@college.edu", "student2@college.edu"],
  "as_of": null
}
```

Rules:

- `xint_source_ref` is required.
- `emails` is required, non-empty, max 500.
- `as_of` is optional RFC3339 timestamp (or omitted/null for now).

### Response body

```json
{
  "xint_source_ref": "placement:career_profile:42",
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
          "weight": 0.7,
          "trait_percent": 90.0,
          "fit_percent": 90.0,
          "contribution_percent": 25.0,
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

`results[].status`:

- `available` -> fit computed successfully
- `unavailable` -> user not found or no usable scoring data
- `error` -> per-row processing failure (request still returns 200)

For available Placement results (`career_profile` or `job` targets):

- `profile_url` is a short-lived signed link to Profiler's fit profile page (`/project-fit?token=...`).
- `user_id` is the Profiler learner id for that email.
- Do not store `profile_url` permanently; refresh via a new batch fit when a new link is needed.
- Placement opens `profile_url` for **View profile** (user must sign in to Profiler).

---

## Scoring behavior

Batch fit uses the same reward-scoring math as single-user fit (same reward system, same trait pipeline), but does not persist per-row `metric_runs` / `reward_scores`.

Single-user JWT fit behavior remains unchanged.

---

## Error handling

- `200` processed (including partial row failures)
- `400` invalid body (including empty emails or >500)
- `401` invalid XINT token/source
- `404` unknown `xint_source_ref`
- `503` XINT disabled
