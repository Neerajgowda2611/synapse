# Service Integration

> Apps: **Projex** (Next.js + tRPC, Postgres/Drizzle), **Mentorship / ShipX** (Next.js + tRPC, Postgres/Drizzle, has outbound webhook dispatch with HMAC), **Placement / edx-app** (Next.js frontend → **Go API** at `/api/v1`, AuthX bearer auth).

---

## Identity — how we link users across apps

Same person has **different local ids** in each app. The client never sees or sends a shared id. We fix that once at login, then only the **server** uses it for cross-app calls.

### The one shared id: `authx_subject`

When a user logs in via AuthX, the IdP returns OIDC `sub` (e.g. `authx|user_abc123`). That value is the same person in every app.

On login, each app saves one row:

```text
xint_user_link
  authx_subject   →  authx|user_abc123     (same everywhere)
  local_user_id   →  projex-uuid / shipx-uuid / placement-go-id  (different per app)
  email
  updated_at
```

Projex fills this from Better Auth `account.account_id` where `provider_id = 'authx'`.  
Placement fills it when Go exchanges the AuthX `id_token` on `/auth/authx/session-token`.

---

### Server flow (every cross-app call)

```
User clicks something in the UI
        ↓
Browser → own app only (cookie or Placement JWT)
        ↓
Handler reads session → local_user_id
        ↓
resolveXintSubject(local_user_id) → authx_subject
        ↓
Server calls other app with authx_subject in body/query
        ↓
Other app looks up its local_user_id from same authx_subject
```

`resolveXintSubject` is a server helper — one lookup in `xint_user_link`. The client never calls it and never receives `authx_subject`.

---

### How the client app uses it

The client **only** talks to its own backend with **app-local ids** (task, cohort, job, mentor profile id). It never calls Projex/ShipX/Placement cross-app URLs. It never sends `authx_subject`, `authxUserId`, or another app’s user id.

#### Projex / ShipX (React + tRPC)

```tsx
// ✅ Client — only domain ids + normal session cookie
const handoff = await trpc.xint.assistance.createHandoff.mutate({
  taskId: "task-uuid",
  mentorProfileId: "mentor-profile-uuid",
});

window.open(handoff.handoffUrl, "_blank"); // deep link — no user id in URL

// ✅ Client — export to Placement
await trpc.xint.placement.exportProject.mutate({
  cohortId: "cohort-uuid",
  milestoneId: "milestone-uuid",
  title: editedTitle,      // optional edits from preview panel
  skills: editedSkills,
});

// ❌ Client never does this
// fetch("https://placement.../api/v1/xint/profile/projects", { body: { authx_subject: "..." } })
```

```ts
// ✅ Server — inside tRPC handler (Projex example)
export const exportProject = protectedProcedure
  .input(z.object({ cohortId: z.string(), milestoneId: z.string().optional(), ... }))
  .mutation(async ({ ctx, input }) => {
    const authxSubject = await resolveXintSubject(ctx.session.user.id);

    await fetch(`${placementUrl}/api/v1/xint/profile/projects`, {
      method: "POST",
      headers: { "X-Xint-Token": process.env.XINT_SERVICE_TOKEN!, "X-Xint-Source": "projex" },
      body: JSON.stringify({ authx_subject: authxSubject, cohortId: input.cohortId, ... }),
    });
  });
```

The UI uses `session.user.id` only for normal Projex features (tasks, teams). Integration buttons call `xint.*` tRPC; those handlers do the cross-app work.

#### Placement (React + Go API)

```tsx
// ✅ Client — normal Placement APIs with JWT from localStorage
const profile = await userApi.getProfile(user.email);
const jobs = await jobApi.browse({ category: "matching_skills" });

// ✅ Client — pick projects to match jobs (Flow B)
setSelectedProjectIds([101, 102]);
// server or client filters jobs using profile.experiences.project skills

// ✅ Client — open ShipX mentor (deep link only)
window.open(mentor.profileUrl + "&xint_source=placement&xint_ctx=" + ctx, "_blank");

// ❌ Client never calls GET projex.../portfolio or GET shipx.../mentors with a service token
```

```go
// ✅ Placement Go server — when building recommended jobs after cohort complete
authxSubject := resolveXintSubjectFromJWT(claims) // server only
portfolio := httpGet(projexURL + "/api/xint/learner/" + authxSubject + "/portfolio", xintToken)
// match portfolio.skills to jobs for this user's org
```

Placement client keeps using `Authorization: Bearer <jwt>`. Cross-app pulls run in **Go handlers or BFF**, not in the browser.

#### Deep links (all apps)

Client opens a URL in a new tab. URL carries **context only** (task, job, career path) — not user id.

```text
https://shipx.example.com/coachee/coaches?mentorId=MENTOR_ID&xint_source=projex&xint_ctx=BASE64_JSON
```

ShipX reads its **own session cookie** when the page loads. Same AuthX login = same person. No id passthrough in the link.

---

### Client vs server — quick reference

| Layer | Knows | Sends to API |
|-------|--------|----------------|
| **Browser (Projex/ShipX)** | `session.user.id`, `taskId`, `cohortId`, `mentorProfileId` | tRPC `xint.*` with domain ids only |
| **Browser (Placement)** | JWT, `jobId`, `projectExperienceId` | Go `/api/v1/...` with Bearer token |
| **Server (any app)** | `local_user_id` → `authx_subject` via `xint_user_link` | Cross-app `/api/xint/*` with `X-Xint-Token` + `authx_subject` |

---

### What we store (identity only)

| App | Table / column | Purpose |
|-----|----------------|---------|
| Projex, ShipX, Placement | `xint_user_link` | Map local user ↔ `authx_subject` |
| Integration tables (`xint_placement_export`, etc.) | `authx_subject` column | Tie export/session link to the person, not projex-uuid vs go-id |

Do **not** put `authx_subject` in React state, localStorage, or URL query params (except server-built deep-link context blobs that intentionally exclude user id).

---

## Flow index

Each flow below has **User journey**, **APIs** (input/output), plus product decisions. Browser calls **own app only** unless noted.

