# Placement → Profiler: job trait weightage

Handoff doc for the Placement team. Explains **why** Profiler needs job weightage, **how** fit scoring works, and **what Placement should build** (Placement does not have this feature yet).

Related: [service-integration.md](../service-integration/service-integration.md) (xint job ingest API), [profiler_vtu_placements.md](./profiler_vtu_placements.md) (observation webhooks).

---

## 1. Why we're doing this

Profiler is **not** a job board. It is the **fit engine** for learners: it scores how well a student's trait profile matches a role.


| System        | Owns                                                            |
| ------------- | --------------------------------------------------------------- |
| **Placement** | Full job record (title, company, JD, skills, applications, URL) |
| **Profiler**  | Trait profiles + match % per job                                |


**Job trait weightage** is the bridge. For each job, Placement defines **which behavioral traits matter for that role and how much**. Profiler combines that with the student's trait levels to produce **match %** in Career Discovery and Player Card.

Without weights, Profiler cannot score a specific Placement job — only generic seeded roles (e.g. "Backend Engineer").

---

## 2. What a "trait" is

Profiler uses **8 behavioral traits**, not technical skills (Java, SQL, etc.):


| Trait               | Plain meaning                         | Often relevant for            |
| ------------------- | ------------------------------------- | ----------------------------- |
| `conscientiousness` | Planning, follow-through, reliability | IC roles, backend, ops        |
| `communication`     | Clear expression, stakeholder updates | Client-facing, lead roles     |
| `collaboration`     | Teamwork, coordination                | Team projects, agile          |
| `creativity`        | Novel approaches, problem framing     | Design, product, startup      |
| `resilience`        | Recovery after setbacks               | High-pressure roles           |
| `agency`            | Ownership, self-direction             | Startup, founder-track        |
| `risk_appetite`     | Comfort with uncertainty              | Startup vs enterprise         |
| `help_seeking`      | Asking for help when stuck            | Junior / learning-heavy roles |


Technical skills stay in Placement. Traits are **measured by Profiler** from behavior across Placement, Projex, and Mentorship. Placement only declares **which traits the job cares about**.

Valid trait ids match Profiler's construct register (`backend/pkg/database/catalog/construct_register.json`).

---

## 3. What "weight" means

Each trait gets a positive **weight**. Example:

```json
"traits": [
  { "trait": "conscientiousness", "weight": 1.0 },
  { "trait": "communication", "weight": 0.8 },
  { "trait": "collaboration", "weight": 0.7 }
]
```

- **Higher weight** → more impact on match %
- Weights are **relative**, not percentages (1.0 vs 0.5 = first matters twice as much)
- They do **not** need to sum to 1 or 100

**Fit formula (simplified):**

```text
fit % = (Σ weight × student_trait_level) / (Σ weights) × 100
```

Profiler derives `shape`, `pole`, `peak`, and `metric_id` internally. Placement sends only `trait` + `weight`.

Reference seed profiles: `backend/pkg/database/catalog/reward_systems.json` (`startup_engineer`, `backend_engineer`).

---

## 4. API: what Placement sends

**When:** public job create, update, or close.

```http
POST {PROFILER_URL}/api/v1/xint/jobs
X-Xint-Token: <shared secret>
X-Xint-Source: placement
Content-Type: application/json
```

**Example payload:**

```json
{
  "xint_source_ref": "placement:job:366",
  "title": "SDE-1",
  "company_name": "BluePeak Systems",
  "subtitle": "Full-time · Bangalore",
  "external_url": "https://placement.example.com/jobs/366",
  "status": "active",
  "criteria": {
    "label": "SDE-1",
    "traits": [
      { "trait": "conscientiousness", "weight": 1.0 },
      { "trait": "communication", "weight": 0.8 },
      { "trait": "collaboration", "weight": 0.7 }
    ]
  }
}
```

**Lookup / reconcile:**

```http
GET {PROFILER_URL}/api/v1/xint/jobs/lookup?xint_source_ref=placement:job:366
```

### Field reference


| Field             | Required | Notes                                                           |
| ----------------- | -------- | --------------------------------------------------------------- |
| `xint_source_ref` | Yes      | Stable id, e.g. `placement:job:{placement_job_id}`. Upsert key. |
| `title`           | Yes      | Job title shown in Profiler                                     |
| `criteria.traits` | Yes      | At least one trait + weight                                     |
| `criteria.label`  | No       | Defaults to `title`                                             |
| `status`          | No       | `active` (default), `inactive`, `closed`                        |
| `company_name`    | No       | Discover card category line                                     |
| `subtitle`        | No       | Short line under title                                          |
| `external_url`    | No       | `https://` link — "View on Placement" in discover               |
| `institution_id`  | No       | **MVP: omit** (public jobs). College-scoped jobs later.         |


### What Placement does NOT send

- Full JD, salary, location, skill lists (unless cosmetic via `subtitle`)
- `kind`, `shape`, `pole`, `peak`, `metric_id`, `components`
- Student data or per-trait evidence

### Idempotency

Same `(X-Xint-Source, xint_source_ref)` → update. Re-post after edit. `status: "closed"` removes job from learner discover.

---

## 5. MVP scope

- Sync **public jobs only** — omit `institution_id` (null = visible to all learners, same as seeded demo jobs)
- College-scoped jobs + `institution_id` mapping → future phase
- Async sync recommended (queue + retry) so Placement job APIs are not blocked if Profiler is down

---

## 6. What Placement needs to build

### Intended model: creator sets traits per job

