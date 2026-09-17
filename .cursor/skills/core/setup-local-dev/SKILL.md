---
name: setup-local-dev
description: >-
  Sets up School Lab local development on macOS or Ubuntu Linux for Cursor:
  clone the monorepo, Docker Compose (PostgreSQL 16/pgvector + Redis), Rails 8.1
  API, school SPA, backoffice SPA, env files, demo seeds, and MCP servers. Use
  when a new developer needs onboarding, first clone, or asks how to run the
  project locally — setup local, como rodar o projeto, primeiro clone, ambiente
  local, Ubuntu, macOS, Cursor. Not for Kamal/deploy machine setup (skill
  setup-deploy) or running kamal deploy (skill deploy-kamal).
---

# Setup local development

Onboard a developer machine so they can run School Lab in **Cursor** on **macOS** or **Ubuntu**.

**Source of truth for commands:** repo-root `README.md`. Stack: `docs/web-stack.md`. Do not invent versions or scripts.

**Not this skill:** first-time **deploy** machine (1Password, GHCR PAT, Kamal, SSH as `deploy@`) → skill **`setup-deploy`**. Running `kamal deploy` → skill **`deploy-kamal`**.

## Workflow checklist

Copy and track. Default path is **Docker API + host Node SPAs**.

```
- [ ] 1. OS + Cursor workspace
- [ ] 2. Prerequisites (Docker Compose v2, Node 22, git)
- [ ] 3. OS extras only if host Rails (macos.md / ubuntu.md)
- [ ] 4. Env files from examples (no real secrets)
- [ ] 5. make setup && make seed
- [ ] 6. make dev (API + school SPA + backoffice)
- [ ] 7. Cursor MCP (cursor.md) — Context7 + GitHub; Atlassian if using Jira
- [ ] 8. Smoke test
- [ ] 9. bin/install-git-hooks
- [ ] 10. Branch from staging before feature work
```

Mobile (`mobile/`) and marketing `site/` are optional and must not block API + SPAs.

## 1. OS + Cursor workspace

**macOS** → [`macos.md`](macos.md)  
**Ubuntu** (or Ubuntu on WSL) → [`ubuntu.md`](ubuntu.md)

Clone (SSH) and open the **monorepo root**, not `web/` or `frontend/app/`:

```bash
git clone git@github.com:DLA-Solutions/school_lab.git
cd school_lab
git checkout staging
git pull origin staging
```

In Cursor: **File → Open Folder** → this `school_lab/` directory. Rules under `.cursor/rules/`, agents under `.cursor/agents/`, and skills under `.cursor/skills/` load from the workspace root.

Cursor/MCP details: [`cursor.md`](cursor.md). Failures: [`troubleshooting.md`](troubleshooting.md).

## 2. Prerequisites (all developers)

| Tool | Why | Pin |
|------|-----|-----|
| Docker + Compose **v2** | Postgres, Redis, optional API image | `README.md` |
| Node.js **22.x** | School SPA, backoffice, site | `frontend/app/README.md` (“Recommended `Node.js v22.x`”); archived CI `node-version: 22` |
| git | clone, hooks | — |

Verify:

```bash
docker info
docker compose version
node -v    # v22.x
npm -v
```

**Package manager is npm** (`package-lock.json` in each Node package). Do not use yarn or pnpm.

**Ruby is not required** on the Docker API path. Host Rails (optional) needs **mise** + **Ruby 4.0.5** (`web/.ruby-version`, `web/mise.toml`) and **Rails 8.1.3** (`web/Gemfile` `gem "rails", "~> 8.1.3"`).

Env files live under surfaces — **never at the repo root** (`README.md`).

## 3. OS extras (host Rails only)

Skip if using `make setup` / `make up` / `make dev` (Docker API).

- macOS Homebrew packages + mise → [`macos.md`](macos.md)
- Ubuntu apt packages + mise → [`ubuntu.md`](ubuntu.md)

