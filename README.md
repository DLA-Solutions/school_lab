# School Lab

Multi-school management SaaS for private Brazilian schools.

```
school_lab/
  web/     # Rails 8.1 — web surfaces + REST API
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

## Production

The Rails app ships with Kamal + a production `Dockerfile` under `web/`. `web/Dockerfile.dev` is for local development only.
