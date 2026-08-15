---
name: run-backend-ci
description: Runs local CI for web/ or the full monorepo (path filters match GitHub Actions). Use bin/ci before PRs, web/bin/backend-ci for web-only, or when the user asks to run backend CI.
---

# Run Local CI

**Preferred entrypoint:** `bin/ci` at the repo root — path filters match `.github/workflows/ci.yml`
(only runs surfaces changed vs `origin/main`).

`web/bin/backend-ci` remains for **web/** only (lint, security, RSpec, OpenAPI, optional Docker).

## Install git hooks (once per clone)

```bash
bin/install-git-hooks   # or: make install-hooks
```

| Hook | What |
|------|------|
| `pre-commit` | Fast lint on staged files (RuboCop / ESLint per surface) |
| `pre-push` | Fast `bin/ci` for changed surfaces (`CI_FULL=1` for full) |

Bypass: `git commit --no-verify` / `git push --no-verify`.

## Quick start

```bash
# Monorepo — only changed surfaces (recommended before PR)
bin/ci                 # fast path (default)
bin/ci --full          # full merge gate before merge
CI_FULL=1 bin/ci

# Web only
web/bin/backend-ci     # fast (default)
web/bin/backend-ci --full
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
| `site/**` | noted only (no PR CI job — validate with `make site-build` before deploy) |
| `.github/workflows/ci.yml`, `bin/ci` | all surfaces |

Docker image build runs only when `web/Dockerfile`, `Gemfile`, or production-related files
changed — or with `bin/ci --docker` / `web/bin/backend-ci --docker`.

## Stamps and PR gate

On success, `bin/ci` writes `.cursor/ci.stamp` with `surfaces=web,frontend,...`.
`web/bin/backend-ci` also writes `.cursor/backend-ci.stamp` and `ci.stamp` (`surfaces=web`).

Hook `.cursor/hooks/gate-pr-create.sh` requires `ci.stamp` on `HEAD` covering all surfaces in
the diff vs `origin/main`.

## Prerequisites

- Ruby + Bundler (`cd web && bundle install`)
- PostgreSQL at `localhost:5432` — `make services-up` if needed
- Node 22 for SPA surfaces
- Docker only when production image step runs

## Full vs fast (web surface)

| Mode | When to use |
|------|-------------|
| `bin/ci` | Default before PR — all changed surfaces |
| `bin/ci --fast` | Iteration; scoped web lint/specs |
| `web/bin/backend-ci` | Web-only full gate |
| `web/bin/backend-ci --skip-docker` | Web full tests without Docker |

Fast mode **falls back to full RSpec** when the diff touches `Gemfile`, migrations, `schema.rb`, or `Dockerfile`. OpenAPI steps run only when API contract files changed.

## Ship when green

```bash
git push -u origin HEAD
gh pr create ...
```

Skill `create-pull-request` covers PR format. Delegate web/ fix loops to **backend-ci**.
