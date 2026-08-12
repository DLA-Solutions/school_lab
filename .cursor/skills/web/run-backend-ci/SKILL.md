---
name: run-backend-ci
description: Runs the full backend CI gate for web/ (RuboCop, Brakeman, bundler-audit, RSpec, OpenAPI drift, production Docker image). Use before opening pull requests, when validating web/ changes, or when the user asks to run backend CI.
---

# Run Backend CI

Local mirror of `.github/workflows/ci.yml` **backend jobs** (`lint`, `scan_ruby`, `test`, `build_image`).

## Quick start

```bash
# From repo root — starts Postgres via Makefile if needed
web/bin/backend-ci
```

Prerequisites:

- Ruby + Bundler installed (`cd web && bundle install`)
- PostgreSQL reachable at `localhost:5432` (defaults match `web/.env.example`). If not: `make services-up`
- Docker running (production image build — same as GitHub Actions `build_image` job)

On success, writes `.cursor/backend-ci.stamp` with the current `HEAD` SHA.

## Steps (same order as GitHub Actions)

| Step | Command (from `web/`) |
|------|------------------------|
| Lint | `bin/rubocop -f github` |
| Brakeman | `bin/brakeman --no-pager --exit-on-error` |
| Gem audit | `bin/bundler-audit` |
| DB | `RAILS_ENV=test bin/rails db:test:prepare` |
| Tests | `bundle exec rspec` |
| OpenAPI | `bundle exec rake swagger:build` |
| Drift | `git diff --exit-code swagger/v1/swagger.yaml` |
| Image | `docker build .` |

## Scoped re-runs (after a fix)

Run only what failed, then full `web/bin/backend-ci` before PR:

```bash
cd web
bundle exec rspec spec/path/to_spec.rb    # single spec
bin/rubocop -a path/to/changed.rb       # style fix
bundle exec rake swagger:build            # OpenAPI only
```

## Agent delegation

For automated fix-and-retry, delegate to subagent **backend-ci** (`Task` with `subagent_type: backend-ci` or `@backend-ci`).

## PR gate

Skill `create-pull-request` requires a green `web/bin/backend-ci` before `gh pr create`. Hook `.cursor/hooks/gate-pr-create.sh` enforces the stamp at shell level.
