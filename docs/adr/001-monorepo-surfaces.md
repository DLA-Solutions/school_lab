# ADR 001 — Monorepo surfaces

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-10 |
| **Supersedes** | — |

## Context

School Lab has three product clients and one backend:

- **DLA operators** (backoffice actor) — register schools, white-glove provisioning, platform support.
- **School staff** (owner, secretary, coordination, direction) — day-to-day school operations on web.
- **Teachers and guardians** — primarily mobile; guardian web is phase 2.

Today the monorepo layout does not mirror those surfaces:

| Today | Problem |
|-------|---------|
| `app/` = React Native | Collides with URL `/app` and “school app” |
| `frontend/` = single SPA at `/app` | Backoffice (schools list, provisioning wizard) ships in the same bundle as the school product |
| `web/` = API only | Name is fine; holds server-side platform concerns |

Docs partially reference `frontend/app`, but the tree is a flat `frontend/` with `src/` —
another naming drift.

We need folder names, public URLs, and actors to align before backoffice grows further inside
the school SPA.

## Decision

Adopt a **three-client, one-backend** layout. Each client is a separate deployable surface;
all consume the same `/api/v1` with no duplicated business rules.

### Target tree

```
school_lab/
├── mobile/                 # React Native (ex-app/)
├── frontend/
│   ├── app/                # School SPA → public path /app
│   ├── backoffice/         # Platform SPA → public path /backoffice
│   ├── design-system-docs/ # Design system catalog build (shared reference)
│   └── base/               # Upstream template — reference only
├── packages/
│   └── design-tokens/      # Shared color/shadow tokens (SPA + mobile)
├── web/                    # Rails API, jobs, mailers, future Flipper/Sidekiq UI
├── site/                   # Static landing → /
└── docs/
```

### URL map (same host)

| Path | Folder | Kamal service (target) | Actor |
|------|--------|------------------------|-------|
| `/` | `site/` | `scholarpremium-site` | Public |
| `/app/*` | `frontend/app/` | `scholarpremium-spa` | School staff (and shared web flows below) |
| `/backoffice/*` | `frontend/backoffice/` | `scholarpremium-backoffice-spa` | Backoffice (DLA) |
| `/api/*`, `/up`, … | `web/` | `scholarpremium` | API |

### Surface responsibilities

| Surface | Scope | Examples |
|---------|-------|----------|
| `frontend/app` | Users **inside** a school | Dashboard, people, academics, school billing, `/invite/accept`, `/onboarding/owner` |
| `frontend/backoffice` | Users **operating the platform** | `/schools`, `/schools/:id/provisioning`, future platform billing |
| `mobile` | Native app | Teachers, guardians; school staff where mobile applies |
| `web` | Business rules + server infra | Services, policies, jobs, integrations; optional Rails-mounted ops UI (Flipper) |

**Invite accept** stays in `frontend/app` — the invitee is a school user, not DLA.

### Authentication (web)

1. **Single sign-in UI** in `frontend/app` at `/authentication/signin` (initial implementation).
2. **Post-login redirect by role:**
   - Active `backoffice` membership → `/backoffice/` (platform home).
   - School staff → `/app/` (school dashboard).
   - Onboarding guards (invited, pending handoff owner) stay in `/app` paths.
3. **Refresh token cookie** — set with explicit `path: '/'` so both `/app` and `/backoffice`
   SPAs on the same host can call `/api/v1/auth/refresh` with `credentials: 'include'`.

Backoffice may add its own sign-in later for fully independent deploy; not required for MVP split.

### Backoffice routing convention

URL paths in the backoffice SPA use **English** segments (`/schools`, `/provisioning`) aligned
with API and repository conventions. Product UI strings remain pt-BR via i18n/locale files.

The school SPA may keep Portuguese path segments where already shipped (`/pessoas`, etc.).

### Shared code

- Keep `packages/design-tokens` at the monorepo root (already shared).
- Defer `packages/api-client` (or `frontend/packages/shared`) until the third stable
  duplication of fetch/auth/types — copy minimal client into `frontend/backoffice` first.

### Flipper and ops UI

Feature flags and internal ops panels live in `web/` (Rails-mounted routes), not in either SPA.

## Consequences

### Positive

- Folder, URL, and actor map cleanly; no `app/` vs `/app` ambiguity.
- Backoffice is a visible product surface — not hidden behind school nav and guards.
- Independent deploy and bundle for platform vs school web.
- Same API and service layer; clients stay thin.

### Negative / trade-offs

- Two MUI/Vite builds in CI and Kamal (acceptable for product separation).
- Theme and API client may be duplicated briefly between SPAs before extraction.
- Large chore PRs: `frontend/` → `frontend/app/`, `app/` → `mobile/`, docs and Cursor rules.

### Neutral

- Guardian web (phase 2) will likely extend `frontend/app` or add a sibling SPA — out of scope
  for this ADR.

## Migration

Phases **0–4** are **done** in the tree (school SPA at `frontend/app/`, backoffice at
`frontend/backoffice/`, Kamal `/backoffice`, UI split, staging deploy + refresh cookie `path: '/'`).
Remaining work:

| Phase | Work | Branch type | Status |
|-------|------|-------------|--------|
| 0 | ADR + anchor doc updates | `docs/` | Done |
| 1 | `frontend/` → `frontend/app/` | `chore/` | Done |
| 2 | Scaffold `frontend/backoffice/` + Kamal `/backoffice` | `feature/` | Done |
| 3 | Move schools + provisioning UI; clean school SPA; post-login redirect | `feature/` | Done |
| 4 | Staging deploy + cookie path fix in `web/` | `feature/` or `fix/` | Done |
| 5 | `app/` → `mobile/` | `chore/` | Done |
| 6 | Optional `packages/api-client` | `chore/` or `refactor/` | Pending |

## References

- `docs/actors-and-surfaces.md`
- `docs/web-stack.md` §2–4
- `docs/product-map.md` §1–2
- `docs/guidelines/process/deployment.md`
