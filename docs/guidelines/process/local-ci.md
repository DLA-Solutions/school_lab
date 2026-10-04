# Local CI and GitHub Actions CD

CI stays local. The GitHub Actions **test** workflow stays disabled (see
`.github/workflows/ci.yml`). Quality gates run on developer machines with `bin/ci`
before merge.

CD is not local. [`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml)
runs on `ubuntu-latest` and calls `bin/deploy`. That job does not run RuboCop, RSpec,
or any other test.

| Concern | Where |
|---------|--------|
| CI (lint, test, build) | `bin/ci`, `web/bin/backend-ci` — local, before merge |
| CD (staging / production) | GitHub Actions `bin/deploy` — no tests |

Archived CI workflows: `.github/workflows/ci.yml.archived`, `openapi.yml.archived`.

## When CI runs

| Action | CI? | CD? |
|--------|-----|-----|
| `git commit` | No | No |
| `git push` on a feature branch | No | No |
| `gh pr create` | No | No |
| Push to `staging` or `main` | No | Yes — `bin/deploy` on `ubuntu-latest`, no tests |
| `workflow_dispatch` on `staging` or `main` | No | Yes — one layer or all; migrate only if the checkbox is set |
| Local `bin/deploy` fallback | No | Yes — still no tests; run `bin/ci` before merge |

## Install git hooks (once per clone)

```bash
bin/install-git-hooks
```

| Hook | When | What |
|------|------|------|
| `pre-commit` | `git commit` | No-op (no CI or lint) |
| `pre-push` | `git push` | No-op |

Bypass: not needed (hooks are no-ops).

## bin/ci — smart per-surface CI

Path filters match the archived GitHub workflow (`ci.yml.archived`).

```bash
bin/ci                 # fast path for surfaces changed vs origin/staging (default)
bin/ci --full          # full web gate: all RuboCop, Brakeman, bundler-audit, full RSpec
CI_FULL=1 bin/ci       # same as --full
bin/ci --since REF     # REF..HEAD (manual scoped runs)
bin/ci --web           # force web/ only
make ci                # Makefile alias (fast)
```

### Surface mapping

| Changed paths | Checks |
|---------------|--------|
| `web/**` (fast) | Scoped RuboCop + RSpec for changed files; OpenAPI when contract files change |
| `web/**` (`--full`) | All RuboCop, Brakeman, bundler-audit, full RSpec, OpenAPI drift |
| `frontend/app/**`, `packages/design-tokens/**` | `npm ci`, `test:run`, production build |
| `frontend/backoffice/**`, design-tokens | same for backoffice |
| `site/**` | no automated tests — `make site-build` before deploy |

Fast mode skips Brakeman, bundler-audit, and Docker. Docs-only changes skip all surfaces
(stamp written; nothing to run).

Docker image build runs only on `--full` when production-related `web/` files changed, or with `bin/ci --docker`.

On success, writes `.cursor/ci.stamp` (optional bookkeeping; not required for PRs).

## CD — GitHub Actions

Push to `staging` publishes staging. Push to `main` publishes production. The
workflow does not run tests. Run `bin/ci` before merge.

The app server `77.42.33.33` only receives the image. There is no self-hosted
runner and no git clone on the server for deploy. Kamal on `ubuntu-latest` builds
the image, pushes it to GHCR, and uses SSH only to pull and swap the container.

`workflow_dispatch` is limited to the `staging` and `main` refs. The layer input
is `changed`, `all`, `site`, `frontend`, `backoffice`, or `web`. The migrate
checkbox defaults to off. On a push, `db:migrate` runs only when the API layer
deploys and the diff includes `web/db/migrate/**` or `web/db/schema.rb`. On the
button, it runs only when that checkbox is set and the API is one of the layers.

Smoke is a read-only GET. Discord notify is best-effort (optional
`DISCORD_DEPLOY_WEBHOOK_URL`; a missing webhook or a Discord outage does not fail
the job). Jira **Ready to QA** stays manual.

A push starts the job only for `site/**`, `frontend/app/**`,
`frontend/backoffice/**`, `packages/design-tokens/**`, `web/**`, `bin/deploy`, or
`.github/workflows/deploy.yml`. Docs-only commits do not deploy.
`packages/design-tokens/**` includes both SPAs.

### Secrets in the GitHub UI

A person creates Environments `staging` and `production` and fills the values
**before** merging the workflow. The repository does not create them. The first
push fails if they are missing.

Repository secrets (both jobs):

- `KAMAL_REGISTRY_USERNAME`
- `KAMAL_REGISTRY_PASSWORD` — classic PAT with `write:packages` and `read:packages`. Do not use `GITHUB_TOKEN`.
- `DEPLOY_SSH_PRIVATE_KEY` and `DEPLOY_KNOWN_HOSTS` — SSH for `deploy@77.42.33.33`
- `RAILS_MASTER_KEY`
- `POSTGRES_PASSWORD` and `REDIS_PASSWORD` — URL-encode `@`, `:`, `/`, `?`, and `#`
- `GOOGLE_OAUTH_CLIENT_ID`
- `DISCORD_DEPLOY_WEBHOOK_URL` — optional

Environment `staging`: `JWT_SECRET_KEY_STAGING`, `POSTMARK_API_TOKEN_STAGING`, `API_DOCS_USERNAME`, `API_DOCS_PASSWORD`.

Environment `production`: `JWT_SECRET_KEY_PRODUCTION`, `POSTMARK_API_TOKEN_PRODUCTION`.

The production JWT does not go in the staging environment. Full notes:
[`deployment.md`](deployment.md#secrets-in-the-github-ui).

### Local fallback

When `.kamal/secrets*` already exist, local `bin/deploy` is still valid. Outside
Actions it calls `bin/require-deploy-branch` and reads those files. It does not
run tests.

```bash
bin/deploy staging                 # or production
bin/deploy staging web             # site, frontend, backoffice, or web
```

## CI on GitHub Actions

The test workflow in `ci.yml` stays disabled. Restoring it is a separate change:
put jobs back from `ci.yml.archived`, replace the stub, and update this doc.
That does not turn CD on or off — deploy is already `.github/workflows/deploy.yml`.
