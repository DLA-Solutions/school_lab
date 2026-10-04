# Deployment

How `site/`, `frontend/app/`, `frontend/backoffice/`, and `web/` reach staging and production.

Continuous delivery is GitHub Actions on `ubuntu-latest`. The workflow
[`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml) runs
[`bin/deploy`](../../../bin/deploy). It does not run RuboCop, RSpec, or any other
test. CI stays local (`bin/ci`) before merge — see [`local-ci.md`](local-ci.md).

The app server `77.42.33.33` only receives the image. There is no self-hosted
runner and no git clone on the server for deploy. Kamal on the runner builds the
image, pushes it to GHCR, and uses SSH only to pull the image and swap the
container.

## Branch policy

Two long-lived branches, one per environment. One-pager:
[`git-and-deploy-flow.md`](git-and-deploy-flow.md). ADR:
[`003-environment-branches.md`](../../adr/003-environment-branches.md).

| Trigger | Git branch | What publishes |
|---------|------------|----------------|
| Push | `staging` | Staging (`bin/deploy staging`, GitHub Environment `staging`) |
| Push | `main` | Production (`bin/deploy production`, GitHub Environment `production`) |
| Actions button (`workflow_dispatch`) | `staging` or `main` only | Redeploy one layer or all four; optional migrate checkbox |

A push starts the job only when it touches a deployable path: `site/**`,
`frontend/app/**`, `frontend/backoffice/**`, `packages/design-tokens/**`,
`web/**`, `bin/deploy`, or `.github/workflows/deploy.yml`. A docs-only commit
does not deploy. `packages/design-tokens/**` includes both SPAs. A diff that
only changes the workflow or `bin/deploy` ends the job without Kamal.

`workflow_dispatch` on any other branch fails before Docker. The layer input is
`changed` (the last commit), `all`, `site`, `frontend`, `backoffice`, or `web`.
The migrate checkbox defaults to off.

Do not deploy from `feature/*`, `fix/*`, `chore/*`, or `docs/*`. Do not deploy
an open PR by checking out the feature branch. Cursor rule:
`.cursor/rules/core/deploy-environment-branches.mdc`.

### What the workflow runs

`bin/deploy staging` or `bin/deploy production` publishes four layers, in runbook
order, and stops at the first failure: `site/`, `frontend/app/`,
`frontend/backoffice/`, `web/`. An optional third argument limits the run to
`site`, `frontend`, `backoffice`, or `web`.

Migrations run with `kamal app exec -d <dest> --primary "bin/rails db:migrate"`
after the API, and only when the API is one of the layers in that run:

- On a push, only when the diff includes `web/db/migrate/**` or `web/db/schema.rb`.
- On the manual button, only when the migrate checkbox is set.

Smoke is a read-only `GET` of the public URLs for the layers that shipped
(`/`, `/app/`, `/backoffice/`, `/up` on `staging.scholarpremium.com.br` or
`scholarpremium.com.br`). A failed smoke fails the job. Smoke does not send
e-mail and does not `POST`.

Discord notify is best-effort (`if: always()`). The optional repository secret
`DISCORD_DEPLOY_WEBHOOK_URL` posts the same embed as
[`.cursor/mcp/discord-deploy/notify.mjs`](../../../.cursor/mcp/discord-deploy/notify.mjs).
A missing webhook or a Discord outage does not fail the deploy. Jira
**Ready to QA** stays manual (skill `jira-task-lifecycle`). The workflow does
not transition tickets.

### Secrets in the GitHub UI

Nothing in the repository creates these secrets. A person creates the GitHub
Environments `staging` and `production` and fills the values **before** merging
the workflow. The first push fails if they are missing.

Repository secrets (visible to both jobs):

| Secret | Notes |
|--------|--------|
| `KAMAL_REGISTRY_USERNAME` | GHCR user |
| `KAMAL_REGISTRY_PASSWORD` | Classic PAT with `write:packages` and `read:packages` |
| `DEPLOY_SSH_PRIVATE_KEY` | SSH key for `deploy@77.42.33.33` |
| `DEPLOY_KNOWN_HOSTS` | `known_hosts` for that server |
| `RAILS_MASTER_KEY` | API credentials key |
| `POSTGRES_PASSWORD` | `scholarpremium` role; URL-encode `@`, `:`, `/`, `?`, `#` |
| `REDIS_PASSWORD` | Redis `requirepass`; URL-encode the same characters |
| `GOOGLE_OAUTH_CLIENT_ID` | School SPA builder secret |
| `DISCORD_DEPLOY_WEBHOOK_URL` | Optional; deploy still succeeds without it |

Environment `staging`:

- `JWT_SECRET_KEY_STAGING`
- `POSTMARK_API_TOKEN_STAGING`
- `API_DOCS_USERNAME`
- `API_DOCS_PASSWORD`

Environment `production`:

- `JWT_SECRET_KEY_PRODUCTION`
- `POSTMARK_API_TOKEN_PRODUCTION`

`KAMAL_REGISTRY_PASSWORD` must be that classic PAT. Do not use `GITHUB_TOKEN`
(the Actions token or a general-purpose token). Those tokens normally lack the
packages scopes, and GHCR rejects them with a 401. The production JWT does not
belong in the staging environment: a staging token must not verify in production.

URL-encode `POSTGRES_PASSWORD` and `REDIS_PASSWORD` when the password contains
`@`, `:`, `/`, `?`, or `#`. A literal character breaks `DATABASE_URL` parsing,
and the failure looks like a wrong host.

### Local fallback

When `.kamal/secrets*` already exist on a machine, local `bin/deploy` remains
valid. Outside Actions the script calls `bin/require-deploy-branch` and reads
those files. It does not run tests. This is not the default path for every
developer.

```bash
bin/deploy staging
bin/deploy staging web          # site, frontend, backoffice, or web
bin/deploy production
```

## Topology

Two VPS. Only the app server is exposed to the internet. Four Kamal services share one
kamal-proxy on that server:

```
Internet ──443──▶ app server (77.42.33.33)
                    kamal-proxy (TLS)
                      ├── /              → scholarpremium-site           (site/)
                      ├── /app/*         → scholarpremium-spa            (frontend/app/)
                      ├── /backoffice/*  → scholarpremium-backoffice-spa (frontend/backoffice/)
                      └── /api, /up, …   → scholarpremium                (web/)
                                        │
                                        └──▶ database server (10.0.0.3, private network)
                                               PostgreSQL 17 + Redis, both native
```

| URL path | Folder | Kamal service | GHCR image |
|---|---|---|---|
| `/` | `site/` | `scholarpremium-site` | `dla-solutions/scholarpremium-site` |
| `/app/*` | `frontend/app/` | `scholarpremium-spa` | `dla-solutions/scholarpremium-spa` |
| `/backoffice/*` | `frontend/backoffice/` | `scholarpremium-backoffice-spa` | `dla-solutions/scholarpremium-backoffice-spa` |
| `/api`, `/up`, `/api-docs`, `/webhooks` | `web/` | `scholarpremium` | `dla-solutions/scholarpremium` |

PostgreSQL and Redis are installed natively on the database server. They are **not**
Kamal accessories — Kamal never starts, stops, or upgrades them, and `config/deploy.yml`
has no `accessories` section. Provisioning and backups of that machine are handled
outside this repository.

Both destinations share the app server and the database server; they are separated by
Kamal destination, database name, Redis logical database, and Active Storage volume.

### Path routing order

Kamal path routing is **order-sensitive** and depends on what is already registered on
kamal-proxy. Only one service can own a hostname without path prefixes; adding site at `/`
while the API still owns the entire host fails proxy registration.

The API uses `strip_path_prefix: false` so Rails still receives full paths like
`/api/v1/...`, not `/v1/...`.

Each service has its own Kamal health check at `/up` (nginx for site and SPA; Thruster
for API). kamal-proxy probes the container target directly — not through public host
routing — so site and SPA nginx `location = /up` blocks are correct. Public
`https://staging.scholarpremium.com.br/up` is routed to the API via `path_prefixes`.

#### TLS and path prefixes

kamal-proxy allows **automatic TLS (`--tls`) only on the root-path service** for a host.
Path-prefixed services inherit HTTPS from that root registration.

| Service | `proxy.ssl` | Reason |
|---|---|---|
| `scholarpremium-site` (`/`) | `true` | Root path — owns Let's Encrypt for the host |
| `scholarpremium` (`/api`, …) | omit / `false` | `path_prefixes` — `--tls` makes proxy deploy fail |
| `scholarpremium-spa` (`/app`) | omit / `false` | `path_prefix` — same rule |
| `scholarpremium-backoffice-spa` (`/backoffice`) | omit / `false` | `path_prefix` — same rule |

**Symptom when API or SPA set `ssl: true` with path prefixes:**

```text
Error: TLS settings must be specified on the root path service
```

The image build and `docker run` may succeed; only kamal-proxy registration fails. The
running container may be stopped when deploy aborts.

#### Fresh host (no Kamal app on the hostname yet)

Deploy in this order:

1. **Site** at `/` (no `path_prefix`, `ssl: true`) — first; establishes TLS
2. **School SPA** at `/app` (`path_prefix: /app`, no `ssl`) — second
3. **Backoffice SPA** at `/backoffice` (`path_prefix: /backoffice`, no `ssl`) — third
4. **API** with `path_prefixes` (no `ssl`) — **last**

#### Cutover when the API already owns the host

Staging (and production, if the API was deployed before site/SPA existed) often already
has `scholarpremium` on kamal-proxy **without** `path_prefixes`, so it owns
`staging.scholarpremium.com.br` entirely. Site cannot register the same host at root until
the API releases that claim.

**Do not deploy the API first** with `path_prefixes` while it still owns the full host —
that was the previous cutover advice and it fails for two reasons:

1. **Host conflict** — site cannot claim `/` until the API narrows or is removed from the
   proxy.
2. **TLS conflict** — if `proxy.ssl: true` is still merged into the API config, kamal-proxy
   rejects `--tls` together with `--path-prefix`.

**Symptom (host conflict)** — site deploy fails after the container starts:

```text
Error: host settings conflict with another service
```

**Cutover order** — release the API's full-host proxy registration, then deploy **site →
API → school SPA → backoffice SPA**:

```bash
# 0. Inspect current proxy routes (on app server)
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy ls'

# 1. Remove API proxy registration (keeps image/volume; drops host claim)
#    Name is usually scholarpremium-web-staging — confirm from `ls` output.
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy remove scholarpremium-web-staging'

# 2. Site — claim domain root and TLS (ssl: true only on site/config/deploy.yml)
cd site
kamal deploy -d staging

# 3. API — path prefixes only; no proxy.ssl in web/config/deploy.yml
cd ../web
kamal deploy -d staging

# 4. School SPA — /app path prefix; no proxy.ssl in frontend/app/config/deploy.yml
cd ../frontend/app
kamal deploy -d staging

# 5. Backoffice SPA — /backoffice path prefix; no proxy.ssl in frontend/backoffice/config/deploy.yml
cd ../backoffice
kamal deploy -d staging
```

Between steps 1 and 3, `https://staging.scholarpremium.com.br/api` (and `/up`, etc.) are
down until step 3 completes. Between steps 1 and 2, the hostname may return 502 from
kamal-proxy until site registers. Keep that gap short.

After step 2, `/` serves the landing page. After step 3, API paths work again. After step
4, `/app/` serves the school SPA. After step 5, `/backoffice/` serves the platform SPA.

Repeat with `-d production` for production when cutting over that hostname.

**Optional check** before cutover — if the API proxy target has no path prefixes, use
cutover order (not fresh-host order):

```bash
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy ls'
```

Look for `scholarpremium-web-staging` (or `-production`) bound to the hostname without
`/api`, `/up`, etc. in the path list.

**After a failed API cutover deploy** — proxy registration may still show the old
full-host route while the API container is stopped. Run step 1 (`kamal-proxy remove`) before
deploying site; step 3 (`kamal deploy`) boots the API container again.

Do **not** run `kamal proxy remove` from the Kamal CLI — that removes the entire
kamal-proxy container. Use `docker exec kamal-proxy kamal-proxy remove <service>` for a
single route, or let a successful deploy replace the registration.

After cutover, routine deploys can follow site → school SPA → backoffice SPA → API again;
only the migration from API-only needs the remove + site-first sequence above.

## Destinations

Each service has its own `config/deploy.yml` under `site/`, `frontend/app/`, `frontend/backoffice/`, and `web/`.
Per-environment values live in `config/deploy.production.yml` and `config/deploy.staging.yml`.

| | production | staging |
|---|---|---|
| Hosts | `scholarpremium.com.br`, `www.` | `staging.scholarpremium.com.br` |
| Database | `scholarpremium_production` | `scholarpremium_staging` |
| Solid Cable database | `scholarpremium_production_cable` | `scholarpremium_staging_cable` |
| Redis logical db | `0` | `1` |
| Cora | production API | sandbox API |
| Active Storage volume | `scholarpremium_storage` | `scholarpremium_staging_storage` |
| `WEB_CONCURRENCY` | 2 | 1 |

**Always pass `-d`.** `require_destination: true` makes a bare `kamal deploy` fail
instead of quietly targeting production. It also matters for secrets: Kamal 2 reads
`.kamal/secrets-common` plus `.kamal/secrets.<destination>`, and ignores the plain
`.kamal/secrets` file whenever a destination is given.

The two destinations coexist on the same server because Kamal appends the destination
to the container and proxy target names (`scholarpremium-web-production` and
`scholarpremium-web-staging`).

Staging runs with `RAILS_ENV=production` and sandbox credentials. There is no separate
Rails environment.

## Databases

The following must exist on the database server before the first deploy, owned by the
`scholarpremium` role:

- `scholarpremium_production`, `scholarpremium_production_cable`
- `scholarpremium_staging`, `scholarpremium_staging_cable`

Solid Queue and Solid Cache live in the primary database on purpose: enqueue then
participates in the same transaction as the domain writes that triggered it. If
`_cache` / `_queue` databases were provisioned, they stay idle.

The `vector` extension is available in the databases but unused today — there is no
`vector` column in `db/schema.rb`, so `schema_format` stays `:ruby`. Revisit when the
first embedding migration lands (see `docs/open-questions.md`).

Schema loading on boot still runs through `bin/docker-entrypoint` (`db:prepare`).
The workflow's explicit `db:migrate` is separate: it runs only when the API layer
deploys and, on a push, `web/db/migrate` or `web/db/schema.rb` changed — or, on
the manual button, the migrate checkbox is set. Demo seeds are guarded by
`Rails.env.local?` in `db/seeds.rb` and never run on a deployed environment.

## Application secrets

Two secrets have no usable default and the app **refuses to boot** without them outside
development and test (`config/initializers/security_secrets.rb`). A deploy missing either
one fails its health check instead of coming up in a weak state, which is deliberate.

**Active Record encryption keys** encrypt `school_payment_providers.certificate_pem` and
`private_key_pem`, the school's Cora mTLS banking credentials. They live in the encrypted
credentials, shared by both destinations — the databases are already separate. Generate and
store them once, **before** the first deploy; doing it after data exists means re-encrypting
every row:

```bash
cd web
bin/rails db:encryption:init   # prints the three keys
bin/rails credentials:edit
```

```yaml
active_record_encryption:
  primary_key: ...
  deterministic_key: ...
  key_derivation_salt: ...
```

`RAILS_MASTER_KEY` is already a Kamal secret, so nothing else has to reach the server.

**`JWT_SECRET_KEY`** signs API access tokens and is deliberately **not** in the credentials.
Staging runs with `RAILS_ENV=production` and reads the same credentials file, so a single
value would make a staging token valid in production, where that user id belongs to somebody
else. Each destination supplies its own through Kamal secrets, and the environment takes
precedence over the credentials for exactly this reason. Generate one per destination with
`bin/rails secret`.

Development and test deliberately use fixed throwaway values committed to the repository,
so the suite runs without credentials — CI has no `RAILS_MASTER_KEY`. Those values protect
nothing real and must never be reused by a deployed environment.

## Prerequisites on a local deploy machine (fallback)

GitHub Actions is the default path and does not use these files. This section is
only for `bin/deploy` on a machine that already has `.kamal/secrets*`.

1. SSH access as `deploy` to `77.42.33.33`, with the key loaded in the agent.
2. Docker running locally (Kamal builds the image on your machine).
3. `web/config/master.key` present, and the credentials populated as described above.
4. Kamal secrets files. **Each service directory has its own `.kamal/` folder** — Kamal
   reads secrets from the directory you run the command in (`site/`, `frontend/`, or `web/`).
   Copy from the versioned templates:

```bash
# Registry credentials — required in all three service dirs before the first deploy
cd site
cp .kamal/secrets-common.example .kamal/secrets-common

cd ../frontend
cp .kamal/secrets-common.example .kamal/secrets-common

# API also needs per-destination secrets
cd ../web
cp .kamal/secrets-common.example      .kamal/secrets-common
cp .kamal/secrets.production.example  .kamal/secrets.production
cp .kamal/secrets.staging.example     .kamal/secrets.staging
```

If you already created `web/.kamal/secrets-common`, you can copy that file into
`site/.kamal/` and `frontend/.kamal/` instead — the GHCR lines are identical. Site and
SPA ignore the `RAILS_MASTER_KEY` line that only the API uses.

These copies are gitignored under `web/` (and should stay local everywhere). They contain
no raw credentials — they interpolate environment variables you export before deploying:

| Variable | Used for |
|---|---|
| `KAMAL_REGISTRY_PASSWORD` | GitHub token with `write:packages` for GHCR |
| `JWT_SECRET_KEY_PRODUCTION` | token signing key for production |
| `JWT_SECRET_KEY_STAGING` | token signing key for staging, different from production's |
| `POSTGRES_PASSWORD` | password of the `scholarpremium` PostgreSQL role |
| `REDIS_PASSWORD` | `requirepass` value of the Redis instance |
| `API_DOCS_USERNAME` | HTTP Basic Auth user for `/api-docs` on staging |
| `API_DOCS_PASSWORD` | HTTP Basic Auth password for `/api-docs` on staging |
| `POSTMARK_API_TOKEN_STAGING` | Postmark Server API token for transactional e-mail on staging |
| `POSTMARK_API_TOKEN_PRODUCTION` | Postmark Server API token for transactional e-mail on production |

URL-encode the database and Redis passwords. A literal `@`, `:`, `/`, `?`, or `#` inside
a password breaks `DATABASE_URL` parsing, and the failure looks like a wrong host rather
than a bad password.

On a local machine the GHCR username is not in that table: `secrets-common`
derives it from `gh config get -h github.com user`. GitHub Actions does not call
`gh config`. It uses the repository secret `KAMAL_REGISTRY_USERNAME`.

`KAMAL_REGISTRY_PASSWORD` must be a **classic** personal access token with
`write:packages` and `read:packages`, and your account needs write access to packages in
the `DLA-Solutions` organization. Do not point it at a general-purpose `GITHUB_TOKEN`:
tokens minted for the API and the `gh` CLI normally lack the packages scopes, and GHCR
rejects them with a 401 that looks like a wrong password. Verify before deploying:

```bash
docker login ghcr.io -u "$(gh config get -h github.com user)" \
  --password-stdin <<< "$KAMAL_REGISTRY_PASSWORD"
```

The first push creates the `scholarpremium` package under the organization. It is private
by default, which is fine — Kamal runs `docker login` on the app server too, using these
same credentials, before pulling.

## Preflight

```bash
cd web
bin/deploy-preflight
```

Read-only. It checks the five environment variables, that the two JWT keys actually differ,
that the registry token carries `write:packages`, that DNS resolves to the app server, that
SSH and the Docker daemon answer, and — over SSH, since `10.0.0.3` is private — that the
four databases and Redis accept the credentials. It exits non-zero when anything is missing,
which is faster than reading it out of a half-finished `kamal setup`.

The Active Record encryption keys are not checked there: the app validates them at boot, so
a missing key fails the health check and the deploy never takes traffic.

## First deploy

Routine publishes go through GitHub Actions. `kamal setup` below is the
first-time host bootstrap from a machine that already has local secrets.

Run from each service directory, once per destination.

**Order matters.** Use **fresh-host order** only when no Kamal service already owns the
hostname. If the API was deployed alone first (typical on staging), follow
[Cutover when the API already owns the host](#cutover-when-the-api-already-owns-the-host)
above — remove API proxy registration, then site → API → school SPA → backoffice SPA.

Fresh-host order (empty hostname):


```bash
# 1. Site (domain root)
cd site
bin/deploy-preflight          # optional
kamal setup -d staging
kamal deploy -d staging

# 2. School SPA (/app)
cd frontend/app
kamal setup -d staging
kamal deploy -d staging

# 3. Backoffice SPA (/backoffice)
cd ../backoffice
kamal setup -d staging
kamal deploy -d staging

# 4. API (path prefixes) — last
cd web
kamal setup -d staging
kamal deploy -d staging
```

Repeat with `-d production` for production. `setup` installs Docker and kamal-proxy on the
server, pushes the image, and boots the app. TLS certificates are issued by Let's Encrypt
through kamal-proxy, so the DNS records must already point at `77.42.33.33` — otherwise
certificate issuance fails and the container comes up without HTTPS.

Before the first push, create the GHCR packages `scholarpremium-site`,
`scholarpremium-spa`, and `scholarpremium-backoffice-spa` (private, same org as the API
image). Site and both SPAs only need `.kamal/secrets-common` (registry credentials); copy
from `.kamal/secrets-common.example`.

## Day-to-day

Push to `staging` publishes staging. After QA, fast-forward `origin/staging` onto
`main` and push `main`; that push publishes production. To redeploy without a new
commit, run the workflow manually (`workflow_dispatch`) on that same branch and
pick one layer or all. Set the migrate checkbox only when the API should run
`db:migrate`.

Confirm `/`, `/app/`, `/backoffice/`, and `/up` on staging before promoting
`main`. `/backoffice/` must return the backoffice SPA (not the site landing).
Smoke is a read-only GET — do not POST invite, password reset, or other
mailer-triggering routes on staging or production (see
`docs/guidelines/web/mailers.md`).

Discord notify on the Actions path is best-effort via
`DISCORD_DEPLOY_WEBHOOK_URL`. Jira **Ready to QA** stays manual.

### Local fallback

When `.kamal/secrets*` already exist, from the repo root:

```bash
bin/deploy staging
bin/deploy production
# optional layer: bin/deploy staging web
```

Outside Actions the script runs `bin/require-deploy-branch` and does not run
tests. The same layer order (site → school SPA → backoffice SPA → API) is what
a direct `kamal deploy -d <dest>` from each service directory does; prefer
`bin/deploy` so the branch check stays in one place.

Logs and console (API only, from `web/`):

```bash
kamal app logs -f -d production  # or: kamal logs -d production
kamal console -d production      # rails console
kamal shell -d production        # bash in the running container
kamal dbc -d production          # rails dbconsole
```

The local fallback skills `deploy-staging` / `deploy-production` still call the
`discord-deploy` MCP `notify_deploy` after smoke, on success and on failure.
Configure `DISCORD_BOT_TOKEN` + `DISCORD_DEPLOY_CHANNEL_ID` in `.cursor/mcp.env`
for that path (channel ID is copied with Developer Mode). This is School Lab /
Scholar Premium only.

## API documentation (staging only)

Staging exposes Swagger UI at `https://staging.scholarpremium.com.br/api-docs`, protected
by HTTP Basic Auth. Production does not mount `/api-docs`.

On the default path, `API_DOCS_USERNAME` and `API_DOCS_PASSWORD` are secrets on
the GitHub Environment `staging`. The local fallback still interpolates them
from the shell into `web/.kamal/secrets.staging` before `bin/deploy staging`
(see `.kamal/secrets.staging.example`). Verify with
`kamal secrets print -d staging` that both values are non-empty — an exported shell
variable that is not interpolated into `.kamal/secrets.staging` still produces a
failed boot. Local development serves `/api-docs` without credentials.

**Kamal destination merge:** `env.secret` in `deploy.staging.yml` **replaces** the
base list in `deploy.yml` (it does not append). Staging must repeat every secret from
`deploy.yml` plus the staging-only `API_DOCS_*` entries.

## Transactional e-mail (Postmark)

Collection régua reminders use Postmark when `POSTMARK_API_TOKEN` is set on the API
container. `MAIL_FROM` defaults to `contato@scholarpremium.com.br` via `deploy.yml`
(`env.clear`); override per destination in `deploy.<destination>.yml` if needed.

Set **distinct** Postmark Server API tokens per destination. On the default path
they are `POSTMARK_API_TOKEN_STAGING` (Environment `staging`) and
`POSTMARK_API_TOKEN_PRODUCTION` (Environment `production`). The local fallback
exports them in the shell:

```bash
export POSTMARK_API_TOKEN_STAGING='...'
export POSTMARK_API_TOKEN_PRODUCTION='...'
```

Add `POSTMARK_API_TOKEN=$POSTMARK_API_TOKEN_STAGING` (or `_PRODUCTION`) to the
gitignored `.kamal/secrets.<destination>` file — see the `.example` templates. Verify
before deploy:

```bash
cd web
kamal secrets print -d staging | grep POSTMARK_API_TOKEN
```

The `MAIL_FROM` address must be a verified Sender Signature or domain in Postmark.
Without a token, the API still boots; régua reminders are skipped.

## Rollback

Each service rolls back independently:

```bash
cd site && kamal rollback -d staging
cd frontend/app && kamal rollback -d staging
cd frontend/backoffice && kamal rollback -d staging
cd web && kamal rollback -d staging
```

```bash
kamal rollback -d production            # previous version (run from the service dir)
kamal app containers -d production      # list versions still on the server
kamal rollback <version> -d production
```

Rollback swaps the container back to a previous image. **It does not roll back the
database.** A deploy carrying a destructive migration is not safely reversible this
way — split it into an additive deploy and a later cleanup deploy.

**Risk:** rolling back the API without site/SPA in place returns the entire host to Rails.
Plan coordinated rollbacks if needed.

## Docker build context (site and SPA)

`site/`, `frontend/app/`, and `frontend/backoffice/` Dockerfiles live in each service
directory but **build from the monorepo root**: they `COPY site/...`, `COPY frontend/...`,
and `COPY packages/design-tokens`. Kamal is always run from the service directory (`cd
site`, `cd frontend/app`, `cd frontend/backoffice`); `bin/kamal` in those folders keeps
that cwd.

In each service's `config/deploy.yml`:

- `builder.context: ..` — Docker build context is the repository root.
- `builder.dockerfile: Dockerfile` — path relative to the **service directory**, not the
  context. Kamal checks the file with `File.expand_path(dockerfile)` from the process cwd
  before invoking `docker buildx`; `site/Dockerfile` or `frontend/app/Dockerfile` would
  look for a nested path (`site/site/Dockerfile`) and fail with `Missing site/Dockerfile`.

The API (`web/`) builds from `web/` with the default Dockerfile in that folder; it does not
set `builder.context`.

## Build performance

`builder.arch` is `amd64`. The GitHub Actions runner is amd64, so the default path
builds there and the app server only pulls the image. Do not enable `builder.remote`
for that path — it would build on the server.

On an arm64 Mac using the local fallback, the same `amd64` target means QEMU
emulation, and compiling native gems (`pg`, `bootsnap`) takes several minutes.
Uncomment `builder.remote` in `config/deploy.yml` only for that local case.

## Notes

- **Cora certificates** are not part of the deploy. The per-school certificate and private
  key are stored encrypted on `school_payment_providers`, using the Active Record
  encryption keys from the credentials — which is why those keys must be real before any
  school uploads credentials. See `docs/guidelines/web/gateways.md`.
- **Local CI; CD on GitHub Actions.** Tests stay on `bin/ci` — see
  `docs/guidelines/process/local-ci.md`. The deploy workflow does not run them.
  Push to `staging` or `main` runs `bin/deploy` on `ubuntu-latest`. Local
  `bin/deploy` is the fallback when `.kamal/secrets*` already exist.
- **Active Storage** writes to a Kamal volume on the app server. That disk is not
  backed up by the deploy process; migrating to S3 is an open decision.
