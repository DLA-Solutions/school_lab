# Deployment

How `web/` reaches production and staging. Deploys are manual, run from a developer
machine with Kamal 2.

## Topology

Two VPS. Only the app server is exposed to the internet.

```
Internet ──443──▶ app server (77.42.33.33)
                    kamal-proxy ──▶ container "scholarpremium-web" (production)
                                └──▶ container "scholarpremium-web" (staging)
                                        │
                                        └──▶ database server (10.0.0.3, private network)
                                               PostgreSQL 17 + Redis, both native
```

PostgreSQL and Redis are installed natively on the database server. They are **not**
Kamal accessories — Kamal never starts, stops, or upgrades them, and `config/deploy.yml`
has no `accessories` section. Provisioning and backups of that machine are handled
outside this repository.

Both destinations share the app server and the database server; they are separated by
Kamal destination, database name, Redis logical database, and Active Storage volume.

## Destinations

`config/deploy.yml` holds everything common. Per-environment values live in
`config/deploy.production.yml` and `config/deploy.staging.yml`.

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

Schema loading and migrations run automatically: `bin/docker-entrypoint` calls
`db:prepare` on boot. Demo seeds are guarded by `Rails.env.local?` in `db/seeds.rb`
and never run on a deployed environment.

## Application secrets

Two secrets have no usable default and the app **refuses to boot** without them outside
development and test (`config/initializers/security_secrets.rb`). A deploy missing either
one fails its health check instead of coming up in a weak state, which is deliberate.

- `active_record_encryption` — encrypts `school_payment_providers.certificate_pem` and
  `private_key_pem`, the school's Cora mTLS banking credentials.
- `jwt.secret_key` — signs API access tokens. A shared value would let anyone holding it
  forge a token for any user of any school, bypassing every Pundit policy.

Both live in the encrypted credentials, so `RAILS_MASTER_KEY` (already a Kamal secret) is
the only thing that has to reach the server. Generate and store them once:

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
jwt:
  secret_key: ...   # e.g. bin/rails secret
```

Do this **before** the first deploy. Rotating the encryption keys later means re-encrypting
every existing row, and rotating the JWT secret invalidates every access token in flight.

Development and test deliberately use fixed throwaway values committed to the repository,
so the suite runs without credentials — CI has no `RAILS_MASTER_KEY`. Those values protect
nothing real and must never be reused by a deployed environment.

## Prerequisites on the deploy machine

1. SSH access as `deploy` to `77.42.33.33`, with the key loaded in the agent.
2. Docker running locally (Kamal builds the image on your machine).
3. `web/config/master.key` present, and the credentials populated as described above.
4. Kamal secrets files, copied from the versioned templates:

```bash
cd web
cp .kamal/secrets-common.example      .kamal/secrets-common
cp .kamal/secrets.production.example  .kamal/secrets.production
cp .kamal/secrets.staging.example     .kamal/secrets.staging
```

These copies are gitignored. They contain no raw credentials — they interpolate
environment variables you export before deploying:

| Variable | Used for |
|---|---|
| `KAMAL_REGISTRY_PASSWORD` | GitHub token with `write:packages` for GHCR |
| `POSTGRES_PASSWORD` | password of the `scholarpremium` PostgreSQL role |
| `REDIS_PASSWORD` | `requirepass` value of the Redis instance |

URL-encode the database and Redis passwords. A literal `@`, `:`, `/`, `?`, or `#` inside
a password breaks `DATABASE_URL` parsing, and the failure looks like a wrong host rather
than a bad password.

The GHCR username is not in that table because `secrets-common` derives it from
`gh config get -h github.com user`, so each developer authenticates as themselves and no
account is pinned in the repository.

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

## First deploy

Run from `web/`, once per destination:

```bash
kamal setup -d staging
kamal setup -d production
```

`setup` installs Docker and kamal-proxy on the server, pushes the image, and boots the
app. TLS certificates are issued by Let's Encrypt through kamal-proxy, so the DNS
records must already point at `77.42.33.33` — otherwise certificate issuance fails and
the container comes up without HTTPS.

## Day-to-day

```bash
kamal deploy -d staging          # build, push, boot, health check, switch traffic
kamal deploy -d production

kamal app logs -f -d production  # or: kamal logs -d production
kamal console -d production      # rails console
kamal shell -d production        # bash in the running container
kamal dbc -d production          # rails dbconsole
kamal app exec -d production "bin/rails db:migrate"
```

Deploy staging first and confirm `/up` responds before touching production.

## Rollback

```bash
kamal rollback -d production            # previous version
kamal app containers -d production      # list versions still on the server
kamal rollback <version> -d production
```

Rollback swaps the container back to a previous image. **It does not roll back the
database.** A deploy carrying a destructive migration is not safely reversible this
way — split it into an additive deploy and a later cleanup deploy.

## Build performance

`builder.arch` is `amd64`. On an arm64 Mac that means QEMU emulation, and compiling
native gems (`pg`, `bootsnap`) takes several minutes. Uncomment `builder.remote` in
`config/deploy.yml` to build on the app server, which is already amd64.

## Notes

- **Cora certificates** are not part of the deploy. The per-school certificate and private
  key are stored encrypted on `school_payment_providers`, using the Active Record
  encryption keys from the credentials — which is why those keys must be real before any
  school uploads credentials. See `docs/guidelines/web/gateways.md`.
- **CI does not deploy.** `.github/workflows/ci.yml` builds the image to verify the
  Dockerfile but never pushes it. Automating deploys is separate scope.
- **Active Storage** writes to a Kamal volume on the app server. That disk is not
  backed up by the deploy process; migrating to S3 is an open decision.
