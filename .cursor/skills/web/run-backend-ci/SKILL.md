---
name: run-backend-ci
description: Runs the full backend CI gate for web/ (RuboCop, Brakeman, bundler-audit, RSpec, OpenAPI drift, production Docker image), fixes failures with atomic commits, and opens a PR when green. Use before shipping web/ changes or when the user asks to run backend CI.
---

# Run Backend CI

Local mirror of `.github/workflows/ci.yml` **backend PR jobs** (`lint`, `scan_ruby`, `test`). The
`build_image` job runs on `main` only; use full `web/bin/backend-ci` locally when you want to
validate the production image before merge.

For the full fix → commit → PR pipeline, delegate to subagent **backend-ci** or follow the loop below.

## Quick start

```bash
# From repo root — starts Postgres via Makefile if needed
web/bin/backend-ci              # full gate (lint, security, all specs, OpenAPI, Docker)
web/bin/backend-ci-fast           # scoped lint/tests; skips Docker (typical local iteration)
web/bin/backend-ci --skip-docker  # full lint/tests/OpenAPI; skip Docker only
```

Prerequisites:

- Ruby + Bundler installed (`cd web && bundle install`)
- PostgreSQL reachable at `localhost:5432` (defaults match `web/.env.example`). If not: `make services-up`
- Docker running **only for full local CI** (production image build). GitHub Actions skips
  `build_image` on PRs; the image is built and pushed on merge to `main`. Use `--fast` or
  `--skip-docker` when Docker is unavailable locally.

On success, writes `.cursor/backend-ci.stamp` with the current `HEAD` SHA (fast mode adds `mode=fast` on line 2). GitHub Actions runs backend lint/security/test on PRs when `web/` changes (path filters).

## Full vs fast

| Mode | When to use |
|------|-------------|
| `web/bin/backend-ci` | Before merge when Docker is available; includes local image build (GitHub runs that step on `main` only). |
| `web/bin/backend-ci-fast` | Small `web/` changes (policy, controller, specs); skips Docker; scopes RuboCop/RSpec to files changed vs `origin/main`. Brakeman and bundler-audit always run in full. |
| `web/bin/backend-ci --skip-docker` | Full lint/tests/OpenAPI without a local Docker build. |

Fast mode **falls back to full RSpec** when the diff touches `Gemfile`, migrations, `schema.rb`, or `Dockerfile`. OpenAPI steps run only when request specs, controllers, serializers, or swagger files changed.

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

## Fix loop (when CI fails)

1. Read failing step output.
2. Fix with the smallest safe diff.
3. Re-run the **narrowest** check that proves the fix.
4. **Commit atomically** — rule `git-atomic-commits`; one concern per commit (RuboCop, spec fix, OpenAPI regen, etc.).
5. Run full `web/bin/backend-ci` again before push/PR.

Never leave CI fixes uncommitted. Never weaken CI to get green.

## Scoped re-runs (after a fix, before full CI)

```bash
cd web
bundle exec rspec spec/path/to_spec.rb    # single spec
bin/rubocop -a path/to/changed.rb       # style fix
bundle exec rake swagger:build            # OpenAPI only
```

## Ship when green

When stamp matches `git rev-parse HEAD`:

```bash
git push -u origin HEAD
gh pr create --title "..." --body "$(cat <<'EOF'
## Summary
- ...

## Test plan
- [ ] ...

EOF
)"
```

Skill `create-pull-request` covers PR format and gate checks. Hook `.cursor/hooks/gate-pr-create.sh` blocks `gh pr create` without a valid stamp.

## Agent delegation

Rule `agent-routing`: parent agents delegate **web/** CI to **backend-ci**, not direct implementation.

For automated fix → commit → PR, delegate to subagent **backend-ci** (`Task` with `subagent_type: backend-ci` or `@backend-ci`).
