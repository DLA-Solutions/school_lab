---
name: run-backend-ci
description: Runs local CI for web/ or the full monorepo (path filters match GitHub Actions). Use bin/ci or web/bin/backend-ci manually, before deploy, or when the user asks to run backend CI.
---

# Run Local CI

**Preferred entrypoint:** `bin/ci` at the repo root — path filters match `.github/workflows/ci.yml`
(only runs surfaces changed vs `origin/main`).

`web/bin/backend-ci` remains for **web/** only (lint, security, RSpec, OpenAPI, optional Docker).

**When CI runs:** manually, on demand, and **mandatorily before deploy** (skill `deploy-kamal`). Git hooks do **not** run CI on commit or push; PR creation is not gated.

## Install git hooks (once per clone)

```bash
bin/install-git-hooks   # or: make install-hooks
```

| Hook | What |
|------|------|
| `pre-commit` | No-op (no CI or lint) |
| `pre-push` | No-op (CI runs at deploy only) |

Hooks are no-ops — CI runs at deploy only.

## Quick start

```bash
# Monorepo — only changed surfaces
bin/ci                 # fast path (default)
bin/ci --full          # full gate (required before deploy for multi-surface)
CI_FULL=1 bin/ci

# Web only
web/bin/backend-ci     # fast (default)
web/bin/backend-ci --full   # required before API deploy
web/bin/backend-ci-fast
web/bin/backend-ci --docker   # force production image build
```

Makefile aliases: `make ci`, `make ci-fast`.

## Surface mapping (same as GitHub Actions)

| Changed paths | Local jobs |
|---------------|------------|
| `web/**` | RuboCop, Brakeman, bundler-audit, RSpec, OpenAPI drift |
| `frontend/app/**`, `packages/design-tokens/**` | `npm ci`, `test:run`, build (`/app/`) |
| `frontend/backoffice/**`, `packages/design-tokens/**` | same for backoffice (`/backoffice/`) |
| `site/**` | noted only (no automated PR checks — validate with `make site-build` before deploy) |
| `.github/workflows/ci.yml`, `bin/ci` | all surfaces |

Docker image build runs only when `web/Dockerfile`, `Gemfile`, or production-related files
changed — or with `bin/ci --docker` / `web/bin/backend-ci --docker`.

## Stamps (optional)

On success, `bin/ci` writes `.cursor/ci.stamp` with `surfaces=web,frontend,...`.
`web/bin/backend-ci` also writes `.cursor/backend-ci.stamp` and `ci.stamp` (`surfaces=web`).
Stamps are bookkeeping only — not required for commit, push, or PR creation.

## Prerequisites

- Ruby + Bundler (`cd web && bundle install`)
- PostgreSQL at `localhost:5432` — `make services-up` if needed
- Node 22 for SPA surfaces
- Docker only when production image step runs

## Full vs fast (web surface)

| Mode | When to use |
|------|-------------|
| `bin/ci --full` | Before deploy (multi-surface) or full validation |
| `bin/ci --fast` | Iteration; scoped web lint/specs |
| `web/bin/backend-ci --full` | Before API deploy |
| `web/bin/backend-ci --skip-docker` | Web full tests without Docker |

Fast mode **falls back to full RSpec** when the diff touches `Gemfile`, migrations, `schema.rb`, or `Dockerfile`. OpenAPI steps run only when API contract files changed.

## Ship

```bash
git push -u origin HEAD
gh pr create ...
```

PR creation is not blocked by local CI. Skill `create-pull-request` covers PR format. Delegate web/ CI fix loops to **backend-ci** when the user asks.
