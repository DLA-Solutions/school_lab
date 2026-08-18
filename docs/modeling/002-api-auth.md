# Data Model — API Authentication (002)

> API conventions: [`docs/api/README.md`](../api/README.md)  
> DB schema: [`docs/database/database_dml.md`](../database/database_dml.md) (`users`, `memberships`, `refresh_tokens`)  
> Identity lifecycle: [`001-fintech-first.md`](001-fintech-first.md) (status, Discard)

Narrative DSL for API token authentication. Complements the DB schema — `refresh_tokens` for
session rotation; `user_identities` for OAuth provider linkage (Google MVP).

## Stack

| Piece | Choice |
|-------|--------|
| Credential validation | **Devise** on `users` (`valid_password?`, reset, lock, confirm) |
| Access token | **JWT** (`jwt` gem), short-lived |
| Refresh token | Random opaque token, **SHA-256 digest** in `refresh_tokens.token_digest` |
| API docs | **rswag** → OpenAPI |
| Serialization | **blueprinter** (provisional — see `open-questions.md`) |

Firebase is used for **FCM push**, not for login.

## Token TTL (UX-oriented)

Designed so families opening the app monthly for boletos stay signed in, and school staff
work through the day without visible session drops.

| Token | TTL | Notes |
|-------|-----|-------|
| **Access (JWT)** | **20 minutes** | Short exposure if leaked |
| **Refresh** | **90 days**, **sliding** | Each successful refresh extends `expires_at` by 90 days |
| **Remember me** | **180 days** sliding | Optional login flag (web checkbox / mobile toggle) |
| **Rotation** | On every refresh | New refresh issued; previous digest invalidated |

Comfort comes from **silent refresh**, not long-lived JWTs.

### Client refresh strategy (required)

```
Login → store access (memory) + refresh (secure storage)
Timer → refresh ~2 minutes before access expiry
App resume → validate / refresh if needed (RN AppState, web visibility API)
401 on request → one retry after refresh; on failure → login screen
Logout → revoke refresh server-side + clear client storage
users.status disabled → refresh fails → forced logout + i18n message
```

## Transport by client

### React web (`frontend/app`)

| Token | Storage |
|-------|---------|
| Access | In-memory (React state / context) — `Authorization: Bearer` |
| Refresh | **httpOnly, Secure, SameSite=Lax cookie** set by `POST /auth/refresh` |

`POST /auth/login` with `client: web` returns access in JSON and sets refresh cookie.
`POST /auth/refresh` reads cookie, returns new access, rotates cookie.

Avoid `localStorage` for refresh tokens (XSS risk).

### React Native (`mobile/`)

| Token | Storage |
|-------|---------|
| Access | Memory |
| Refresh | **Keychain / Keystore** via secure storage library |

`POST /auth/login` and `POST /auth/refresh` return both tokens in JSON body.

## JWT payload (access token)

Minimal claims — **no `school_id`** (user may switch schools):

```json
{
  "sub": "123",
  "iat": 1710000000,
  "exp": 1710001200
}
```

School context comes from the request path `:school_id` + membership check.

## Refresh token record (`refresh_tokens`)

| Column | Use |
|--------|-----|
| `token_digest` | Hash of opaque refresh token (never store raw) |
| `expires_at` | Sliding window end |
| `revoked_at` | Logout, rotation, or `users.status` disabled |
| `user_id` | Owner |

No Discard on `refresh_tokens` — purge rows after `expires_at` or `revoked_at` + short grace.

## OAuth identities (`user_identities`)

Google Sign-In (MVP) links a stable provider subject (`provider_uid` = Google `sub`) to an
existing `users` row. Password credentials on `users` remain the source of truth for
email/password login; OAuth is a parallel front door into the same JWT pipeline.

| Column | Use |
|--------|-----|
| `provider` | `google` (validated in model; extensible later) |
| `provider_uid` | Google `sub` — canonical identity key |
| `email` | Snapshot at link / refresh on login |
| `email_verified` | Last known verification flag from token |
| `linked_at` | First successful link timestamp |
| `last_used_at` | Updated on each successful Google login |

Partial unique indexes: `(provider, provider_uid)` globally; `(user_id, provider)` per user.
No auto-registration — eligibility rules in auth PRD (BR-GO01–BR-GO09) gate login after link.

## Auth endpoints

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/v1/auth/login` | Public |
| `POST` | `/api/v1/auth/oauth/google` | Public — Google ID token |
| `POST` | `/api/v1/auth/refresh` | Refresh token |
| `POST` | `/api/v1/auth/logout` | Access + refresh |
| `POST` | `/api/v1/auth/password` | Public — reset request |
| `PUT` | `/api/v1/auth/password` | Access — change password |
| `GET` | `/api/v1/me` | Access |
| `POST` | `/api/v1/me/device_tokens` | Access — FCM registration |

### Login request

```json
{
  "email": "maria@example.com",
  "password": "secret",
  "remember_me": true,
  "client": "web"
}
```

`client`: `web` | `mobile` — controls refresh transport (cookie vs body).

### Login response (mobile)

```json
{
  "access_token": "eyJ...",
  "access_expires_at": "2026-07-29T18:24:00Z",
  "refresh_token": "opaque...",
  "refresh_expires_at": "2026-10-27T18:04:00Z",
  "user": {
    "id": 1,
    "email": "maria@example.com",
    "memberships": [
      {
        "id": 10,
        "school_id": 42,
        "school_name": "Example School",
        "role": "guardian",
        "status": "active"
      }
    ]
  }
}
```

Web response: same JSON **without** `refresh_token` in body (cookie only).

## Auth evaluation order (per request)

After JWT signature and expiry:

1. `users.discarded_at` → `401` account removed
2. `users.status == disabled` → `401` + revoke all user refresh tokens
3. `users.locked_at` (Devise) → `401` locked
4. For `schools/:school_id` routes:
   - Membership exists, `discarded_at` nil
   - `memberships.status == active` (not `invited` / `suspended`)
5. Pundit policy for role + resource

## Revocation triggers

| Event | Action |
|-------|--------|
| Logout | Revoke current refresh token |
| Refresh rotation | Revoke previous refresh digest |
| `users.status` → disabled | Revoke all user refresh tokens |
| Password change | Revoke all refresh tokens (optional hardening) |
| Discard user | Revoke all refresh tokens |

## Implementation notes (deferred to `web/`)

- `Auth::IssueTokensService`, `Auth::RefreshTokensService`, `Auth::RevokeTokensService`.
- `Api::V1::BaseController` — Bearer parsing, `Current.user`.
- `rack-cors` for web SPA origins.
- `CleanExpiredRefreshTokensJob` on Solid Queue (recurring).

## Open items

- Final legal retention for refresh token audit logs — pending LGPD counsel.
- Whether password change must revoke all sessions — default **yes** for security.
