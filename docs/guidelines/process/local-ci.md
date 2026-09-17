# Local CI and CD

GitHub Actions workflows are **disabled** (see `.github/workflows/ci.yml`). Quality gates and
deploys run **locally** on developer machines.

| Concern | Where |
|---------|--------|
| CI (lint, test, build) | `bin/ci`, `web/bin/backend-ci` — manual or **before deploy** |
| CD (staging / production) | **Manual** — `kamal deploy` by the deploy owner |

Archived GitHub workflows: `.github/workflows/ci.yml.archived`, `openapi.yml.archived`.

## When CI runs

| Action | CI? |
|--------|-----|
| `git commit` | No |
| `git push` | No |
| `gh pr create` | No |
| `kamal deploy` / deploy skill | **Yes** — essential CI before deploy |

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

## CD — manual deploy

Deploys are **not** automated. Run essential CI before deploy — see `deployment.md` and skills `deploy-staging` / `deploy-production`. Staging deploys from branch `staging`; production from `main`.

```bash
bin/require-deploy-branch staging          # or production
cd web && kamal deploy -d staging          # or production
cd frontend/app && kamal deploy -d staging
cd frontend/backoffice && kamal deploy -d staging
cd site && kamal deploy -d staging
```

## Re-enabling GitHub Actions

When billing or a runner strategy is ready:

1. Restore workflow from `ci.yml.archived` (or cherry-pick jobs).
2. Remove or replace the disabled stub in `ci.yml`.
3. Update this doc and `deployment.md`.