Each time a **public job is created or edited**, the job creator (recruiter / admin) chooses **which traits matter for this specific role** and how much each matters. Those choices are stored on the job in Placement and synced to Profiler on publish/update.

```text
Job create/edit UI  →  creator picks traits + weights  →  save on job  →  POST /xint/jobs
```

Profiler does not care *how* Placement chose the weights — only that each job arrives with a `criteria.traits[]` array. **Per-job, creator-driven** is the planned product model.

**Placement work:**

1. **Job form UI** — when creating/editing a public job:
  - List the 8 Profiler traits (plain-language labels)
  - Let creator select **3–5 traits** for this role
  - Set importance per trait (slider, High/Medium/Low, or numeric weight)
2. **Persist on job** — e.g. `job.trait_criteria` JSON column or related table
3. **On publish/update** — map saved criteria → POST Profiler xint/jobs
4. **On close** — POST with `status: closed`

**Example UX (simple):**


| Trait             | Importance |
| ----------------- | ---------- |
| Conscientiousness | High       |
| Communication     | High       |
| Collaboration     | Medium     |


Map internally: High = 1.0, Medium = 0.7, Low = 0.4 (or let creator edit numbers in an “Advanced” panel).

### Optional: suggested defaults (not a replacement for creator choice)

To speed up data entry, Placement **may** offer **starter suggestions** when the form opens — e.g. pre-fill from a role type dropdown (“Software Engineer”, “Intern”). The creator can change or clear them before publish. This is **not** auto-sync by category behind the scenes unless the creator confirms.


| Suggested preset (optional) | Traits (weight)                                                  |
| --------------------------- | ---------------------------------------------------------------- |
| Software Engineer (IC)      | conscientiousness 1.0, communication 0.8, collaboration 0.7      |
| Startup / Generalist        | agency 1.0, risk_appetite 0.8, creativity 0.8, collaboration 0.7 |
| Intern / Junior             | help_seeking 0.8, conscientiousness 0.9, communication 0.7       |


Presets = **defaults in the UI**, not a hidden mapping that bypasses the creator.

### Optional later: skill → trait hints

If Placement has skill tags, the form can **suggest** trait boosts (“You added Leadership — consider Communication?”). Creator still approves before save.

### How many traits per job?

**3–5 traits** per job is ideal. Creator chooses which differentiate *this* role.

---

## 7. When to sync


| Event                        | Action                              |
| ---------------------------- | ----------------------------------- |
| Public job **published**     | patch published                     |
| Job **updated**              | POST again (same `xint_source_ref`) |
| Job **closed / unpublished** | POST, `status: closed`              |
| Private / college-only (MVP) | Do not sync                         |


---

## 8. End-to-end flow

```text
1. Recruiter or facilitator creates/edits public job "SDE-1" in Placement
2. On job form: Recruiter or facilitator selects traits + weights for THIS job (optional presets as starting point)
3. On publish: Placement POSTs that job's trait criteria to Profiler /api/v1/xint/jobs
4. Student opens Profiler → Discover shows SDE-1 + match %
5. Student clicks "View on Placement" (external_url)
6. Student activity → Placement webhooks → Profiler traits improve → fit updates on refresh
```

If recruiter **edits** trait weights later → POST again (same `xint_source_ref`, Profiler upserts).

### Two integrations (do not conflate)


| Integration                                                                           | Purpose                                  |
| ------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Job ingest (this doc)**                                                             | What the **role** values (trait weights) |
| **Observation webhooks** ([profiler_vtu_placements.md](./profiler_vtu_placements.md)) | What the **student** has demonstrated    |


---

## 9. What learners see in Profiler

- Discover / Player Card: job title, company, match %
- Fit breakdown: role weight per trait, student level, match points
- Link back to Placement via `external_url`

Fit API (Profiler-internal, not Placement): `GET /api/v1/users/:userId/jobs/:jobId/fit`

---

## 10. Suggested MVP checklist (Placement)

- [ ] Job create/edit UI: creator selects traits + weights for **this job** (public jobs only)
- [ ] Persist `trait_criteria` on the job record in Placement DB
- [ ] On publish/update: POST criteria to Profiler xint/jobs
- [ ] On close: POST `status: closed`
- [ ] Log `xint_source_ref` + last sync status
- [ ] (Optional) Preset suggestions from role type to pre-fill the form
- [ ] (Later) `institution_id` for college-scoped jobs

---

## 11. Example: SDE-1 (job id 366)

```bash
curl -X POST "$PROFILER_URL/api/v1/xint/jobs" \
  -H "Content-Type: application/json" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: placement" \
  -d '{
    "xint_source_ref": "placement:job:366",
    "title": "SDE-1",
    "company_name": "BluePeak Systems",
    "subtitle": "Full-time",
    "external_url": "http://localhost:8081/jobs/366",
    "status": "active",
    "criteria": {
      "label": "SDE-1",
      "traits": [
        { "trait": "conscientiousness", "weight": 1.0 },
        { "trait": "communication", "weight": 0.8 },
        { "trait": "collaboration", "weight": 0.7 }
      ]
    }
  }'
```

---

## Summary


| Question                     | Answer                                                       |
| ---------------------------- | ------------------------------------------------------------ |
| What is weightage?           | Per-job list of behavioral traits + how much each matters    |
| Who defines it?              | Placement (templates or recruiter)                           |
| Who measures student traits? | Profiler from cross-app activity                             |
| Minimum to ship?             | Job form where creator sets traits/weights + sync on publish |
| Placement owns job data?     | Yes — Profiler stores a slim scoring lens only               |