Native gem deps are whatever `web/Dockerfile.dev` installs into the API image:

```
build-essential curl git libpq-dev libvips libyaml-dev pkg-config postgresql-client
```

## 4. Environment files

Required before any `make` target that uses compose:

```bash
cp web/.env.example web/.env
```

`web/.env` is used by Rails **and** by `docker compose` via the Makefile (`ENV_FILE := web/.env`). Leave vendor tokens empty (Spedy, Cora, Asaas, Autentique, Postmark, Google OAuth). Local JWT and Active Record encryption use throwaway values (`Auth::SigningSecret::LOCAL_FALLBACK`, `web/config/initializers/security_secrets.rb`). **`web/config/master.key` is not required locally** — that is deploy onboarding (`setup-deploy`).

School SPA (copied automatically by `make dev` / `make app-setup`):

```bash
cp frontend/app/.env.example frontend/app/.env
```

Default `VITE_API_BASE_URL=http://localhost:3000`. Backoffice has **no** `.env.example`; in Vite `DEV` it already falls back to `http://localhost:3000`.

**Backoffice CORS:** API default `CORS_ORIGINS` is `http://localhost:5173,http://localhost:8082,http://192.168.1.103:8082` (`web/config/initializers/cors.rb`). Port **5175 is not in that default**. Add it to `web/.env` before using the backoffice SPA with cookie refresh:

```
CORS_ORIGINS=http://localhost:5173,http://localhost:5175,http://localhost:8082
```

Then restart the API.

Mobile (only if running Expo):

```bash
cp mobile/.env.example mobile/.env
```

## 5. First-time data (Docker — recommended)

From repo root. Commands from `README.md` / `Makefile`:

```bash
make setup
make seed        # optional — demo school data (idempotent)
```

`make setup` builds `web/Dockerfile.dev`, starts Postgres + Redis, runs `bin/rails db:prepare`.

**OK when:** `make services-ps` shows `postgres` and `redis` healthy.

### Demo login (after seed)

Source: `web/db/seeds/demo_school.rb` (not the root README password line).

Password for **all** demo users: `Password123!`

| Role | Email |
|------|-------|
| Backoffice | `backoffice@demo.schoollab.local` |
| Director | `admin@demo.schoollab.local` |
| Secretary | `secretary@demo.schoollab.local` |
| Coordinator | `coordination@demo.schoollab.local` |
| Teacher | `teacher@demo.schoollab.local` |
| Guardian | `guardian@demo.schoollab.local` … `guardian5@demo.schoollab.local` |

## 6. Start the stack

**Day-to-day product work (API + both SPAs):**

```bash
make dev
```

`Makefile` `dev` runs `up-d` then both Vite apps. Prints:

```
API         http://localhost:3000/up
School SPA  http://localhost:5173
Backoffice  http://localhost:5175
```

Ctrl+C stops the SPAs. `make down` stops the API containers.

**API only (Docker, foreground):** `make up` — API at http://localhost:3000/up  
**API only (detached):** `make up-d`

Background jobs (Solid Queue, PostgreSQL — **not** Sidekiq/Redis): uncomment `SOLID_QUEUE_IN_PUMA=1` in `web/.env` and restart (`make down && make up-d`). See `README.md`.

### Host Rails (optional)

Docker for Postgres/Redis only:

```bash
cp web/.env.example web/.env
make services-up
cd web && mise install && bundle install && bin/rails db:prepare
bin/dev
```

`bin/dev` starts Puma via Foreman (`web/Procfile.dev`). API is JSON-only — no asset build.

### Optional surfaces

