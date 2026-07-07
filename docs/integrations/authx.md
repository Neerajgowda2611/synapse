# AuthX Integration — Profiler

How profiler integrates with AuthX (Xcelerator's own better-auth OIDC IdP) as a second identity source alongside Zitadel. Zitadel remains fully functional; AuthX is enabled per-environment via a single flag.

Same architectural shape as `edx-app` + `edx-backend` on branch `feat/authx` — profiler's port lives on `feat/authx-integration`.

---

## What we built

A "Sign in with Xcelerator" flow that:
1. Uses AuthX (OIDC / PKCE) — no password proxying.
2. JIT-creates a profiler `users` row with role = `learner` on first login when the email isn't already provisioned.
3. Coexists with Zitadel behind an env flag — flipping the flag switches identity providers without a code change.

---

## Design decisions

| Question | Decision |
|----------|----------|
| Flow style | Standard OIDC redirect with PKCE (browser → AuthX login page → callback). |
| Migration approach | Additive. Zitadel code stays untouched. AuthX gated by `ENABLE_AUTHX` (backend) / `NEXT_PUBLIC_ENABLE_AUTHX` (frontend). |
| User linking key | `authx_sub` (UUID). New nullable column parallel to `zitadel_sub`. |
| First-login behavior | **JIT-create.** New users get a fresh `users` row + one `user_roles` row with role = `learner`, `institution_id = NULL`. Admins can adjust the role afterwards. |
| Token model | **Two tokens.** AuthX id_token is used once to bootstrap; backend mints an internal profiler access token (HS256, TTL 24h) used for all API calls. |
| JWT signing key | HS256 with `AUTHX_CLIENT_SECRET` as the key. Works because AuthX (better-auth) signs OIDC tokens with the OAuth client secret for confidential clients. |
| Schema migration | GORM `AutoMigrate` — column added by declaring `AuthxSub *string` on the `User` struct. No raw SQL migration file. |

---

## Feature flag

```ts
// frontend/lib/authx-config.ts
export const isAuthxEnabled = process.env.NEXT_PUBLIC_ENABLE_AUTHX === "true"
```

```go
// backend/configs/config.go
EnableAuthx bool // ENABLE_AUTHX=true|false, defaults to false
```

When `false`, both apps behave exactly as they did before AuthX (Zitadel-only).

---

## Environment variables

### Backend (`profiler/backend/.env`)

| Var | Example | Purpose |
|-----|---------|---------|
| `ENABLE_AUTHX` | `true` | Master flag. If false, AuthX code paths short-circuit. |
| `AUTH_IDP_URL` | `https://authx-demo.xceleratordemo.in` | AuthX base URL. Used for OIDC discovery + refresh. |
| `AUTHX_CLIENT_ID` | `client_5ggxlbeic0xzejxwm2xlsl` | OAuth client ID. Used as JWT `aud` check. |
| `AUTHX_CLIENT_SECRET` | (secret) | HS256 signing key for AuthX id_tokens AND for the profiler-minted internal access token. |

When `ENABLE_AUTHX=true`, all three AUTHX_* vars are required or startup fails with a clear error. All `ZITADEL_*` vars are still required regardless (Zitadel remains the default path).

### Frontend (`profiler/frontend/.env`)

| Var | Scope | Purpose |
|-----|-------|---------|
| `NEXT_PUBLIC_ENABLE_AUTHX` | Client | UI toggle. When `true`, `/login` renders the AuthX sign-in card. |
| `NEXT_PUBLIC_AUTH_IDP_URL` | Client | Public IdP URL for the browser authorize redirect. |
| `NEXT_PUBLIC_AUTHX_CLIENT_ID` | Client | Client ID for the browser authorize URL. |
| `NEXT_PUBLIC_APP_URL` | Client | Base URL — used to build the OAuth `redirect_uri`. |
| `AUTH_IDP_URL` | Server (BFF) | IdP URL for server-side token exchange. |
| `AUTHX_CLIENT_ID` | Server (BFF) | Client ID for server-side token exchange. |
| `AUTHX_CLIENT_SECRET` | Server (BFF) | Client secret for server-side token exchange. |

`AUTHX_CLIENT_SECRET` is **never** exposed to the browser — the token exchange happens in a Next.js Route Handler (BFF).

---

## Auth flow (AuthX mode)

```mermaid
sequenceDiagram
    participant User
    participant FE as Frontend (/login)
    participant IDP as AuthX (authx-demo.xceleratordemo.in)
    participant BFF as Frontend BFF (/api/auth/authx/*)
    participant BE as Profiler Backend (:8080)
    participant DB as Profiler DB

    User->>FE: Visit /login → sees "Sign in with Xcelerator" button
    User->>FE: Click the button
    FE->>FE: beginAuthxLogin() — PKCE + state → sessionStorage
    FE->>IDP: 302 to /api/auth/oauth2/authorize?client_id=...&code_challenge=...
    User->>IDP: Enter credentials on AuthX login page
    IDP-->>FE: 302 to /auth/callback?code=...&state=...
    FE->>BFF: POST /api/auth/authx/token { code, codeVerifier }
    BFF->>IDP: GET /api/auth/.well-known/openid-configuration
    BFF->>IDP: POST token_endpoint (grant_type=authorization_code + client_secret)
    IDP-->>BFF: { access_token, id_token, refresh_token }
    BFF-->>FE: { id_token, refresh_token, ... }
    FE->>BE: POST /api/v1/auth/authx/session-token { id_token }
    BE->>BE: ParseAuthxIDToken — HS256 with client_secret, aud check, sub is UUID

    BE->>DB: SELECT users WHERE authx_sub = $sub
    alt matched by authx_sub
        BE->>DB: SELECT active user_roles for user
        opt no active role
            BE->>DB: INSERT user_roles (role='learner', status='active')
        end
    else no sub match
        BE->>DB: SELECT users WHERE email = $email
        alt matched by email
            BE->>DB: UPDATE users SET authx_sub=$sub WHERE authx_sub IS NULL
            opt no active role
                BE->>DB: INSERT user_roles (role='learner', status='active')
            end
        else no email match
            BE->>DB: INSERT users (id, authx_sub, email, name) + user_roles (role='learner')
        end
    end

    BE->>BE: MintProfilerAccessToken(user, role) — HS256, TTL 24h, token_type=profiler_access
    BE-->>FE: { access_token, expires_in, token_type: Bearer }
    FE->>FE: Store access_token in localStorage → /dashboard

    Note over FE,BE: Subsequent API calls use the profiler access token
    FE->>BE: GET /api/v1/auth/me (Bearer <profiler_access_token>)
    BE->>BE: Validator tries profiler HS256 path first; falls back to Zitadel JWKS
    BE->>DB: Resolver — sub is users.id (fast path via ProfilerUserID)
    BE-->>FE: AuthContext
```

**Refresh flow.** Frontend calls backend `POST /api/v1/auth/authx/refresh-session` with the AuthX refresh_token. Backend hits AuthX discovery + `token_endpoint` (`grant_type=refresh_token`), takes the fresh `id_token` (or falls back to `userinfo_endpoint` when the response is a rotated access token only), re-runs `EnsureAuthxUser`, and mints a new profiler access token.

**Only failure surfaced back to the UI:** `authx_sub_mismatch` — an email row is already linked to a different AuthX sub. Everything else results in a successful login (JIT paths).

---

## Backend changes (`profiler/backend`)

### Config — `configs/config.go` (modified)

- Added: `EnableAuthx`, `AuthIdpUrl`, `AuthxClientID`, `AuthxClientSecret`.
- In `Load()`: reads `ENABLE_AUTHX`, `AUTH_IDP_URL`, `AUTHX_CLIENT_ID`, `AUTHX_CLIENT_SECRET`.
- If `EnableAuthx == true`, requires all three AUTHX_* vars (startup errors listing missing ones).
- Zitadel vars remain required unconditionally.

### `internal/auth/authx_config.go` (new)

```go
type AuthxConfig struct {
    Enabled      bool
    AuthIdpUrl   string
    ClientID     string
    ClientSecret string
}
```

### `internal/auth/authx_idtoken.go` (new)

- `type AuthxIDTokenClaims struct { Sub, Email, Name string }`
- `ParseAuthxIDToken(ctx, rawToken, cfg) (*AuthxIDTokenClaims, error)`:
  - Verify signature: HS256 with `[]byte(cfg.ClientSecret)`.
  - Reject any token whose `token_type == "profiler_access"` (our own minted tokens must not sneak in through this path).
  - Verify `aud` matches `cfg.ClientID`.
  - `sub` must parse as a UUID.
  - `email` must be non-empty (lowercased on the way out).
  - `name` falls back to `preferred_username` when absent.

### `internal/auth/authx_token.go` (new)

Mints AND parses the internal profiler access token.

- `const ProfilerAccessTokenType = "profiler_access"`
- `const profilerAccessTokenTTL = 24 * time.Hour`
- `MintProfilerAccessToken(user *model.User, primary model.UserRole, cfg AuthxConfig) (token string, expiresIn int64, err error)` — claims:
  ```
  sub            = user.ID (UUID)
  iat            = now
  exp            = now + 24h
  aud            = cfg.ClientID
  email          = user.Email
  name           = user.Name
  token_type     = "profiler_access"
  role           = primary.Role (if non-empty)
  institution_id = primary.InstitutionID (if set)
  ```
- `ParseProfilerAccessToken(ctx, rawToken, cfg) (*Claims, error)` — HS256 verify, rejects anything with `token_type != "profiler_access"`. Populates `Claims.ProfilerUserID = Claims.Sub` — the resolver uses this to bypass the IdP-sub lookup on subsequent API calls.

### `internal/auth/authx_resolver.go` (new)

`EnsureAuthxUser(ctx, userRepo, claims *AuthxIDTokenClaims) (*model.User, []model.UserRole, error)`:

1. `GetWithRolesByAuthxSub(claims.Sub)`. If found, return user + roles. If found with no active roles, JIT-add a `learner` role.
2. Else `GetWithRolesByEmail(claims.Email)`:
   - If found and `authx_sub` is set to a **different** sub → `ErrAuthxSubMismatch`.
   - If found and `authx_sub` is NULL → stamp `authx_sub`.
   - If active roles are empty → JIT-add a `learner` role.
3. Else → JIT-create `users` row (id = uuid.New(), authx_sub, email, name, status="active") + `user_roles` row (role=`learner`, status="active", institution_id=NULL), atomically.

`ErrAuthxSubMismatch` is the only failure surfaced from this function — everything else results in a successful ensure.

### `internal/auth/authx_session_service.go` (new)

- `NewAuthxSessionService(userRepo *repository.UserRepository, cfg AuthxConfig) *AuthxSessionService`
- `ExchangeSessionToken(ctx, idToken string) (*SessionTokenResponse, error)`:
  - `ParseAuthxIDToken` → `EnsureAuthxUser` → `MintProfilerAccessToken`.
- `RefreshSession(ctx, refreshToken string) (*SessionTokenResponse, error)`:
  1. Fetch `${AUTH_IDP_URL}/api/auth/.well-known/openid-configuration`.
  2. `POST discovery.token_endpoint` with `grant_type=refresh_token`, `client_id`, `client_secret`.
  3. If response has `id_token` → `ParseAuthxIDToken`. Else → fetch `discovery.userinfo_endpoint` with the new `access_token`.
  4. `EnsureAuthxUser` → `MintProfilerAccessToken`.
- `SessionTokenResponse = { access_token, expires_in, refresh_token?, token_type: "Bearer" }`.

### `internal/handler/authx_handler.go` (new)

- `POST /api/v1/auth/authx/session-token` — body `{ id_token }` → 200 `SessionTokenResponse`, or 401 with `{ error: "user_not_provisioned" | "authx_sub_mismatch" | "authentication_failed" }`.
- `POST /api/v1/auth/authx/refresh-session` — body `{ refresh_token }` → same response shape.
- Both return 503 `{ error: "authx is not enabled" }` when the flag is off.

### `internal/auth/validator.go` (modified)

- Added `Claims.ProfilerUserID string`. Set only for profiler-minted tokens.
- Added `WithAuthx(cfg AuthxConfig) *Validator` to install AuthX config on the existing validator.
- `Validate()` tries `ParseProfilerAccessToken` first when AuthX is enabled (cheap HS256 verify), then falls back to the Zitadel JWKS path unchanged.

### `internal/auth/resolver.go` (modified)

- `Resolve()`: when `claims.ProfilerUserID != ""`, load the user directly via `GetWithRolesByID` and skip the IdP-sub / email-JIT lookup — the profiler token already carries the primary key.
- `pickPrimaryRole()`: added a `len(roles) == 0` guard that returns `model.UserRole{Role: RoleLearner}` as a safe default instead of panicking on `roles[0]`.

### `internal/model/models.go` (modified)

```go
type User struct {
    ID         uuid.UUID
    ZitadelSub *string `gorm:"uniqueIndex"`
    AuthxSub   *string `gorm:"uniqueIndex"`  // added
    Email      string
    // ...
}
```

The column and unique index are created by GORM `AutoMigrate` on backend startup (`pkg/database/database.go` — same mechanism the rest of the platform tables use).

### `internal/repository/user_repository.go` (modified)

Added:

- `GetWithRolesByAuthxSub(ctx, sub string) (*model.User, []model.UserRole, error)`
- `GetWithRolesByID(ctx, id uuid.UUID) (*model.User, []model.UserRole, error)`
- `LinkAuthxSub(ctx, userID uuid.UUID, sub string) error`
- `CreateAuthxUserWithRole(ctx, user, role) error` — atomic user + role insert.
- `AddRole(ctx, role) error` — role-only insert (existing user).

### App wiring — `internal/app/app.go`, `internal/handler/router.go` (modified)

- Build `AuthxConfig` from `cfg`.
- Call `validator = validator.WithAuthx(authxCfg)`.
- Instantiate `AuthxSessionService`.
- Register `POST /api/v1/auth/authx/session-token` + `POST /api/v1/auth/authx/refresh-session`.
- Log `AuthX enabled` / `AuthX disabled` at startup.

### Files intentionally left alone

- `internal/auth/zitadel_login.go` (Zitadel Session API password login).
- `internal/handler/auth_login_handler.go` (`Login`, `TokenExchange` endpoints).
- Casbin `authz/` package (RBAC is downstream of auth resolution).

---

## Frontend changes (`profiler/frontend`)

### `lib/authx-config.ts` (new)

Two-line helper exporting `isAuthxEnabled` from `NEXT_PUBLIC_ENABLE_AUTHX`.

### `lib/auth/authx.ts` (new)

- `generateCodeVerifier()` / `generateCodeChallenge(verifier)` — PKCE helpers using `crypto.subtle`.
- `getAuthxRedirectUri(origin?)` → `${NEXT_PUBLIC_APP_URL}/auth/callback`.
- `beginAuthxLogin()` — stores verifier + state in `sessionStorage`, sets `window.location.href` to `${AUTH_IDP_URL}/api/auth/oauth2/authorize?...`.
- `peekAuthxCallbackState(searchParams)` / `clearAuthxCallbackState()` — callback state helpers.
- `exchangeAuthxCode(code, codeVerifier)` — POST to BFF `/api/auth/authx/token`.
- `refreshAuthxToken(refreshToken)` — POST to BFF `/api/auth/authx/refresh`.

Storage keys (defined in `lib/config.ts`):
- `authx_code_verifier`
- `authx_oauth_state`
- `authx_flow`
- `authx_refresh_token`

### `lib/auth/session-token.ts` (new)

- `exchangeAuthxSessionToken(idToken)` → `POST ${appConfig.apiUrl}/api/v1/auth/authx/session-token`.
- `refreshAuthxSession(refreshToken)` → `POST ${appConfig.apiUrl}/api/v1/auth/authx/refresh-session`.

### `app/api/auth/authx/token/route.ts` (new)

Next.js Route Handler (server-only). Steps:

1. Guard: `isAuthxEnabled` + all three server env vars present.
2. Fetch `${AUTH_IDP_URL}/api/auth/.well-known/openid-configuration`.
3. `POST discovery.token_endpoint` with `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`, `code_verifier`.
4. Return `{ id_token, refresh_token, expires_in, token_type }` to the browser. `access_token` is deliberately NOT forwarded — the browser needs the JWT id_token, not AuthX's opaque access token.

### `app/api/auth/authx/refresh/route.ts` (new)

Same shape as `token/route.ts` but with `grant_type=refresh_token`.

### `components/authx-sign-in.tsx` (new)

Rendered by `/login` when `isAuthxEnabled`. Renders a card with:
- Profiler branding.
- Error banner driven by `?error=...` query param (maps `user_not_provisioned`, `authx_sub_mismatch`, `authx_failed`, `auth_failed` to friendly messages).
- A **"Sign in with Xcelerator"** button. On click, calls `beginAuthxLogin()`. The button disables and shows "Redirecting…" during the redirect.

No auto-redirect, no sessionStorage lock — the button click is the user's explicit intent.

### `components/authx-callback.tsx` (new)

Client component with a module-level `Promise` guard against React StrictMode double-invocation.

1. `peekAuthxCallbackState(searchParams)` → `{ code, codeVerifier }` or bail to `/login`.
2. `exchangeAuthxCode(code, codeVerifier)` → `{ id_token, refresh_token }`.
3. `exchangeAuthxSessionToken(id_token)` → `{ access_token, expires_in }`.
4. `setAccessToken(access_token)`; store `refresh_token` under `authx_refresh_token`.
5. `clearAuthxCallbackState()`; `router.replace("/dashboard")`.

Errors: bounce to `/login?error=user_not_provisioned` or `/login?error=authx_failed`.

### `app/login/page.tsx` (modified)

```tsx
export default function LoginPage() {
  if (isAuthxEnabled) return <Suspense><AuthxSignIn /></Suspense>
  return <Suspense><LoginForm /></Suspense>  // Zitadel form path
}
```

### `app/auth/callback/page.tsx` (modified)

The file already existed for Zitadel. Modified to branch on the flag:

```tsx
{isAuthxEnabled ? <AuthxCallback /> : <AuthCallback />}
```

### `lib/config.ts` (modified)

Added the AuthX storage keys (`AUTHX_REFRESH_TOKEN_KEY`, `AUTHX_CODE_VERIFIER_KEY`, `AUTHX_OAUTH_STATE_KEY`, `AUTHX_FLOW_KEY`). Existing Zitadel keys and `appConfig.redirectPath` are unchanged.

### Files intentionally left alone

- `app/api/auth/callback/zitadel/page.tsx` (Zitadel callback route).
- `components/auth-callback.tsx` (Zitadel callback logic).
- `contexts/`, `hooks/`, `proxy.ts`.

---

## Schema migration

Column is added by adding `AuthxSub *string` with `gorm:"uniqueIndex"` to the `User` model. Backend startup calls `db.AutoMigrate(&model.User{}, ...)` in `pkg/database/database.go`, which adds the column + unique index to Postgres if absent. No SQL migration file exists — the profiler backend's existing convention is code-managed schema.

The unique index is standard `UNIQUE`, not partial. Rows with `NULL authx_sub` (Zitadel-only users) don't conflict because Postgres treats NULL as distinct in unique indexes.

---

## First-login behavior (JIT-create)

For a user whose email is NOT already in the profiler DB:

1. User visits `/login`, clicks "Sign in with Xcelerator".
2. Redirected to AuthX, signs in.
3. Callback → `/api/v1/auth/authx/session-token` → `EnsureAuthxUser`.
4. Backend inserts a new `users` row (id = uuid.New(), authx_sub, email, name) and a `user_roles` row (role = `learner`, institution_id = NULL) atomically.
5. Mints access token, user lands on `/dashboard` → routes to `/portal` (learner user_type).

For a user whose email IS already in the profiler DB (pre-provisioned by an admin, or created by a prior Zitadel login):

1. Same first three steps.
2. Backend finds the row by email, stamps `authx_sub`. If no active `user_roles` row exists, adds a `learner` role.
3. User lands on the route their primary role maps to (`/platform`, `/admin`, or `/portal`).

An admin can adjust the JIT-assigned learner role by updating `user_roles` directly (e.g., promoting to `institution_admin` and setting `institution_id`).

---

## Testing checklist

- [x] `ENABLE_AUTHX=false` — Zitadel form still works end-to-end.
- [x] `ENABLE_AUTHX=true` + pre-provisioned users row (e.g., `lavanya.pillay@xceleratordemo.com`) — `/login` → AuthX → `/dashboard`. `authx_sub` gets populated.
- [ ] `ENABLE_AUTHX=true` + brand-new AuthX user (no email match) — `/login` → AuthX → `/dashboard` as a learner. New rows appear in `users` + `user_roles`.
- [ ] Second login for same user — no writes, straight to `/dashboard`.
- [ ] User exists linked to sub A, another AuthX user with the same email tries to sign in — `/login?error=authx_sub_mismatch`.
- [ ] Refresh — profiler access token expires (or delete from localStorage), refresh-session mints a new one without re-login.
- [ ] Casbin/RBAC — an `institution_admin` user only sees their institution's data.
- [ ] React StrictMode double-render doesn't double-consume the OAuth code (module-level `Promise` guard in `authx-callback.tsx`).

---

## Rollback

Set both flags to `false` and restart:

- Backend: `ENABLE_AUTHX=false` in `profiler/backend/.env`.
- Frontend: `NEXT_PUBLIC_ENABLE_AUTHX=false` in `profiler/frontend/.env`.

No AuthX code paths execute when the flag is off. The `authx_sub` column stays in the schema (nullable, harmless) — dropping it would require removing the field from the User model and restarting. Zitadel users are unaffected either way.

---

## Out of scope

- Multi-tenant AuthX (multiple `AUTHX_CLIENT_ID`s per deployment).
- AuthX admin UI inside profiler.
- Migrating existing Zitadel users to AuthX (would need a one-time script mapping `zitadel_sub → authx_sub` by email).
- SSO between profiler and other Xcelerator apps (handled implicitly by AuthX being a shared IdP).
