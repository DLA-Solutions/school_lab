# Local CI and CD

GitHub Actions workflows are **disabled** (see `.github/workflows/ci.yml`). Quality gates and
deploys run **locally** on developer machines.

| Concern | Where |
|---------|--------|
| CI (lint, test, build) | `bin/ci`, git hooks |
| CD (staging / production) | **Manual** — `kamal deploy` by the deploy owner |

Archived GitHub workflows: `.github/workflows/ci.yml.archived`, `openapi.yml.archived`.

## Install git hooks (once per clone)

```bash
bin/install-git-hooks
```

| Hook | When | What |
|------|------|------|
| `pre-commit` | `git commit` | Fast lint on **staged** files per surface (RuboCop, ESLint) |
| `pre-push` | `git push` | Fast `bin/ci` for surfaces in commits being pushed |

Bypass when needed: `git commit --no-verify`, `git push --no-verify`.

## bin/ci — smart per-surface CI

Path filters match the archived GitHub workflow (`ci.yml.archived`).

```bash
bin/ci                 # fast path for surfaces changed vs origin/main (default)
bin/ci --full          # full web gate: all RuboCop, Brakeman, bundler-audit, full RSpec
CI_FULL=1 bin/ci       # same as --full
bin/ci --since REF     # REF..HEAD (pre-push uses remote tip)
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

On success, writes `.cursor/ci.stamp` (used by `gh pr create` hook).

## CD — manual deploy

Deploys are **not** automated. See `deployment.md` and skill `deploy-kamal`.

```bash
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