| Surface | Command | URL / notes |
|---------|---------|-------------|
| School SPA alone | `make app-dev` | http://localhost:5173 (`frontend/app/vite.config.ts`) |
| Backoffice SPA alone | `make backoffice-dev` | http://localhost:5175 |
| Design-system catalog | `make design-system-docs-dev` | port **5174** |
| Marketing site | `cd site && npm install && npm run dev` | Vite defaults to **5173** — conflicts with school SPA; stop the SPA or use `make site-serve` on built `site/dist` |
| Mobile (Expo) | `make mobile-dev` | `cd mobile && npm start`; Android emulator: `10.0.2.2` instead of `localhost` in `mobile/.env` |

## 7. Cursor MCP

See [`cursor.md`](cursor.md). Minimum for coding: **Context7** (already in `.cursor/mcp.json`). GitHub MCP + `.cursor/mcp.env` for issues/PRs. Atlassian plugin for `DLA-N` Jira. Discord deploy MCP only if this machine will deploy.

## 8. Smoke test

```bash
make services-ps
curl -sI http://localhost:3000/up          # 200
curl -sI http://localhost:3000/api-docs    # Swagger UI (no basic auth locally)
```

In the browser:

1. http://localhost:5173 — sign in as `admin@demo.schoollab.local` / `Password123!`
2. http://localhost:5175 — backoffice (set `CORS_ORIGINS` first; use `backoffice@demo.schoollab.local`)
3. http://localhost:3000/api-docs — OpenAPI

**OK when:** `/up` is 200, demo login reaches the school SPA shell, Swagger UI loads.

Email: development uses `Gateways::Email::Fake` (Rails log `email.fake_delivery`). **Never Postmark** locally or in RSpec, even if `POSTMARK_API_TOKEN` is in `.env`. `/letter_opener` is mounted but is not the active delivery path (`docs/guidelines/web/mailers.md`).

## 9. Git hooks (once per clone)

```bash
bin/install-git-hooks
```

Hooks are currently no-ops (`docs/guidelines/process/local-ci.md`). Local CI is manual: `bin/ci` / `make ci`.

## 10. After setup — how to work

```bash
git checkout staging
git pull origin staging
git checkout -b feature/short-slug   # skill branch-naming
```

- **Language:** code, docs, commits, API keys = English. Product UI locale = pt-BR (`config/locales/pt-BR.yml`).
- **Agent routing:** do **not** implement `web/` in the parent chat — **rails-implementer**. Client surfaces (`frontend/app`, `frontend/backoffice`, `mobile`, design tokens) → **frontend-implementer**. CI/PR for `web/` → **backend-ci**.
- **Tenancy:** never leak across `school_id` or guardian families.
- **PRs** target **`staging`**, not `main`.

## Day-to-day Makefile

| Command | Description |
|---------|-------------|
| `make up` / `make up-d` | API + Postgres + Redis |
| `make down` | Stop containers |
| `make migrate` | `bin/rails db:migrate` in the web container |
| `make seed` | `bin/rails db:seed` |
| `make console` / `make shell` / `make logs` | Rails console / bash / API logs |
| `make build` | Rebuild web image (after Gemfile changes) |
| `make services-up` | Postgres + Redis only |
| `make services-reset` | Stop and **delete volumes** (wipes DB) |
| `make ci` / `make ci-fast` | `bin/ci` |

## Do not

- Deploy from a feature branch (`setup-deploy` / `deploy-kamal`; branch must be `staging` or `main`).
- Put `POSTMARK_API_TOKEN` to “try email” locally, or hit invite/reset/régua on staging to test mail (rule `email-safety`).
- Use yarn/pnpm, or add a root `.env`.
- Implement `web/` or SPA feature code in the parent agent when specialists exist (rule `agent-routing`).
- Treat Redis as required for jobs (Solid Queue on PostgreSQL).
- Need `master.key` for local boot.

## Additional resources

- OS: [`macos.md`](macos.md) · [`ubuntu.md`](ubuntu.md)
- Cursor: [`cursor.md`](cursor.md)
- Failures: [`troubleshooting.md`](troubleshooting.md)
- Local CI: `docs/guidelines/process/local-ci.md`
- Deploy onboarding (separate): skill `setup-deploy`
