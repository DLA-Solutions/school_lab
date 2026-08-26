# Setup deploy — reference

Full runbook: [`docs/guidelines/process/deployment.md`](../../../docs/guidelines/process/deployment.md).

## GHCR packages

Images under `ghcr.io/dla-solutions/`:

| Package | Kamal service | Deploy dir |
|---------|---------------|------------|
| `dla-solutions/scholarpremium-site` | `scholarpremium-site` | `site/` |
| `dla-solutions/scholarpremium-spa` | `scholarpremium-spa` | `frontend/app/` |
| `dla-solutions/scholarpremium-backoffice-spa` | `scholarpremium-backoffice-spa` | `frontend/backoffice/` |
| `dla-solutions/scholarpremium` | `scholarpremium` | `web/` |

Always pass `-d staging` or `-d production`.

## Required env vars

Export on the deploy machine before `kamal deploy`. Interpolated by gitignored `.kamal/secrets*` files.

| Variable | Staging first day | Used for |
|----------|-------------------|----------|
| `KAMAL_REGISTRY_PASSWORD` | yes (own PAT) | GHCR push/pull — not `GITHUB_TOKEN` |
| `JWT_SECRET_KEY_STAGING` | yes (1Password) | API token signing on staging |
| `POSTGRES_PASSWORD` | yes (1Password) | `DATABASE_URL` / `CABLE_DATABASE_URL` |
| `REDIS_PASSWORD` | yes (1Password) | `REDIS_URL` |
| `API_DOCS_USERNAME` | yes (1Password) | HTTP Basic on `/api-docs` (staging) |
| `API_DOCS_PASSWORD` | yes (1Password) | HTTP Basic on `/api-docs` (staging) |
| `POSTMARK_API_TOKEN_STAGING` | yes (1Password) | Transactional mail on staging |
| `GOOGLE_OAUTH_CLIENT_ID` | yes (1Password) | OAuth Web client (must match SPA build) |
| `JWT_SECRET_KEY_PRODUCTION` | preflight only* | Production token signing — from optional 1Password link later |
| `POSTMARK_API_TOKEN_PRODUCTION` | later | Production mail — optional link |

\* `bin/deploy-preflight` checks production secret files and `JWT_SECRET_KEY_PRODUCTION` even when targeting staging. Copy `secrets.production.example`; export production vars when cutting over to prod.

`KAMAL_REGISTRY_USERNAME` is derived via `gh config get -h github.com user` in `secrets-common` — do not export manually.

`RAILS_MASTER_KEY` is read from `web/config/master.key` in API `secrets-common`; site/SPA files include the line but ignore it.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| GHCR / docker `401 Unauthorized` | Wrong token type or missing `write:packages` | Classic PAT with `read:packages` + `write:packages`; not `gh` token or `GITHUB_TOKEN` |
| GHCR `403` on push | No org package write | Confirm `DLA-Solutions` org access; `docker login` with PAT |
| `Secret 'KAMAL_REGISTRY_USERNAME' not found` | Missing `secrets-common` in **current** service dir | `cp .kamal/secrets-common.example .kamal/secrets-common` in that dir |
| `RAILS_MASTER_KEY` empty in `kamal secrets print` | No `web/config/master.key` | Copy from 1Password link to `web/config/master.key` |
| `JWT_SECRET_KEY` empty (staging) | `JWT_SECRET_KEY_STAGING` not exported | Export before `kamal secrets print -d staging` |
| JWT staging = production | Same value in both vars | Generate distinct keys; preflight fails if equal |
| `API_DOCS_*` empty after export | Vars not in `.kamal/secrets.staging` | Copy from `.kamal/secrets.staging.example`; avoid `#` in password |
| `DATABASE_URL` wrong host / connection fail | Special chars in password | URL-encode `POSTGRES_PASSWORD` / `REDIS_PASSWORD` |
| `kamal deploy` targets wrong env | Missing `-d` | Always `kamal … -d staging` or `-d production` |
| `ssh deploy@77.42.33.33` fails | Key not loaded | `ssh-add`; confirm admin added your public key |
| `docker info` fails locally | Docker not running | Start Docker Desktop / daemon |
| `gh config get` empty | Not logged in | `gh auth login` |
| Preflight DNS failure | A record not `77.42.33.33` | Fix DNS before `kamal setup` (Let's Encrypt) |
| DB / Redis preflight fail | Wrong password or DB missing | Verify 1Password values; ops creates databases |

More Kamal/proxy errors: skill `deploy-kamal` → [`troubleshooting.md`](../deploy-kamal/troubleshooting.md).