| ID | Apps | Flow | Detail section |
|----|------|------|----------------|
| P↔M-A | Projex → ShipX | Mentor assistance for a task | [§ Flow A](#flow-a--projex--shipx-mentor-assistance-for-a-task) |
| P↔M-B | ShipX → Projex | Mentor quick-create task *(TBD)* | [§ Flow B](#flow-b--shipx--projex-mentor-creates-task-for-mentee) |
| P↔Pl-A | Projex → Placement | Job recommendations after cohort completion | [§ Flow A](#flow-a--projex--placement-job-recommendations-after-cohort-completion) |
| P↔Pl-B | Placement | Match jobs by profile projects | [§ Flow B](#flow-b--job-matching-from-profile-projects-placement) |
| P↔Pl-C | Projex → Placement | Export project to profile | [§ Flow C](#flow-c--export-project--skills-to-placement-profile) |
| Pl↔M-A | Placement → ShipX | Career path mentor recommendation | [§ Flow A](#flow-a--career-path-mentor-recommendation) |
| Pl↔M-B | Placement → ShipX | Job mentors linked at job create | [§ Flow B](#flow-b--job-based-mentor-recommendation) |

**Shared session sync** → [§ Session webhook & pull](#session-status-sync)

---

## API reference (curl)

### Base URLs (env)

```bash
export SHIPX_URL="https://mentorship.example.com"      # ShipX / ship-ee
export PROJEX_URL="https://projex.example.com"
export PLACEMENT_URL="https://placement.example.com"   # Go API host (no /api/v1)
export XINT_SERVICE_TOKEN="your-shared-secret"
# AUTHX_SUBJECT: for manual server-side curls only — not a frontend env var
export AUTHX_SUBJECT="authx|user_abc123"
```

### Headers

**Browser → own app** — session cookie (Projex/ShipX) or `Authorization: Bearer $PLACEMENT_JWT`. No `X-Xint-Token` in the browser.

**Server → other app** — service token only; `authx_subject` goes in body/query, resolved server-side before the curl runs:

```bash
-H "Content-Type: application/json" \
-H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
-H "X-Xint-Source: projex"    # or placement | shipx
```

---

### ShipX — `GET /api/xint/mentors`

Match mentors by skills. Called from **server only** (Placement or Projex backend).

```bash
curl -s "$SHIPX_URL/api/xint/mentors?skills=react,node.js,api-design&limit=10" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: placement"
```

**Response `200`:**
```json
{
  "mentors": [
    {
      "id": "mentor-profile-uuid",
      "name": "Jane Doe",
      "org": "Acme Coaching",
      "skills": ["React", "Node.js"],
      "bio": "Senior engineer…",
      "profileUrl": "https://mentorship.example.com/coachee/coaches?mentorId=mentor-profile-uuid"
    }
  ]
}
```

---

### ShipX — `GET /api/xint/sessions`

Pull session status for Projex task or Placement job/career path. See [§ Session status sync](#session-status-sync).

```bash
curl -s "$SHIPX_URL/api/xint/sessions?source=projex&externalRef=assist-req-uuid&authx_subject=$AUTHX_SUBJECT" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: projex"
```

**Response `200`:**
```json
{
  "session": {
    "id": "session-uuid",
    "status": "scheduled",
    "scheduledStartAt": "2026-07-01T10:00:00.000Z",
    "scheduledEndAt": "2026-07-01T11:00:00.000Z",
    "meetingLink": "https://meet.example.com/abc",
    "cancelReason": null
  }
}
```

**Response `404`:** no linked session yet.

---

### Projex — `GET /api/xint/learner/{authx_subject}/portfolio`

Placement server pulls completed projects + skills after cohort completion.

```bash
curl -s "$PROJEX_URL/api/xint/learner/$AUTHX_SUBJECT/portfolio" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: placement"
```

**Response `200`:**
```json
{
  "projects": [
    {
      "cohortId": "cohort-uuid",
      "title": "E-commerce MVP",
      "skills": ["React", "API Design"],
      "domains": ["Web Development"],
      "technologies": ["Next.js", "PostgreSQL"],
      "role": "Frontend Lead",
      "completionStatus": "completed",
      "evaluationScore": 85
    }
  ]
}
```

---

### Projex — `POST /api/xint/tasks/quick-create` *(planned, P↔M-B)*

```bash
curl -s -X POST "$PROJEX_URL/api/xint/tasks/quick-create" \
  -H "Content-Type: application/json" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: shipx" \
  -d '{
    "authx_subject_mentee": "authx|user_abc123",
    "cohortId": "cohort-uuid",
    "title": "Follow-up from mentorship session",
    "description": "Optional",
    "shipxSessionId": "session-uuid"
  }'
```

**Response `201`:**
```json
{
  "taskId": "task-uuid",
  "projexTaskUrl": "https://projex.example.com/org/.../tasks/task-uuid"
}
```

---

### Projex — `POST /api/xint/webhooks/session` *(consumer)*

ShipX pushes session updates to Projex (optional; use pull if skipped).

```bash
curl -s -X POST "$PROJEX_URL/api/xint/webhooks/session" \
  -H "Content-Type: application/json" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: shipx" \
  -d '{
    "event": "session.booked",
    "sessionId": "session-uuid",
    "status": "scheduled",
    "xint_origin": "projex",
    "xint_external_ref": { "assistanceRequestId": "assist-req-uuid", "taskId": "task-uuid" },
    "scheduledStartAt": "2026-07-01T10:00:00.000Z",
    "meetingLink": "https://meet.example.com/abc",
    "cancelReason": null
  }'
```

**Response `202`:** accepted.

---

### Placement — `GET /api/v1/xint/profile/projects` (reconcile)

Projex server checks if export already exists before showing the prompt.

```bash
curl -s "$PLACEMENT_URL/api/v1/xint/profile/projects?authx_subject=$AUTHX_SUBJECT&source=projex&xint_source_ref=projex:cohort:cohort-uuid:milestone:milestone-uuid" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: projex"
```

**Response `200`:**
```json
{
  "exists": true,
  "placementExperienceId": 12345
}
```

---

### Placement — `POST /api/v1/xint/profile/projects` (export)

Projex server writes project to Placement profile (Flow C).

```bash
curl -s -X POST "$PLACEMENT_URL/api/v1/xint/profile/projects" \
  -H "Content-Type: application/json" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: projex" \
  -d '{
    "authx_subject": "authx|user_abc123",
    "xint_source_ref": "projex:cohort:cohort-uuid:milestone:milestone-uuid",
    "title": "E-commerce MVP",
    "description": "Built checkout flow and payment integration.",
    "skills": [
      { "label": "React", "value": "react" },
      { "label": "API Design", "value": "api-design" }
    ],
    "meta_data": {
      "xint_source": { "app": "projex", "cohortId": "cohort-uuid", "milestoneId": "milestone-uuid" },
      "contribution_areas": [{ "area": "UI/UX", "pct": 40 }],
      "completion_status": "completed"
    },
    "merge_skills_to_profile": true
  }'
```

**Response `200`:**
```json
{
  "placementExperienceId": 12345,
  "created": true
}
```

`created: false` = idempotent upsert (same `xint_source_ref` sent again).

---

### Placement — existing user profile *(Flow B, no xint)*

```bash
curl -s "$PLACEMENT_URL/api/v1/user/student@example.com/profile" \
  -H "Authorization: Bearer $PLACEMENT_JWT"
```

Use `experiences.project[].skills` from response for job matching.

---

### Placement — existing jobs browse *(Flow A / B)*

```bash
curl -s "$PLACEMENT_URL/api/v1/jobs?category=matching_skills" \
  -H "Authorization: Bearer $PLACEMENT_JWT"
```

Server ranks by skill overlap with portfolio or selected project skills.

---

### Session status sync

**Option A — ShipX pushes (webhook to Placement):**
```bash
curl -s -X POST "$PLACEMENT_URL/api/v1/xint/webhooks/session" \
  -H "Content-Type: application/json" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: shipx" \
  -d '{
    "event": "session.updated",
    "sessionId": "session-uuid",
    "status": "cancelled",
    "xint_origin": "placement",
    "xint_external_ref": { "jobId": "42" },
    "cancelReason": "Mentor unavailable"
  }'
```

**Option B — consumer pulls:** use [ShipX `GET /api/xint/sessions`](#shipx--get-apixintsessions) above.

---

### Browser → own app (tRPC) — client usage

The React app calls tRPC with **domain ids only**. Session cookie is sent automatically. Server runs `resolveXintSubject` before any cross-app curl.

**Projex — mentor assistance:**
```tsx
trpc.xint.assistance.createHandoff.mutate({ taskId, mentorProfileId })
```

**Projex — export to Placement:**
```tsx
trpc.xint.placement.exportProject.mutate({ cohortId, milestoneId, title, skills })
```

Equivalent HTTP (for debugging; not how we build UI):
```bash
curl -s -X POST "$PROJEX_URL/api/trpc/xint.assistance.getContext" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{"json":{"teamId":"team-uuid"}}'
```

**Response:**
```json
{
  "result": {
    "data": {
      "json": {
        "tasks": [{ "id": "task-uuid", "title": "Implement auth" }],
        "cohortSkills": ["React", "Node.js"],
        "assistanceStatusByTaskId": { "task-uuid": "none" }
      }
    }
  }
}
```

**Projex — create handoff URL (opens ShipX):**
```bash
curl -s -X POST "$PROJEX_URL/api/trpc/xint.assistance.createHandoff" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{"json":{"taskId":"task-uuid","mentorProfileId":"mentor-profile-uuid"}}'
```

**Response:**
```json
{
  "result": {
    "data": {
      "json": {
        "assistanceRequestId": "assist-req-uuid",
        "handoffUrl": "https://mentorship.example.com/coachee/coaches?mentorId=mentor-profile-uuid&xint_source=projex&xint_ctx=eyJ..."
      }
    }
  }
}
```

**Projex — export preview / confirm (Flow C):**
```bash
# Preview
curl -s -X POST "$PROJEX_URL/api/trpc/xint.placement.getExportPreview" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{"json":{"cohortId":"cohort-uuid","milestoneId":"milestone-uuid"}}'

# Confirm (server then runs POST Placement /api/v1/xint/profile/projects curl)
curl -s -X POST "$PROJEX_URL/api/trpc/xint.placement.exportProject" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{"json":{"cohortId":"cohort-uuid","milestoneId":"milestone-uuid","title":"E-commerce MVP","skills":[{"label":"React","value":"react"}]}}'
```

---

### Deep link (browser navigation, not curl)

User clicks mentor / book session. No `authx_subject` in URL.

```
https://mentorship.example.com/coachee/coaches?mentorId=MENTOR_ID&xint_source=projex&xint_ctx=BASE64_JSON
```

Decoded `xint_ctx` example:
```json
{
  "assistanceRequestId": "assist-req-uuid",
  "taskId": "task-uuid",
  "cohortId": "cohort-uuid",
  "taskTitle": "Implement auth",
  "deadlines": { "task": "2026-07-15", "cohort": "2026-08-01" }
}
```

ShipX reads query params, resolves user from **its own** session cookie, then normal booking flow.

---

## Integration model (hard integration v0)

v0 is a **deliberately disposable** integration: simple conventions now, clean removal later when we do it "properly". Everything below is built to be grep-and-delete.

### Removal-first conventions

| Rule | Convention | Why it's removable |
|------|------------|--------------------|
| **One namespace** | Prefix every integration artifact with `xint`: DB tables `xint_*`, added columns `xint_*`, REST routes `/api/v1/xint/*` (Placement Go) and `/api/xint/*` (Next apps), tRPC router `xint.*`, env vars `XINT_*` | `grep -ri xint` finds 100% of the integration; deleting it leaves core untouched |
| **Additive-only schema** | New **dedicated tables** + **nullable** columns only. Never alter existing column semantics, never add `NOT NULL`/FK into core tables | Dropping `xint_*` tables/columns can't break core writes |
| **No cross-app FKs** | Store foreign app ids as plain `text` (e.g. `xint_external_user_id`, `xint_shipx_session_id`). Never a real FK across services | IDs from another DB can't be constrained anyway; safe to orphan |
| **Single key** | Join xint data on **`authx_subject`** (OIDC `sub`), resolved server-side. Email only as temporary fallback until `xint_user_link` exists | One stable identifier; client never participates in cross-app linkage |
| **Static service auth** | Server-to-server calls use a shared secret header `X-Xint-Token: $XINT_SERVICE_TOKEN` + `X-Xint-Source: projex\|placement\|shipx`. (ShipX→others may reuse existing HMAC dispatch where it already exists) | Rotate/delete one env var to kill all access |
| **Config, never hardcode** | Base URLs + tokens live in env, surfaced via one `xintConfig` module per app. UI links built from config helpers (`xintMentorUrl()`, `xintPlacementProfileUrl()`) | No hardcoded hostnames buried in components |
| **Feature flag** | Every entrypoint (route, panel, emit) gated by `XINT_ENABLED`. Off = app behaves exactly as today | Flip flag to disable instantly; delete flag + branch later |
| **Pull over store** | Recommendations = **read-time pull**, store nothing. Persist only **durable cross-app links** (booked sessions, profile exports) | Less state to reconcile and to delete |

### Source of truth (who owns each domain)

| Domain | Owner | Others may keep |
|--------|-------|-----------------|
| Mentor catalog, availability, sessions, booking | **ShipX** | snapshot of mentor card fields + session **status mirror** only |
| Cohorts, tasks, project completion, demonstrated skills | **Projex** | what Projex pushed into a Placement profile entry |
| Jobs, student profile (`experiences.project`, `attributes.skills`), applications | **Placement** | — |

---

## API surface (quick index)

Full curl examples → [§ API reference (curl)](#api-reference-curl).

| Endpoint | Who calls | Used in flows |
|----------|-----------|---------------|
| `GET {shipx}/api/xint/mentors` | Projex / Placement server | P↔M-A, Pl↔M-A, Pl↔M-B |
| `GET {shipx}/api/xint/sessions` | Projex / Placement server | P↔M-A, Pl↔M-A, Pl↔M-B |
| `GET {projex}/api/xint/learner/{authx_subject}/portfolio` | Placement server | P↔Pl-A |
| `GET/POST {placement}/api/v1/xint/profile/projects` | Projex server | P↔Pl-C |
| `POST {consumer}/api/xint/webhooks/session` | ShipX server | session sync |
| tRPC `xint.*` on Projex / ShipX | Browser → own app | all UI flows |

---

## Tracking ownership (DB) — store / must-not-store

### Projex stores
- `xint_user_link` — `{ authx_subject, local_user_id, email, updated_at }` (identity bridge; filled on AuthX login).
- `xint_placement_export` — `{ id, authx_subject, cohort_id, milestone_id?, xint_placement_experience_id, status, synced_at }` (Flow C).
- `xint_assistance_request` — `{ id, task_id, cohort_id, mentor_profile_id, xint_shipx_session_id?, status, updated_at }` (Flow A; mentor = ShipX id, not Placement/Projex user id).
- **Must NOT store:** mentor catalog, job listings, Placement profile content, session scheduling detail (keep only session id ref + status mirror).

### ShipX stores
- On `mentorship_session` (additive, nullable): `xint_origin` (`'projex' | 'placement' | null`), `xint_external_ref` (jsonb: `{ taskId?, cohortId?, jobId?, careerPathId? }`).
- **Must NOT store:** jobs, cohort content, Placement profiles, or a new `session_type`. Origin is metadata only; mentor + session data stays canonical here.

### Placement stores
- On project experience `meta_data.xint_source` — `{ app:'projex', cohortId, milestoneId?, exportId }` for dedupe (Flow C).
- `xint_job_recommended_mentors` — jsonb snapshot of mentor cards linked at job creation (Placement Flow B "link at creation"): `{ mentorId, name, org, skills[], profileUrl }[]`.
- `xint_mentor_session` (optional mirror) — `{ authx_subject, xint_shipx_session_id, status, job_id?, career_path_id?, updated_at }` for booked-session UI on jobs page.
- **Must NOT store:** canonical mentor profiles (snapshot only), cohort/project source data (only what was pushed into the profile), availability or booking logic.

---

## Per-flow contracts (input → output → persisted)

| Flow | Caller → Callee | Input (sent) | Output (received) | Persisted (by whom) |
|------|-----------------|--------------|-------------------|---------------------|
| Projex↔Mentorship A (task assistance) | Projex → ShipX (handoff) | Server: `authx_subject`, `mentorProfileId`, `{taskId,cohortId,teamId,projectId}`, deadlines. Client: task + mentor pick only | ShipX session id once booked | Projex: `xint_assistance_request`; ShipX: `xint_origin/xint_external_ref` |
| Projex→Placement (jobs after completion) | Placement → Projex (pull) | `authx_subject` (Placement server resolves from JWT → link) | portfolio `{projects[]}` | none or Flow C profile |
| Placement Flow B (match my projects) | internal Placement | selected `experiences.project[]` skills | ranked jobs | none |
| Flow C (export project → profile) | Projex → Placement | Server: `{authx_subject, title, summary, skills[], …, xint_source_ref}`. Client: cohort/milestone ids only | `{ placementExperienceId }` | Projex: `xint_placement_export`; Placement: `meta_data.xint_source` |
| Placement↔Mentorship A (career path mentors) | Placement → ShipX (pull) | careerPath `skills[]` (no user id required for mentor list) | mentor cards[] | snapshot optional; deep-link uses session on ShipX |
| Placement↔Mentorship B (job mentors at creation) | Placement → ShipX (pull at job create) | job skills[] | mentor cards[] | Placement: `xint_job_recommended_mentors` snapshot |
| Session status back to Placement/Projex | consumer → ShipX (pull) | `source`, `externalRef` | session `{id,status,times,link,cancelReason}` | consumer: status mirror row |

### Removal checklist (when we replace v0)
1. Set `XINT_ENABLED=false` everywhere → all entrypoints no-op.
2. `grep -ri xint` in each repo → delete routes, `xint.*` routers, `xintConfig`, UI link helpers + panels.
3. Drop `xint_*` tables and `xint_*` columns (additive, so no core migration risk).
4. Remove `XINT_*` env vars + service token.
5. Core apps run exactly as pre-integration.

---

## Projex <> Mentorship

### Flow A — Projex → ShipX (mentor assistance for a task)

#### User journey

| Step | Where | What the user does |
|------|-------|-------------------|
| 1 | Projex — team view | Opens **Mentor assistance** |
| 2 | Projex — inline panel | Selects a **task** and a **mentor** from skill-matched list |
| 3 | Projex | Clicks **Book session** → new tab opens ShipX (stays logged in via AuthX SSO) |
| 4 | ShipX — mentor profile / booking | Picks slot, confirms session (existing coachee flow) |
| 5 | Projex — task page | Sees session card: status, time, link (read-only, synced) |
| 6 | ShipX — session detail | Sees Projex task / cohort context on the session |

User never books inside Projex. User never chats across apps.

#### API call sequence

| Step | Who | Call | Curl section |
|------|-----|------|--------------|
| 1 | Browser | `POST /api/trpc/xint.assistance.getContext` | [tRPC — getContext](#browser--own-app-trpc-examples) |
| 2 | Projex server | `GET /api/xint/mentors?skills=…` | [ShipX mentors](#shipx--get-apixintmentors) |
| 3 | Browser | `POST /api/trpc/xint.assistance.createHandoff` | [tRPC — createHandoff](#browser--own-app-trpc-examples) |
| 4 | Browser | Open `handoffUrl` (deep link) | [Deep link](#deep-link-browser-navigation-not-curl) |
| 5 | ShipX | Existing session book (internal tRPC) | — |
| 6 | ShipX → Projex | webhook **or** Projex pulls sessions | [Webhook](#projex--post-apixintwebhookssession-consumer) / [GET sessions](#shipx--get-apixintsessions) |
| 7 | Browser | `POST /api/trpc/xint.assistance.getStatus` | task page poll |

**Persisted:** Projex `xint_assistance_request`; ShipX `mentorship_session.xint_origin` + `xint_external_ref`.

---

### Product behavior

1. **Team-level entry (not task creation)**  
   On the team view, learners see **Mentor assistance**: mentors matched by **cohort skills vs ShipX mentor skills**.

2. **Minimal handoff from Projex**  
   Learner picks:
   - a **task** (context)
   - a **mentor** (from matched ShipX catalog)

   Projex does **not** handle availability, booking UI, or session management.

3. **Booking happens in ShipX**  
   **?** opens ShipX with context:
   - project / cohort / team / task IDs
   - learner user ID
   - selected mentor profile ID

   ShipX shows session booking with that context in session details.

4. **Bidirectional visibility after booking**
   - **Projex task page:** session status, time, link, cancellation reason (read-only sync)
   - **ShipX session page:** Projex task + project context
   - **Profiles (both sides):** “Projex” badge when an active linked session exists between those users

5. **No Projex-native session**  
   One ShipX session per assistance request. Under the hood this should be an **individual 1:1 session**, not a group session.

---

### Agreed decisions (refined)

| # | Decision | Notes |
|---|----------|-------|
| 1 | Mentor assistance UX lives at **team level** | Correct pivot from current task-create/edit UI |
| 2 | Projex = select task + mentor only | Rest in ShipX |
| 3 | No new ShipX “session type” | Use existing `regular` session + **origin metadata** |
| 4 | Projex context on ShipX profile **only after booking** | Avoid leaking context pre-session |
| 5 | No cross-app chat | Projex comments ≠ ShipX session chat |

### Prerequisites (TODOs)

| Item | Current state | Action |
|------|---------------|--------|
| Cohort skill config | Projex has `organization_skills` + learner interests only; no cohort/task skill tags | Add cohort skill tags for matching |
| Task resources | Projex tasks have no resource section; ShipX tasks do | Add task resources in Projex for richer context in handoff |

### Open questions — with recommendations

#### 1. Reverse sync (task ↔ session)

**Yes — do this.** Easiest path:

```
Projex: assistance_request { taskId, mentorUserId, status, shipxSessionId }
ShipX webhook/event: session.booked | session.updated | session.cancelled
→ Projex updates task session panel
```

Projex should not poll ShipX. ShipX already has webhook dispatch (`webhook-dispatch.ts`); mirror the Profiler pattern.

#### 2. Deadline constraints

Enforce at **handoff + booking**:

- Projex sends `task.deadline`, `milestone.endDate`, `cohort.endDate` in context
- ShipX booking UI/API rejects slots after the effective deadline
- On reschedule, re-validate against Projex (Projex remains source of truth for deadlines)

#### 3. Cohort role `mentor` vs ShipX mentor

This **will** be confusing — you already have two mentor concepts in Projex:

| Concept | Where | Purpose today |
|---------|--------|----------------|
| **Cohort mentor** | `cohort_members.role = mentor` | Staff on cohort; assigned to teams via `team_staff_assignments` |
| **ShipX mentor** | ShipX `mentor_profile` | Platform catalog, availability, sessions |

**Recommendation:**

- **ShipX mentors** = “Platform mentors” / “Book a session” (skill-matched catalog)
- **Cohort mentors** = “Assigned facilitators” (team staff, comments, evaluations)
- Do **not** merge these roles in `cohort_members`
- Team mentor-assistance UI should pull from **ShipX API**, not `team_staff_assignments`

#### 4. Session lifecycle (cancel / complete / no-show)

| ShipX event | Projex task should show |
|-------------|-------------------------|
| `scheduled` | Session booked + link |
| `active` / `completed` | Status + optional summary |
| `cancelled` | Status + `cancellation_reason` |
| `no_show` | Status + reason if present |

Task work status stays independent (TODO/IN_PROGRESS/DONE). Assistance has its own sub-state (`none | requested | booked | completed | cancelled`).

Also handle: mentor rejects, booking expires, user books twice for same task, session rescheduled.

#### 5. How much Projex context on ShipX profiles?

**Tiered display:**

| When | Show |
|------|------|
| Before booking | Nothing on profile |
| After booking | Task title, project/cohort name, team name, task deadline |
| After completion | Same + session outcome (rating/feedback if you sync it) |

Avoid full task description, submissions, or comment threads on ShipX profile — link back to Projex for depth.

**TBD:** “Recommended mentors” on cohort page



### Flow B — ShipX → Projex (mentor creates task for mentee)

> Separate from Flow A. **TBD** — not in v0 scope unless explicitly scheduled.

#### User journey (planned)

| Step | Where | What the user does |
|------|-------|-------------------|
| 1 | ShipX — session or task detail | Mentor clicks **Create task in Projex** |
| 2 | ShipX — inline panel or redirect | Confirms title / links to mentee’s active cohort |
| 3 | Projex | Task appears on team board (or mentor sees confirmation in ShipX) |

#### API call sequence *(planned)*

| Step | Who | Call | Curl section |
|------|-----|------|--------------|
| 1 | Browser | `POST /api/trpc/xint.projex.canQuickCreate` | *(TBD — same tRPC pattern)* |
| 2 | ShipX server | `POST /api/xint/tasks/quick-create` | [Projex quick-create](#projex--post-apixinttasksquick-create-planned-pm-b) |

---

### Open questions

#### 1. Where to show quick action?
#### 2. Session association?

---

## Projex <> Placements

### Flow A — Projex → Placement (job recommendations after cohort completion)

#### User journey

| Step | Where | What the user does |
|------|-------|-------------------|
| 1 | Projex | Completes cohort (milestones, tasks, evaluations) |
| 2 | Projex | *(Optional)* Exports project to Placement profile via **Flow C** |
| 3 | Placement — home / jobs / dedicated nav | Sees **Recommended jobs** for their Placement org |
| 4 | Placement — job listing | Browses matches; opens job detail |
| 5 | Placement | Applies (existing apply flow) |

Projex is not involved after completion unless user uses a “View jobs in Placement” link.

#### API call sequence

| Step | Who | Call | Curl section |
|------|-----|------|--------------|
| 1 | Placement server | `resolveXintSubject(jwt)` → `authx_subject` | [Identity](#identity--what-each-app-actually-has-today) |
| 2 | Placement server | `GET /api/xint/learner/{authx_subject}/portfolio` | [Projex portfolio](#projex--get-apixintlearnerauthx_subjectportfolio) |
| 3 | Placement server | `GET /api/v1/jobs?…` + rank by skills | [Jobs browse](#placement--existing-jobs-browse-flow-a--b) |
| 4 | Browser | Existing job detail + apply | Placement JWT |

No Projex call from browser.

---

### Product behavior

1. **Student completes a cohort in Projex**  
   They finish required milestones, tasks, submissions, and evaluations for a project cohort.

2. **Projex builds a demonstrated skills profile**  
   On completion, Projex aggregates:
   - completed project / cohort
   - domains and technologies (from cohort/project config)
   - skills demonstrated (cohort skills + task/evaluation signals)
   - project role, contribution areas, evaluation outcomes

3. **Placement recommends jobs**  
   On the student screen somewhere (and “Matching your skills” browse), Placement shows:

   > “Based on your recent projects and demonstrated skills, you may be interested in these opportunities.”

   Jobs/internships are ranked by overlap between demonstrated skills and job skills.

6. **Student applies in Placement**  
   View job details → apply using existing Placement flows. Projex is not involved after the handoff.

7. **Repeat on each cohort completion**  
   Each completed cohort appends project experience and refreshes recommendations.

---

### Agreed decisions

1. Receommend jobs after the cohort completions
2. Even the jobs shown are not tied to the Projex or Placement organizations. They are instead linked to the organization the user belongs to in Placement, so the user only sees jobs from their own organization. All we do on top of that is skill matching with the cohorts skills and show the jobs.


### TBD

- Exact completion rule: cohort end date + milestones done vs admin-marked complete vs results published
- Whether Projex shows a “View recommended jobs in Placement” in the cohort screen or there is going to have the dedicated nav option so that they dont have to go in every cohort to see the job and apply for it.
- Are we going to use the skill taxonomy in shipx and projex

---

### Prerequisites (before build)

| App | Item |
|-----|------|
| **Projex** | Cohort skill configuration |

### Flow B — Job matching from profile projects (Placement)

#### User journey

| Step | Where | What the user does |
|------|-------|-------------------|
| 1 | Placement — profile | Views **Projects** (from Flow C export and/or manual add) |
| 2 | Placement — job listings | Opens browse / listing page |
| 3 | Placement — “Match by project” panel | Selects one or more profile projects |
| 4 | Placement — listing | Sees jobs filtered/ranked by selected project skills |
| 5 | Placement — job detail | Views job → applies |

No Projex involved at browse time.

#### API call sequence

All calls internal to Placement — no Projex.

| Step | Who | Call | Curl section |
|------|-----|------|--------------|
| 1 | Browser | `GET /api/v1/user/{email}/profile` | [User profile](#placement--existing-user-profile-flow-b-no-xint) |
| 2 | Browser | `GET /api/v1/jobs?category=matching_skills` (+ filter by selected project skills) | [Jobs browse](#placement--existing-jobs-browse-flow-a--b) |
| 3 | Browser | Existing apply API | Placement JWT |

---

### Context

Projects already live in Placement before the user browses jobs:

- Projex syncs completed (or added) projects → Placement profile **`experiences.project`**
- Placement profile page shows those projects and their skills
- Flow B is **not** “find projects in Projex from a job” — it is **“pick a project from my profile → match jobs”**

---

### Product behaviour

1. **Projects are on the Placement profile**  
   From Projex completion sync (Flow A) and/or manual “add project” in Placement.  
   Profile **Projects** section lists title, skills, domains, technologies, role, etc.

2. **Student opens job listings**  
   Browse / listing page as today.

3. **“Match jobs to my projects” section**  
   On the listing page (sidebar, filter panel, or top section):
   - Lists the user’s profile projects (from Projex + any they added in Placement)
   - User **selects one or more projects** (or “All projects”)
   - Optional: show skills per project on the card

4. **Placement runs skill matching**  
   For the selection:
   - Collect skills (and optionally domains/technologies) from chosen project(s)
   - Compare to each job’s required/preferred skills
   - Rank and filter the listing

5. **Student sees matched jobs**  
   Copy along the lines of:  
   *“Jobs matching skills from [Project name]”*  
   or  
   *“Based on skills from your selected projects…”*

6. **Student views job details → applies**  
   Same apply flow as today. No Projex step in this flow.

### Agreed decisions

| # | Decision |
|---|----------|
| 1 | Job matching from projects happens **entirely in Placement** |
| 2 | User **explicitly selects** which profile project(s) drive matching (not implicit “all skills”) |
| 3 | Profile projects come from **Projex sync + manual add** on Placement |
| 4 | Matching = **project skills ↔ job skills** |
| 5 | **No Projex API call** on listing page for v1 |
| 6 | Apply flow unchanged; recommendations are a **filtered/ranked job list** |

---

### Open questions

1. Single project vs multi-select vs “All projects”?
2. Default selection on first visit — none, most recent Projex project, or all?
4. Show match % and which skills matched on each job card or for what skill it is matched?
5. Include internships + jobs together or separate toggle?
6. Projects with no skills — hide from picker or show with warning?

### Flow C — Export project & skills to Placement profile

#### User journey

| Step | Where | What the user does |
|------|-------|-------------------|
| 1 | Projex | Completes milestone or cohort |
| 2 | Projex — inline sheet/modal | Sees prompt: “Add to Placement profile?” with preview |
| 3 | Projex | Edits summary/skills if needed → **Confirm** (no redirect) |
| 4 | Projex | Toast: “Added to Placement” + optional **View in Placement** link |
| 5 | Placement — profile | Project appears under **Projects** (if user opens link) |
| 6 | Placement — job listings | Same project usable in **Flow B** project picker |

If already exported or manually added in Placement, Projex shows **Already on profile** (reconciled, no duplicate).

#### API call sequence

| Step | Who | Call | Curl section |
|------|-----|------|--------------|
| 1 | Browser | `POST /api/trpc/xint.placement.getExportPreview` | [tRPC — export](#browser--own-app-trpc-examples) |
| 2 | Projex server | `GET /api/v1/xint/profile/projects?…` (reconcile) | [Placement GET projects](#placement--get-apiv1xintprofileprojects-reconcile) |
| 3 | Browser | `POST /api/trpc/xint.placement.exportProject` | [tRPC — export](#browser--own-app-trpc-examples) |
| 4 | Projex server | `POST /api/v1/xint/profile/projects` | [Placement POST projects](#placement--post-apiv1xintprofileprojects-export) |
| 5 | Projex server | Insert `xint_placement_export` row | — |

---

### Product behaviour

1. **Student completes a milestone or project in Projex**  
   System builds an **experience snapshot**: project name, milestone/project summary, skills demonstrated, contributions, contribution areas, completion status.

2. **Projex prompts inline (no redirect)**  
   Sheet/modal/banner in Projex:

   > “You recently completed [milestone/project] and demonstrated new skills. Add this to your Placement profile?”

   User sees a **preview** of what will be added (project block + suggested skills). They can edit before confirming.

3. **User confirms → Placement is updated via API**  
   Projex calls Placement in the background. User **stays in Projex**. Success toast: “Added to Placement profile” with optional **“View in Placement”** link (opens Placement profile in new tab — only external navigation, not required for the add flow).

4. **Projex records export state**  
   After success, Projex marks this cohort/milestone as **exported** for this user. UI changes to “Added to Placement” (disabled or link-only). User cannot add the same export twice.

5. **User can also add manually in Placement**  
   Same project data can be entered on the Placement profile page. Placement stores it in `experiences.project`.

6. **Reconciliation when Projex doesn’t know yet**  
   Before showing “Add to Placement”, Projex checks Placement (or local cache):

   - **Not exported** → show add prompt  
   - **Already in Placement** (added there manually or earlier) → show “Already on your Placement profile” + backfill Projex export record + optional “View profile” link  
   - **Exported from Projex** → show “Added” state  

   No duplicate entries, no confusing re-prompts.

7. **Profile projects feed job matching (Flow B)**  
   Once on Placement profile, those projects power listing-page “match jobs by project” — separate flow, same data.


---

### Information shared

**Projex sends (on confirm)**

| Field | Placement target |
|-------|------------------|
| Project name | `experiences.project.title` |
| Project / milestone summary | `experiences.project.description` |
| Skills demonstrated | `experiences.project.skills` + merge into `attributes.skills` |
| Contributions | description / `meta_data` |
| Contribution areas | `meta_data.contribution_areas` |
| Completion status | `meta_data.completion_status` |

---

### Agreed decisions

| # | Decision |
|---|----------|
| 1 | **Opt-in export** — student confirms; not auto-push on completion |
| 2 | **No redirect required** to add — inline panel in Projex; API does the write |
| 3 | **Projex tracks export state** per user + cohort |
| 4 | **Placement is source of truth** for profile content; Projex stores **link + status** only |
| 5 | **Reconcile on open** — if already in Placement, backfill Projex and show message |
| 6 | **Manual add in Placement allowed** — Projex learns via reconcile, not block |
| 7 | **Links via org config** — Placement base URL + profile path pattern; no hardcoded URLs in components |
| 8 | Optional **“View in Placement”** only — never required to complete export |

### Missing 
1. What if user remove the project from placement. it should reflect here in projex too.

### How this fits the other flows

| Flow | Relationship |
|------|----------------|
| **This flow** | Opt-in, student-driven export → populates Placement profile projects |
| **Flow B (listing)** | Uses those profile projects for job matching — no Projex call at browse time |

___

## Placement <> Mentorship

### Flow A — Career path mentor recommendation

#### User journey

| Step | Where | What the user does |
|------|-------|-------------------|
| 1 | Placement — career path page | Opens a career path (role, skills, org context) |
| 2 | Placement — inline section | Sees **Recommended mentors** (skill-matched, not org-scoped for v0) |
| 3 | Placement | Clicks a mentor card |
| 4 | ShipX — new tab | Lands on mentor profile (AuthX SSO) with career-path context |
| 5 | ShipX | Requests mentorship or books session |
| 6 | Placement — career path / session card *(TBD)* | May show booked session status if reverse sync added |

#### API call sequence

| Step | Who | Call | Curl section |
|------|-----|------|--------------|
| 1 | Placement server | Load career path (existing API) | — |
| 2 | Placement server | `GET /api/xint/mentors?skills=…` | [ShipX mentors](#shipx--get-apixintmentors) |
| 3 | Browser | Open ShipX deep link `xint_source=placement` | [Deep link](#deep-link-browser-navigation-not-curl) |
| 4 | ShipX | Existing book session (internal) | — |
| 5 | Placement server | `GET /api/xint/sessions?…` *(TBD)* | [GET sessions](#shipx--get-apixintsessions) |

---

### Product behaviour

1. **Student opens a career path in Placement**  
   A career path is a target role or track (e.g. “Frontend Developer at TechCorp”) with:
   - target role / category  
   - relevant skills  
   - associated organization(s) (employers or partner orgs for that path)

2. **Placement requests mentors from Mentorship (ShipX)**  
   For now, mentors are **not** scoped by organisation. They are fetched by **skill match** against the career path, then shown in the recommendation section. Organisation-based scoping is deferred pending feasibility review.

3. **Placement shows “Recommended mentors”**  
   Inline on the career path page:

   > “Mentors who can help you on this career path”

   Cards show name, org, skills, and a short bio. There is no booking in Placement.

4. **Student clicks a mentor → redirect to Mentorship**

5. **Student continues in Mentorship**  
   View mentor profile → request mentorship or book session (existing ShipX flows).

6. **No cross-app chat or session UI in Placement**  
   Placement only discovers and links. Mentorship owns profile, request, and booking.

---

### Open questions

1. How do we show booked session details on session cards — similar to the Projex ↔ Mentorship pattern — and on the Placement jobs page with details for the booked session?

---

### Cases to consider

1. How do we handle session status changes and reverse sync?

### Flow B — Job-based mentor recommendation

#### User journey

| Step | Where | What the user does |
|------|-------|-------------------|
| 1 | Placement — admin / employer | Creates job, adds required + preferred skills |
| 2 | Placement — job create *(automatic)* | System attaches recommended mentors (saved on job) |
| 3 | Placement — student | Opens job listing → views description |
| 4 | Placement — job page | Sees **Recommended mentors** section (pre-linked at create time) |
| 5 | Placement | Clicks mentor → new tab ShipX |
| 6 | ShipX | Views profile → requests mentorship / books session |
| 7 | Placement — job page *(TBD)* | May show session status on mentor card if reverse sync added |

#### API call sequence

| Step | Who | When | Call | Curl section |
|------|-----|------|------|--------------|
| 1 | Placement server | **Job create** | `GET /api/xint/mentors?skills=…` | [ShipX mentors](#shipx--get-apixintmentors) |
| 2 | Placement server | **Job create** | Save `xint_job_recommended_mentors` on job row | — |
| 3 | Browser | **Student views job** | `GET /api/v1/jobs/{id}` (includes mentor snapshot) | Placement JWT |
| 4 | Browser | **Click mentor** | ShipX deep link `xint_ctx={ jobId, … }` | [Deep link](#deep-link-browser-navigation-not-curl) |
| 5 | ShipX | Booking | Internal session book | — |
| 6 | Placement server | **Status UI** *(TBD)* | `GET /api/xint/sessions?externalRef={jobId}` | [GET sessions](#shipx--get-apixintsessions) |

On job skills edit → re-run step 1 and replace snapshot.

---

### Product behaviour

1. **Mentors are linked at job creation**  
   When an employer or admin creates a job and adds skills, Placement calls Mentorship (ShipX) and resolves mentors whose expertise matches those job skills. The matched mentors are **saved with the job** as its recommended mentor set.

2. **Student explores jobs in Placement**  
   Jobs → open a listing → view the job description.

3. **Placement shows “Recommended mentors” on the job page**  
   The section lists mentors that were attached when the job was created — not computed on each page view:

   > “Mentors who can help you prepare for this role”

   Cards show name, org, skills, and areas of expertise. There is no booking in Placement.

4. **Student clicks a mentor → redirect to Mentorship**

5. **Student continues in Mentorship**  
   View mentor profile → request mentorship or book session (existing ShipX flows).

6. **No cross-app chat or session UI in Placement**  
   Placement only discovers and links. Mentorship owns profile, request, and booking.

### Open questions

1. How do we show booked session details on session cards — similar to the Projex ↔ Mentorship pattern — and on the Placement job page with details for the booked session?

---

### Cases to consider

1. How do we handle session status changes and reverse sync?
2. If job skills are edited after creation, do we **re-fetch and replace** linked mentors, or keep the original set until manually refreshed?

---

## Profiler xint foundation (implemented)

Profiler now supports the base service-to-service xint layer.

### Base URL

`{PROFILER_URL}/api/v1/xint`

### Required headers

```http
X-Xint-Token: <shared token>
X-Xint-Source: placement|projex|shipx
```

### Endpoints

#### `GET /api/v1/xint/health`

Simple connectivity check.

Response:

```json
{
  "ok": true,
  "app": "profiler",
  "source": "placement",
  "version": "v1"
}
```

#### `GET /api/v1/xint/users/resolve`

Resolve a Profiler user from:

- `authx_subject` (preferred), or
- `email` (fallback for Zitadel-only users)

Example:

```bash
curl "$PROFILER_URL/api/v1/xint/users/resolve?authx_subject=$AUTHX_SUBJECT" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: placement"
```

Response:

```json
{
  "user_id": "0432feb7-823e-49d4-bbca-9b3e94b463ae",
  "authx_subject": "380581551362015234",
  "email": "lavanya.pillay@xceleratordemo.com",
  "name": "lavanyapillay",
  "institution_id": "6859f49b-b9b2-4052-ac52-e078222c7ead"
}
```

### Env vars (Profiler)

```bash
XINT_ENABLED=true
XINT_SERVICE_TOKEN=<shared-secret>
XINT_ALLOWED_SOURCES=placement,projex,shipx
XINT_PLACEMENT_URL=https://placement.example.com
XINT_PROJEX_URL=https://projex.example.com
XINT_SHIPX_URL=https://mentorship.example.com
```

### Job ingest (implemented)

Placement handoff (why weightage, templates, what to build): [placement-job-trait-weightage.md](../integrations/placement-job-trait-weightage.md).

Placement (or other xint peers) can push institution-scoped jobs with trait weightages. Jobs appear in the learner portal discover flow automatically (`GET /api/v1/jobs`).

#### `POST /api/v1/xint/jobs`

Idempotent upsert keyed by `(X-Xint-Source, xint_source_ref)`.

Request:

```json
{
  "xint_source_ref": "placement:job:42",
  "title": "Senior Backend Engineer",
  "company_name": "Acme Corp",
  "subtitle": "Bangalore · Full-time",
  "external_url": "https://placement.example.com/jobs/42",
  "status": "active",
  "criteria": {
    "label": "Senior Backend Engineer",
    "traits": [
      { "trait": "conscientiousness", "weight": 1.0 },
      { "trait": "communication", "weight": 0.8 }
    ]
  }
}
```

**Current scope:** Placement should only push **public** jobs. Omit `institution_id` (or send `null`) so the job is visible to all learners — same as seeded demo jobs. College-scoped ingest comes later.

Valid traits: `conscientiousness`, `resilience`, `agency`, `risk_appetite`, `creativity`, `communication`, `collaboration`, `help_seeking` (and any others in the construct register).

Optional fields:

| Field | Purpose |
|-------|---------|
| `institution_id` | Optional UUID. Omit/`null` = public. Set later for college-scoped jobs |
| `company_name` | Shown as the card category line |
| `subtitle` | Short line under title (e.g. location · job type) |
| `external_url` | `https://` link — discover shows **View on Placement** |

Response (`201` on create, `200` on update):

```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "reward_system_id": "xint:placement:job:42",
  "source_app": "placement",
  "xint_source_ref": "placement:job:42",
  "created": true
}
```

Example:

```bash
curl -X POST "$PROFILER_URL/api/v1/xint/jobs" \
  -H "Content-Type: application/json" \
  -H "X-Xint-Token: $XINT_SERVICE_TOKEN" \
  -H "X-Xint-Source: placement" \
  -d '{
    "xint_source_ref": "placement:job:42",
    "title": "Senior Backend Engineer",
    "company_name": "Acme Corp",
    "subtitle": "Bangalore · Full-time",
    "external_url": "https://placement.example.com/jobs/42",
    "status": "active",
    "criteria": {
      "label": "Senior Backend Engineer",
      "traits": [
        { "trait": "conscientiousness", "weight": 1.0 },
        { "trait": "communication", "weight": 0.8 }
      ]
    }
  }'
```

#### `GET /api/v1/xint/jobs/lookup?xint_source_ref=placement:job:42`

Reconcile a previously ingested job from the caller's source.

#### Visibility rules

| `institution_id` on job | Who sees it |
|-------------------------|-------------|
| `NULL` (public / seeded / MVP Placement sync) | All learners |
| Set to institution X (future) | Learners in institution X only |

Platform admins and institution admins see all active jobs when listing via the authenticated jobs API.

#### Career profile refs + batch fit

Placement can ingest both real jobs and career profiles through the same endpoint, differentiated only by `xint_source_ref`:

- `placement:job:{id}` -> learner-visible job target
- `placement:career_profile:{id}` -> scoring-only target (hidden from learner job list/get/fit)

For finder scoring at scale, use `POST /api/v1/xint/fit/batch` (service token auth). This endpoint scores up to 500 emails against one ingested target and returns per-email statuses. Batch flow uses the same scoring math but does not persist per-row `metric_runs`.