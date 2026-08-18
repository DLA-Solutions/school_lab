# Deploy Kamal — checklist

## Local machine

- [ ] SSH key loaded; `ssh deploy@77.42.33.33` works
- [ ] Docker daemon running (`docker info`)
- [ ] `gh auth login` done; `gh config get -h github.com user` returns username
- [ ] `KAMAL_REGISTRY_PASSWORD` exported (classic PAT with `write:packages`)
- [ ] `docker login ghcr.io` succeeds with that token

## Per service directory (before first deploy)

### `site/`, `frontend/app/`, and `frontend/backoffice/`

- [ ] `.kamal/secrets-common` exists (copy from `.example` or from `web/.kamal/secrets-common`)

### `web/`

- [ ] `.kamal/secrets-common` exists
- [ ] `.kamal/secrets.staging` or `.kamal/secrets.production` exists (copy from `.example`)
- [ ] `JWT_SECRET_KEY_STAGING` ≠ `JWT_SECRET_KEY_PRODUCTION`
- [ ] `web/config/master.key` present locally
- [ ] Active Record encryption keys in credentials (first deploy only)
- [ ] `bin/deploy-preflight` passes (recommended)

## Before each deploy

- [ ] Essential CI passed for this layer (see deploy-kamal skill — e.g. `web/bin/backend-ci --full` for API)
- [ ] Correct service directory (`site/`, `frontend/app/`, `frontend/backoffice/`, or `web/`)
- [ ] Correct destination: `-d staging` or `-d production`
- [ ] `kamal secrets print -d <dest>` shows non-empty registry secrets
- [ ] For production: staging smoke-tested first

## After deploy

- [ ] `/` returns site HTML (200)
- [ ] `/app/` returns school SPA (not blank page)
- [ ] `/backoffice/` returns platform SPA (not the site landing)
- [ ] `/up` returns 200 (API health)
- [ ] Smoke stayed read-only — no invite, password reset, or other mailer-triggering requests
- [ ] `kamal-proxy ls` shows four services with expected path prefixes
- [ ] API migration run if schema changed (`kamal app exec ... db:migrate`)
