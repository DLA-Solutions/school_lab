---
name: setup-local-dev
description: >-
  Sets up School Lab local development on macOS or Ubuntu Linux for Cursor:
  clone the monorepo, Docker Compose (PostgreSQL 16/pgvector + Redis), Rails 8.1
  API, school SPA, backoffice SPA, env files, demo seeds, and MCP servers. Use
  when a new developer needs onboarding, first clone, or asks how to run the
  project locally — setup local, como rodar o projeto, primeiro clone, ambiente
  local, Ubuntu, macOS, Cursor. Not for Kamal/deploy machine setup (skill
  setup-deploy) or running kamal deploy (skills deploy-staging / deploy-production).
---

# Setup local development

First day on a **laptop**: run the Docker web API + host Node SPAs in Cursor on **macOS** or **Ubuntu** (or Ubuntu on WSL). Commands from repo-root `README.md` / `Makefile`. Do not invent versions.

## Which skill?

- Only run the app on a laptop? → `setup-local-dev`
- This machine will run `kamal deploy` for the first time? → `setup-deploy`
- Already onboarded, just publish? → `deploy-staging` or `deploy-production`

You are in the right file.

## Happy path

Need **Docker running** and **Node 22** before `make setup` — [`macos.md`](macos.md) or [`ubuntu.md`](ubuntu.md). Open the **monorepo root** in Cursor (`school_lab/`), not `web/` or `frontend/app/`.

Already cloned? Skip `git clone`; from repo root start at `git checkout staging`.

```bash
git clone git@github.com:DLA-Solutions/school_lab.git
# HTTPS fallback: git clone https://github.com/DLA-Solutions/school_lab.git
cd school_lab && git checkout staging && git pull origin staging
# Docker running + Node 22 — macos.md / ubuntu.md
cp web/.env.example web/.env
# REQUIRED edit in web/.env — CORS must include backoffice 5175:
# CORS_ORIGINS=http://localhost:5173,http://localhost:5175,http://localhost:8082
make setup && make seed    # first Docker build is slow
make dev
```

**OK when:** http://localhost:5173 accepts `admin@demo.schoollab.local` / `Password123!` (from `web/db/seeds/demo_school.rb`, **not** root `README.md`, which still says `password123`).

`make setup` builds `web/Dockerfile.dev`, starts Postgres + Redis, runs `bin/rails db:prepare`. `make dev` starts the API (Docker, detached) and both Vite apps. Ctrl+C stops the SPAs; `make down` stops API containers.

| Surface | URL |
|---------|-----|
| Web API | http://localhost:3000/up |
| School SPA | http://localhost:5173 |
| Backoffice | http://localhost:5175 |

## Env

The CORS line in the happy path is **required**, not optional. API default `CORS_ORIGINS` is `http://localhost:5173,http://localhost:8082,http://192.168.1.103:8082` (`web/config/initializers/cors.rb`) — port **5175 is missing**. Without the edit, backoffice cookie refresh fails. Restart the API after changing `web/.env`.

`make dev` copies `frontend/app/.env` from `.env.example` if missing (`VITE_API_BASE_URL=http://localhost:3000`). Backoffice has no `.env.example`; Vite `DEV` already falls back to that API URL.

`web/.env` is also the compose env file (`Makefile` `ENV_FILE := web/.env`). Leave vendor tokens empty. **`web/config/master.key` is not required locally** (that is skill `setup-deploy`).

Package manager is **npm** (`package-lock.json` per package). No root `.env`.

## Smoke

```bash
make services-ps
curl -sI http://localhost:3000/up          # 200
curl -sI http://localhost:3000/api-docs    # Swagger UI (no basic auth locally)
```

Browser, in this order:

1. http://localhost:5173 — `admin@demo.schoollab.local` / `Password123!`
2. http://localhost:5175 — `backoffice@demo.schoollab.local` / `Password123!` (CORS must include 5175)
3. http://localhost:3000/api-docs

**OK when:** `/up` is 200, school SPA shell loads after login, Swagger UI loads.

All demo users share `Password123!` (`web/db/seeds/demo_school.rb`): `secretary@`, `coordination@`, `teacher@`, `guardian@` … `guardian5@demo.schoollab.local`.

## Day-to-day Makefile

| Command | Description |
|---------|-------------|
| `make dev` | API + school SPA + backoffice |
| `make up` / `make up-d` | API + Postgres + Redis |
| `make down` | Stop containers |
| `make migrate` | `bin/rails db:migrate` in the web container |
| `make seed` | `bin/rails db:seed` (idempotent) |
| `make console` / `make shell` / `make logs` | Rails console / bash / API logs |
| `make build` | Rebuild web image (after Gemfile changes) |
| `make services-up` | Postgres + Redis only |
| `make services-reset` | Stop and **delete volumes** (wipes DB) |
| `make ci` / `make ci-fast` | `bin/ci` |

## Cursor MCP

Do this **after** the app is running. [`cursor.md`](cursor.md) — minimum is Context7 OAuth.

## How to work

```bash
git checkout staging && git pull origin staging
git checkout -b feature/short-slug    # skill branch-naming
```

PRs target **`staging`**, not `main`. Code/docs/commits/API keys = English; product UI locale = pt-BR.

**Agent routing:** do not implement `web/` in the parent chat — **rails-implementer**. School SPA / backoffice / mobile / design tokens → **frontend-implementer**. `web/` CI/PR → **backend-ci**. Never leak across `school_id` or guardian families.

## Optionals (skip on first day)

| Optional | When | How |
|----------|------|-----|
| Host Rails | Faster Ruby-only loop | [`macos.md`](macos.md) / [`ubuntu.md`](ubuntu.md) — Docker still for Postgres/Redis |
| Mobile | Expo | `cp mobile/.env.example mobile/.env` then `make mobile-dev` (Android emulator: `10.0.2.2` not `localhost`) |
| Marketing site | Landing | `(cd site && npm install && npm run dev)` — Vite defaults to **5173**, same as school SPA. Stop the SPA or use `make site-serve` on `site/dist` |
| Design-system docs | Catalog | `make design-system-docs-dev` — port **5174** |
| Solid Queue in Puma | Jobs/mail in Docker | Uncomment `SOLID_QUEUE_IN_PUMA=1` in `web/.env`, then `make down && make up-d` |
| Git hooks | Once per clone | `bin/install-git-hooks` — currently **no-ops** (`docs/guidelines/process/local-ci.md`) |

## Do not

- Use this skill for a Kamal machine (`setup-deploy`) or `kamal deploy` (`deploy-staging` / `deploy-production`).
- Deploy from a feature branch (destination branches are `staging` / `main`).
- Put `POSTMARK_API_TOKEN` to “try email”, or hit invite/reset/régua on staging to test mail (rule `email-safety`).
- Use yarn/pnpm, or add a root `.env`.
- Implement `web/` or SPA feature code in the parent agent when specialists exist (rule `agent-routing`).
- Treat Redis as required for jobs (Solid Queue on PostgreSQL).
- Expect `master.key` for local boot.

## Additional resources

- OS tooling: [`macos.md`](macos.md) · [`ubuntu.md`](ubuntu.md)
- Cursor MCP: [`cursor.md`](cursor.md)
- Failures: [`troubleshooting.md`](troubleshooting.md)
- Local CI: `docs/guidelines/process/local-ci.md`
- First Kamal machine: skill `setup-deploy`
