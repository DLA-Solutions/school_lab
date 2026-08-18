---
name: deploy-kamal
description: Deploy site, school SPA, backoffice SPA, or web API to staging or production with Kamal 2. Use when the user asks to deploy site, frontend, SPA, backoffice, API, or web to staging or production, run kamal deploy, cut over path routing, or fix kamal-proxy deploy errors.
---

# Deploy with Kamal

Deploy one layer or the full stack to **staging** or **production**. Runbook: `docs/guidelines/process/deployment.md`. Guardrails: `.cursor/rules/core/deployment.mdc`.

## Parse the request

| User says | Layer | Directory | Kamal service |
|---|---|---|---|
| site, landing, institutional | `site` | `site/` | `scholarpremium-site` |
| frontend, SPA, app (UI), school web | `frontend` | `frontend/app/` | `scholarpremium-spa` |
| backoffice, platform SPA | `backoffice` | `frontend/backoffice/` | `scholarpremium-backoffice-spa` |
| API, web, Rails, backend | `web` | `web/` | `scholarpremium` |
| everything, full stack, all services | `all` | see order below | all four |

| User says | Destination flag |
|---|---|
| staging | `-d staging` |
| production, prod | `-d production` |

Default to **staging** when the destination is ambiguous. Confirm before **production** deploys.

## Before deploy (always)

0. **Essential CI (mandatory before deploy)** — local CI is **not** run on commit, push, or PR; deploy is the quality gate.

   | Layer | Command (from repo root unless noted) |
   |-------|----------------------------------------|
   | **web** (API) | `cd web && bin/backend-ci --full` |
   | **frontend** (school SPA) | `cd frontend/app && npm test && npm run build` |
   | **backoffice** | `cd frontend/backoffice && npm test && npm run build` |
   | **site** | `make site-build` or project build script |
   | **all** | Run each row for surfaces you are deploying |

   Stop deploy if any command exits non-zero. `bin/ci --full` from repo root is an alternative when deploying the full stack.

1. **Working directory** — run Kamal from the service directory (`cd site`, `cd frontend/app`, `cd frontend/backoffice`, or `cd web`). Use `bin/kamal` in `site/`, `frontend/app/`, and `frontend/backoffice/` if present.
2. **Registry token** — in the same shell:
   ```bash
   export KAMAL_REGISTRY_PASSWORD='...'   # classic PAT: write:packages + read:packages
   ```
3. **Secrets file** — must exist in that service dir:
   ```bash
   test -f .kamal/secrets-common || cp .kamal/secrets-common.example .kamal/secrets-common
   ```
   For **web** only, also need `.kamal/secrets.staging` or `.kamal/secrets.production` (copy from `.example`).
4. **Verify Kamal resolves secrets**:
   ```bash
   kamal secrets print -d <staging|production>
   ```
   `KAMAL_REGISTRY_USERNAME` and `KAMAL_REGISTRY_PASSWORD` must be non-empty.
5. **Docker** — `docker info` must succeed locally (Kamal builds on the deploy machine).
6. **Preflight (API, recommended)** — `cd web && bin/deploy-preflight` before first deploy or when secrets changed.

Exit early with clear instructions if any check fails — do not run `kamal deploy` blind.

## Deploy one layer

Replace `<dest>` with `staging` or `production`.

### Site

```bash
cd site
kamal deploy -d <dest>
```

First time only: `kamal setup -d <dest>` before deploy.

### Frontend (school SPA)

```bash
cd frontend/app
kamal deploy -d <dest>
```

First time only: `kamal setup -d <dest>` before deploy.

### Backoffice SPA

```bash
cd frontend/backoffice
kamal deploy -d <dest>
```

First time only: `kamal setup -d <dest>` before deploy.

### API (web)

```bash
cd web
kamal deploy -d <dest>
```

First time only: `kamal setup -d <dest>` before deploy.

Migrations (when schema changed):

```bash
cd web
kamal app exec -d <dest> "bin/rails db:migrate"
```

## Deploy full stack (routine)

Post-cutover order — **site → school SPA → backoffice SPA → API**:

```bash
cd site                && kamal deploy -d <dest>
cd frontend/app        && kamal deploy -d <dest>
cd frontend/backoffice && kamal deploy -d <dest>
cd web                 && kamal deploy -d <dest>
```

## Cutover (API already owns the full hostname)

Use when site deploy fails with `host settings conflict` or API deploy fails with `TLS settings must be specified on the root path service`. See runbook section *Cutover when the API already owns the host*.

```bash
# 1. Inspect proxy routes
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy ls'

# 2. Remove API full-host registration (name from ls output, e.g. scholarpremium-web-staging)
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy remove scholarpremium-web-<dest>'

# 3. Deploy in cutover order
cd site                && kamal deploy -d <dest>
cd web                 && kamal deploy -d <dest>
cd frontend/app        && kamal deploy -d <dest>
cd frontend/backoffice && kamal deploy -d <dest>
```

Expect brief downtime on `/` and `/api` between steps 2 and 3.

## Post-deploy smoke tests

**Staging:**

```bash
curl -sI https://staging.scholarpremium.com.br/ | head -3
curl -sI https://staging.scholarpremium.com.br/app/ | head -3
curl -sI https://staging.scholarpremium.com.br/backoffice/ | head -3
curl -sI https://staging.scholarpremium.com.br/up | head -3
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy ls'
```

**Production** — same paths on `scholarpremium.com.br` (and `www.` if configured).

Smoke is **read-only**. Do not POST invite, password reset, guardian access, school create/handoff, or any other mailer-triggering route. Do not run `rails runner` mailers or `deliver_now` on the host. See rule `email-safety`.

## Rollback (single layer)

```bash
cd <site|frontend/app|frontend/backoffice|web>
kamal rollback -d <dest>
```

Database migrations are **not** rolled back with the container. Coordinate API rollback with site/SPA if needed.

## Checklists and errors

- Preflight checklist: [`checklist.md`](checklist.md)
- Common Kamal/proxy errors: [`troubleshooting.md`](troubleshooting.md)

## Do not

- Run `kamal deploy` without `-d` (blocked by config, but never omit intentionally).
- Run `kamal proxy remove` — removes the entire kamal-proxy container.
- Set `proxy.ssl: true` on `web/` or `frontend/` deploy configs.
- Commit secret files under `.kamal/`.
