# School Lab

Multi-school management SaaS for private Brazilian schools.

```
school_lab/
  web/     # Rails 8.1 — REST API
  frontend/  # React SPA at /app
  site/    # static landing at /
  app/     # React Native mobile (future)
  docs/    # product docs, PRDs, guidelines
```

Stack details: [`docs/web-stack.md`](docs/web-stack.md).

Environment files live **only** under `web/` and `app/` — never at the repo root.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (Docker Compose v2)

Optional for host-based Rails development:

- [mise](https://mise.jdx.dev/) (Ruby 4.0.5 — see `web/mise.toml`)
- Rails 8.1.3 (`gem install rails -v 8.1.3`)

## Local development (Docker — recommended)

Runs the API and all backing services in Docker. Works the same on macOS, Linux, and WSL.

### 1. Configure environment

```bash
cp web/.env.example web/.env
```

`web/.env` is used by the Rails app and by `docker compose` (via `Makefile`) for Postgres/Redis ports and credentials.

### 2. First-time setup

From the repo root:

```bash
make setup
make seed        # optional — demo school data
make up          # foreground; API at http://localhost:3000/up
```

Or run everything in the background:

```bash
make setup && make seed && make up-d
```

### 3. Day-to-day commands

| Command | Description |
|---------|-------------|
| `make up` | Start API + Postgres + Redis (foreground) |
| `make up-d` | Same, detached |
| `make down` | Stop all containers |
| `make migrate` | Run pending migrations |
| `make seed` | Load demo data (`db/seeds.rb`) |
| `make console` | Rails console |
| `make shell` | Bash inside the web container |
| `make logs` | Tail API logs |
| `make build` | Rebuild the web image |

Demo credentials (after `make seed`):

- Guardian: `guardian@demo.schoollab.local` / `password123`
- Admin: `admin@demo.schoollab.local` / `password123`

To process background jobs with Solid Queue in development, uncomment `SOLID_QUEUE_IN_PUMA=1` in `web/.env` and restart (`make down && make up-d`).

## Local development (host Rails)

Rails on the host gives slightly faster feedback for Ruby-only changes. Docker provides only backing services.

```bash
cp web/.env.example web/.env
make services-up
cd web && mise install && bundle install && bin/rails db:prepare
bin/dev
```

Open [http://localhost:3000/up](http://localhost:3000/up).

`bin/dev` starts Puma (via Foreman). The API renders JSON only — there is no asset build step.

## Services

| Service    | Image                  | Port | Purpose                                      |
|------------|------------------------|------|----------------------------------------------|
| PostgreSQL | `pgvector/pgvector:pg16` | 5432 | App DB, Solid Queue/Cache, **pgvector** ready |
| Redis      | `redis:7-alpine`       | 6379 | Optional cache (MVP uses Solid Cache on PG)  |
| Web (API)  | `web/Dockerfile.dev`   | 3000 | Rails API (`make up`)                        |

Wait until healthy:

```bash
make services-ps
```

## Mobile app (`app/`)

When the React Native project is initialized:

```bash
cp app/.env.example app/.env
```

## Infrastructure commands

| Command | Description |
|---------|-------------|
| `make services-up` | Start PostgreSQL + Redis only |
| `make services-down` | Stop containers (data preserved) |
| `make services-logs` | Tail Postgres/Redis logs |
| `make services-reset` | Stop and **delete** volumes (wipes DB) |

## PostgreSQL notes

- **pgvector** is enabled on `school_lab_development` and `school_lab_test` at first boot.
- Credentials default to `school_lab` / `school_lab` (override in `web/.env`).
- Solid Queue and Solid Cache use PostgreSQL in production; Redis is for cache at scale only.
- Inside Docker, `POSTGRES_HOST` is overridden to `postgres` by `docker-compose.yml`. Host Rails keeps `localhost` from `web/.env`.

## Redis notes

Redis is provisioned locally so the stack is ready when you switch from Solid Cache. The MVP does **not** use Redis for jobs (see `docs/web-stack.md`). `REDIS_URL` is set in `web/.env.example`; the `redis` gem connects via `config/initializers/redis.rb` when the URL is present.

## Troubleshooting

**Port 5432 already in use** — another PostgreSQL is running. Stop it or set `POSTGRES_PORT=5433` in `web/.env`.

**Port 3000 already in use** — set `PORT=3001` in `web/.env`.

**`connection refused` to PostgreSQL** — run `make services-up` (or `make up-d`) and confirm `make services-ps` shows `healthy`.

**Re-initialize databases** (e.g. after changing init scripts on a fresh volume):

```bash
make services-reset
make setup
```

Init scripts in `docker/postgres/init/` run only on first volume creation.

**Rebuild after Gemfile changes:**

```bash
make build
make setup
```

## Deployment

Deploys are manual from a developer machine with [Kamal 2](https://kamal-deploy.org/).
Three services share one app server behind kamal-proxy:

| Path | Directory | Kamal service |
|------|-----------|---------------|
| `/` | `site/` | `scholarpremium-site` |
| `/app` | `frontend/` | `scholarpremium-spa` |
| `/api`, `/up`, `/api-docs`, `/webhooks` | `web/` | `scholarpremium` |

| Destination | Hosts |
|-------------|-------|
| `staging` | `staging.scholarpremium.com.br` |
| `production` | `scholarpremium.com.br`, `www.scholarpremium.com.br` |

**Always pass `-d staging` or `-d production`.** A bare `kamal deploy` is blocked by
config (`require_destination: true`).

Full runbook (secrets, databases, TLS rules, rollback):
[`docs/guidelines/process/deployment.md`](docs/guidelines/process/deployment.md).

### Prerequisites (deploy machine)

- SSH as `deploy` to `77.42.33.33` (key loaded in the agent)
- Docker running locally (`docker info`)
- `gh auth login` done
- Classic GitHub PAT with `write:packages` + `read:packages`, exported before each deploy:

```bash
export KAMAL_REGISTRY_PASSWORD='ghp_...'   # not a plain GITHUB_TOKEN
```

Verify registry login:

```bash
docker login ghcr.io -u "$(gh config get -h github.com user)" \
  --password-stdin <<< "$KAMAL_REGISTRY_PASSWORD"
```

Run Kamal from the **service directory** (`site/`, `frontend/`, or `web/`). Site and
frontend ship `bin/kamal` wrappers; you can also use a globally installed `kamal` gem.

### One-time secrets setup

Each service directory has its own `.kamal/` folder — Kamal reads secrets from the cwd.

```bash
# Registry credentials — all three services
cd site      && cp .kamal/secrets-common.example .kamal/secrets-common
cd ../frontend && cp .kamal/secrets-common.example .kamal/secrets-common

# API also needs per-destination secrets
cd ../web
cp .kamal/secrets-common.example     .kamal/secrets-common
cp .kamal/secrets.production.example .kamal/secrets.production
cp .kamal/secrets.staging.example    .kamal/secrets.staging
```

If `web/.kamal/secrets-common` already exists, copy it into `site/.kamal/` and
`frontend/.kamal/` instead — the GHCR lines are identical.

Before the first API deploy, populate `web/config/master.key`, Active Record encryption
keys, and the JWT/database secrets listed in `.kamal/secrets.*.example`. Recommended
preflight:

```bash
cd web && bin/deploy-preflight
```

### Deploy order

**Routine** (after cutover is done): **site → SPA → API**.

**Fresh host** (nothing registered on the hostname yet): same order — site first so it
claims TLS at `/`, then SPA, then API last.

**Cutover** (API already owns the full hostname — typical on first site/SPA deploy):

```bash
# 0. Inspect proxy routes — confirm API has no path prefixes
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy ls'

# 1. Remove API full-host registration (name from `ls` output)
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy remove scholarpremium-web-staging'
# production: scholarpremium-web-production

# 2–4. Deploy site → API → SPA (API paths are down between steps 1 and 3)
cd site      && kamal deploy -d staging
cd ../web    && kamal deploy -d staging
cd ../frontend && kamal deploy -d staging
```

Between cutover steps 1 and 3, `/api` and `/up` are briefly unavailable. Do **not** run
`kamal proxy remove` — that drops the entire kamal-proxy container. Use
`docker exec kamal-proxy kamal-proxy remove <service>` for a single route.

### First deploy

Run once per service per destination (`setup` installs Docker and kamal-proxy on the
server):

```bash
cd site && kamal setup -d staging && kamal deploy -d staging
cd frontend && kamal setup -d staging && kamal deploy -d staging
cd web && kamal setup -d staging && kamal deploy -d staging
```

Repeat with `-d production` for production. DNS must already point at `77.42.33.33`
before the first deploy (Let's Encrypt via kamal-proxy).

### Day-to-day deploy

```bash
# Staging — deploy only what changed, in routine order when touching multiple layers
cd site      && kamal deploy -d staging
cd frontend  && kamal deploy -d staging
cd web       && kamal deploy -d staging

# Production (confirm staging first)
cd site      && kamal deploy -d production
cd frontend  && kamal deploy -d production
cd web       && kamal deploy -d production
```

After an API schema change:

```bash
cd web && kamal app exec -d staging "bin/rails db:migrate"
```

Logs and console (API only):

```bash
cd web
kamal app logs -f -d production
kamal console -d production
```

### Post-deploy smoke tests

```bash
# Staging
curl -sI https://staging.scholarpremium.com.br/ | head -3
curl -sI https://staging.scholarpremium.com.br/app/ | head -3
curl -sI https://staging.scholarpremium.com.br/up | head -3

# Production — same paths on scholarpremium.com.br
curl -sI https://scholarpremium.com.br/ | head -3
curl -sI https://scholarpremium.com.br/up | head -3

ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy ls'
```

Expect three services with path prefixes on each hostname after cutover.

### Rollback

Each layer rolls back independently from its service directory:

```bash
cd site && kamal rollback -d staging
cd web  && kamal rollback -d production
```

Database migrations are **not** rolled back with the container.
