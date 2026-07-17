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

- [Docker](https://docs.docker.com/get-docker/) (for PostgreSQL and Redis)
- [mise](https://mise.jdx.dev/) (Ruby 4.0.5 — see `web/mise.toml`)
- Rails 8.1.3 (`gem install rails -v 8.1.3`)

## Local development (recommended)

Rails runs **on the host** for fast feedback. Docker provides only backing services.

### 1. Configure environment

```bash
cp web/.env.example web/.env
```

`web/.env` is used by the Rails app (via `dotenv-rails`) and by `docker compose` (via `Makefile`) for Postgres/Redis ports and credentials.

### 2. Start infrastructure

From the repo root:

```bash
make services-up              # or: docker compose --env-file web/.env up -d
```

Services:

| Service    | Image                  | Port | Purpose                                      |
|------------|------------------------|------|----------------------------------------------|
| PostgreSQL | `pgvector/pgvector:pg16` | 5432 | App DB, Solid Queue/Cache, **pgvector** ready |
| Redis      | `redis:7-alpine`       | 6379 | Optional cache (MVP uses Solid Cache on PG)  |

Wait until healthy:

```bash
docker compose ps
```

### 3. Set up and run Rails

```bash
cd web
mise install                    # Ruby 4.0.5
bundle install
bin/rails db:prepare
bin/dev
```

Open [http://localhost:3000/up](http://localhost:3000/up).

`bin/dev` starts Puma and Tailwind watch (via Foreman). To process background jobs with Solid Queue in development, uncomment `SOLID_QUEUE_IN_PUMA=1` in `web/.env` and restart.

### First-time setup shortcut

```bash
cp web/.env.example web/.env
make services-up
cd web && mise install && bundle install && bin/setup --skip-server
bin/dev
```

## Mobile app (`app/`)

When the React Native project is initialized:

```bash
cp app/.env.example app/.env
```

## Useful commands

| Command | Description |
|---------|-------------|
| `make services-up` | Start PostgreSQL + Redis |
| `make services-down` | Stop containers (data preserved) |
| `make services-logs` | Tail service logs |
| `make services-reset` | Stop and **delete** volumes (wipes DB) |
| `cd web && bin/rails db:migrate` | Run migrations |
| `cd web && bin/rails console` | Rails console |

## PostgreSQL notes

- **pgvector** is enabled on `school_lab_development` and `school_lab_test` at first boot.
- Credentials default to `school_lab` / `school_lab` (override in `web/.env`).
- Solid Queue and Solid Cache use PostgreSQL in production; Redis is for cache at scale only.

## Redis notes

Redis is provisioned locally so the stack is ready when you switch from Solid Cache. The MVP does **not** use Redis for jobs (see `docs/web-stack.md`). `REDIS_URL` is set in `web/.env.example`; the `redis` gem connects via `config/initializers/redis.rb` when the URL is present.

## Troubleshooting

**Port 5432 already in use** — another PostgreSQL is running. Stop it or set `POSTGRES_PORT=5433` in `web/.env`.

**`connection refused` to PostgreSQL** — run `make services-up` and confirm `docker compose ps` shows `healthy`.

**Re-initialize databases** (e.g. after changing init scripts on a fresh volume):

```bash
make services-reset
make services-up
cd web && bin/rails db:prepare
```

Init scripts in `docker/postgres/init/` run only on first volume creation.

## Production

The Rails app ships with Kamal + a production `Dockerfile` under `web/`. Local `docker-compose.yml` is for development infrastructure only.
