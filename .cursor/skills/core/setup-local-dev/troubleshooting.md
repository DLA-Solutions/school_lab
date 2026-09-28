# Troubleshooting (local dev)

Use with skill `setup-local-dev`. Port/DB notes from `README.md` so the agent does not paraphrase them.

## CORS / cookies (first)

Backoffice is **5175** and is **not** in the API default `CORS_ORIGINS` (`web/config/initializers/cors.rb`). Add this to `web/.env` and restart the API, or the browser rejects the refresh cookie (`credentials: 'include'`):

```
CORS_ORIGINS=http://localhost:5173,http://localhost:5175,http://localhost:8082
```

School SPA must stay on **5173** unless `CORS_ORIGINS` includes the new origin (`frontend/app/README.md`).

## Demo password (first)

Password is `Password123!` (`web/db/seeds/demo_school.rb`). Root `README.md` still says `password123` — that line is stale; trust the seed file.

Re-seed is safe (idempotent): `make seed` or `(cd web && bin/rails db:seed)`.

## Makefile / env

**`Missing web/.env`**

```bash
cp web/.env.example web/.env
```

Every compose-backed `make` target runs `check-env` first.

## Ports (from README.md)

**Port 5432 already in use** — another PostgreSQL is running. Stop it or set `POSTGRES_PORT=5433` in `web/.env`.

**Port 3000 already in use** — set `PORT=3001` in `web/.env`.

**Port 5173** — school SPA (`frontend/app/vite.config.ts`) **and** `site/` Vite default. Do not run both `make app-dev` and `(cd site && npm run dev)` together. Design-system docs use **5174**; backoffice uses **5175**.

**`connection refused` to PostgreSQL** — run `make services-up` (or `make up-d`) and confirm `make services-ps` shows `healthy`.

Init scripts in `docker/postgres/init/` run only on first volume creation. After changing them:

```bash
make services-reset
make setup
```

`services-reset` **wipes** local DB volumes.

## Docker image / gems

After Gemfile changes:

```bash
make build
make setup
```

`pg` / `ruby-vips` compile failures on **host** Rails: missing `libpq` / `libvips` / `libyaml` — `macos.md` / `ubuntu.md`. Inside Docker, those packages are already in `web/Dockerfile.dev`.

## Ruby / Node managers

| Symptom | Fix |
|---------|-----|
| `ruby -v` not 4.0.5 | `(cd web && mise install)` (`web/mise.toml`). rbenv/asdf must honor `.ruby-version` (`ruby-4.0.5`) |
| Vite 7 / engine errors | Node **22.x** (`frontend/app/README.md`). No `.nvmrc` |
| `yarn` / `pnpm` lockfile noise | Use **npm** (`package-lock.json`). Makefile runs `npm install` / `npm run dev` |
| `npm ci` fails | Run from the package dir (`frontend/app`, `frontend/backoffice`, `site`, `mobile`) — there is no root lockfile |

## Email

Local mail is `Gateways::Email::Fake` (log event `email.fake_delivery`). Empty `/letter_opener` is expected — it is mounted but not the active delivery path. Never set delivery to Postmark in development/test (`docs/guidelines/web/mailers.md`, rule `email-safety`).

Jobs that send mail need Solid Queue processing: uncomment `SOLID_QUEUE_IN_PUMA=1` in `web/.env` and restart (`README.md`).

## SPA cannot reach API

- API healthy: `curl -sI http://localhost:3000/up`
- `frontend/app/.env` → `VITE_API_BASE_URL=http://localhost:3000` (or unset; DEV fallback is that URL)
- Docker API binds `${PORT:-3000}:3000`; host Rails `bin/dev` uses `PORT` default 3000 (`web/bin/dev`)

## GitHub MCP

- Missing `.cursor/mcp.env` → `cp .cursor/mcp.env.example .cursor/mcp.env`
- Placeholder token → `run-github-mcp.sh` exits
- Ubuntu: Darwin-only installer — `ubuntu.md`
- Restart Cursor after installing `.cursor/bin/github-mcp-server`

## Compose CLI

`Makefile` uses `docker compose` (v2 plugin). The old `docker-compose` binary is not what the repo calls.
