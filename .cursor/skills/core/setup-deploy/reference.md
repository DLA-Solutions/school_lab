# Setup deploy — reference

Full runbook: [`docs/guidelines/process/deployment.md`](../../../docs/guidelines/process/deployment.md). First-day steps: [`SKILL.md`](SKILL.md). After this file is green, skills **`deploy-staging`** / **`deploy-production`** — do not duplicate that workflow here.

Branch vs destination (rule `deploy-environment-branches`):

| Flag | Required Git branch | Must match |
|------|---------------------|------------|
| `-d staging` | `staging` | `origin/staging` |
| `-d production` | `main` | `origin/main` |

Feature branches never deploy. First-day onboarding targets **staging**.

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

Export on the deploy machine before `kamal deploy`. Interpolated by gitignored `.kamal/secrets*` files. Keep them in the **same shell** as Kamal (they vanish when the terminal closes).

| Variable | Staging first day | Used for |
|----------|-------------------|----------|
| `KAMAL_REGISTRY_PASSWORD` | yes (own classic PAT) | GHCR push/pull — not `GITHUB_TOKEN`, not the GitHub MCP PAT |
| `JWT_SECRET_KEY_STAGING` | yes (1Password) | API token signing on staging |
| `POSTGRES_PASSWORD` | yes (1Password) | `DATABASE_URL` / `CABLE_DATABASE_URL` |
| `REDIS_PASSWORD` | yes (1Password) | `REDIS_URL` |
| `API_DOCS_USERNAME` | yes (1Password) | HTTP Basic on `/api-docs` (staging) |
| `API_DOCS_PASSWORD` | yes (1Password) | HTTP Basic on `/api-docs` (staging) |
| `POSTMARK_API_TOKEN_STAGING` | yes (1Password) | Transactional mail on staging |
| `GOOGLE_OAUTH_CLIENT_ID` | yes (1Password) | OAuth Web client (must match SPA build) |
| `JWT_SECRET_KEY_PRODUCTION` | yes (preflight)* | Production token signing — distinct from staging |
| `POSTMARK_API_TOKEN_PRODUCTION` | later | Production mail — optional 1Password link |

\* `bin/deploy-preflight` checks that `web/.kamal/secrets.production` exists **and** that `JWT_SECRET_KEY_PRODUCTION` is set and ≠ `JWT_SECRET_KEY_STAGING`, even when you will only deploy staging. Copy `secrets.production.example`. Export that one production JWT so preflight passes. Do not run `-d production` until QA says so.

`KAMAL_REGISTRY_USERNAME` is derived via `gh config get -h github.com user` in `secrets-common` — do not export it manually.

`RAILS_MASTER_KEY` is read from `web/config/master.key` in API `secrets-common`; site/SPA files include the line but ignore it.

URL-encode `@`, `:`, `/`, `?`, and `#` in `POSTGRES_PASSWORD` / `REDIS_PASSWORD`. A literal special character breaks `DATABASE_URL` parsing and looks like a wrong host.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ssh deploy@77.42.33.33` fails | Public key not on the server | Stop. Send `cat ~/.ssh/id_ed25519.pub` to admin; do not continue onboarding |
| GHCR / docker `401 Unauthorized` | Wrong token type or missing `write:packages` | Classic PAT (`read:packages` + `write:packages`) at https://github.com/settings/tokens — not `gh` token, not `GITHUB_TOKEN` |
| GHCR `403` on push | No org package write | Confirm `DLA-Solutions` org access; `docker login` with the PAT |
| `Secret 'KAMAL_REGISTRY_USERNAME' not found` | Missing `secrets-common` in **current** service dir | From repo root: `cp <dir>/.kamal/secrets-common.example <dir>/.kamal/secrets-common` |
| `RAILS_MASTER_KEY` empty in `kamal secrets print` | No `web/config/master.key` | Copy from 1Password to `web/config/master.key` |
| `JWT_SECRET_KEY` empty (staging) | `JWT_SECRET_KEY_STAGING` not exported in **this** shell | Export before `(cd web && kamal secrets print -d staging)` |
| JWT staging = production | Same value in both vars | Generate distinct keys; preflight fails if equal |
| `$JWT_SECRET_KEY_PRODUCTION nao definida` | Preflight requires it even for staging | Export a distinct production JWT; still no production deploy |
| `API_DOCS_*` empty after export | Vars not in `.kamal/secrets.staging` | Copy from `.kamal/secrets.staging.example`; avoid `#` in password |
| `DATABASE_URL` wrong host / connection fail | Special chars in password | URL-encode `POSTGRES_PASSWORD` / `REDIS_PASSWORD` |
| `kamal nao encontrado no PATH` | Gem or binstub not on PATH | `gem install kamal`, or `(cd web && bundle install)` and `export PATH="$PWD/web/bin:$PATH"` |
| `kamal deploy` targets wrong env | Missing `-d` or wrong git branch | `-d staging` from branch `staging`; `-d production` from `main` |
| `docker info` fails locally | Docker not running | Start Docker Desktop / daemon |
| `gh config get` empty | Not logged in | `gh auth login` then `gh auth status` |
| Preflight DNS failure | A record not `77.42.33.33` | Fix DNS before `kamal setup` (Let's Encrypt) |
| DB / Redis preflight fail | Wrong password or DB missing | Verify 1Password values; ops creates databases |

More Kamal/proxy errors: skill `deploy-kamal` → [`troubleshooting.md`](../deploy-kamal/troubleshooting.md).

**Ready** → skill **`deploy-staging`** or **`deploy-production`**.
