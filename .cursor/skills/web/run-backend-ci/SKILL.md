---
name: run-backend-ci
description: Runs local CI for web/ or the full monorepo (path filters match GitHub Actions). Use manually, before deploy (deploy-kamal skill), or when the user asks to run backend CI — not on commit, push, or PR.
---

# Run Local CI

**When to run:** manually, before **deploy** (mandatory per `deploy-kamal` skill), or when the user asks. **Not** on `git commit`, `git push`, or `gh pr create`.

**Preferred entrypoint:** `bin/ci` at the repo root — path filters match `.github/workflows/ci.yml`
(only runs surfaces changed vs `origin/main`).

`web/bin/backend-ci` remains for **web/** only (lint, security, RSpec, OpenAPI, optional Docker).

## Git hooks

```bash
bin/install-git-hooks   # or: make install-hooks
```

Hooks are **no-ops** — they do not run CI or lint. CI runs before deploy only.

## Quick start

```bash
# Monorepo — only changed surfaces
bin/ci                 # fast path (default)
bin/ci --full          # full gate (use before full-stack deploy)

# Web only — use before API deploy
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
| `site/**` | noted only — validate with `make site-build` before deploy |

Docker image build runs when `web/Dockerfile`, `Gemfile`, or production-related files
changed — or with `bin/ci --docker` / `web/bin/backend-ci --docker`.

## Stamps (optional)

On success, `bin/ci` may write `.cursor/ci.stamp`. Stamps are **informational** — they do not gate commit, push, or PR.

## Prerequisites

- Ruby + Bundler (`cd web && bundle install`)
- PostgreSQL at `localhost:5432` — `make services-up` if needed
- Node 22 for SPA surfaces
- Docker only when production image step runs

## Full vs fast (web surface)

| Mode | When to use |
|------|-------------|
| `bin/ci --full` | Before full-stack deploy |
| `web/bin/backend-ci --full` | Before API deploy |
| `web/bin/backend-ci-fast` | Iteration while fixing failures |
| `web/bin/backend-ci --skip-docker` | Web full tests without Docker |

Fast mode **falls back to full RSpec** when the diff touches `Gemfile`, migrations, `schema.rb`, or `Dockerfile`.

## Ship

Push and open PR without local CI. Run CI when fixing failures or before deploy.

Skill `create-pull-request` covers PR format. Delegate web/ fix loops to **backend-ci**.
