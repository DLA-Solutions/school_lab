---
name: create-pull-request
description: Create a GitHub pull request in DLA-Solutions/school_lab after backend CI passes. Use when the user asks to open a PR, create a pull request, or submit changes for review.
---

# Create Pull Request

Open PRs in `DLA-Solutions/school_lab` **only after backend CI is green** on the current `HEAD`.

Subagent **backend-ci** runs this full pipeline by default (CI → fix → atomic commits → push → PR). Use this skill directly when CI is already green or when only the PR step is needed.

## Gate (mandatory)

**Do not run `gh pr create` until CI passes for the surfaces your branch actually changed.**

1. Run the narrowest green gate:
   - **`web/` only** (plus docs/`.cursor` churn): `web/bin/backend-ci --full`
   - **Multiple product surfaces** (`frontend/`, `site/`, etc.): `bin/ci` from repo root
2. Confirm exit code 0 and `.cursor/ci.stamp` contains the same SHA as `git rev-parse HEAD`.
3. If CI fails: fix issues, commit atomically, re-run until green. **Stop and report** if blocked — never open a PR on red CI.

The PR hook (`.cursor/hooks/gate-pr-create.sh`) uses **path-aware** checks vs `origin/main`: only product paths count. Changes confined to `bin/ci`, `.cursor/`, or `docs/` do **not** force frontend/site/backoffice CI on a web-only feature branch.

## Workflow

Copy and track:

```
- [ ] 1. git status / diff / log (parallel)
- [ ] 2. Local CI green (`bin/ci` or `web/bin/backend-ci` when web-only)
- [ ] 3. Commit any CI fixes (atomic, one concern per commit)
- [ ] 4. Re-run backend CI if commits were made
- [ ] 5. Push branch if needed (git push -u origin HEAD)
- [ ] 6. gh pr create
```

### 1. Gather context (parallel)

```bash
git status
git diff
git log --oneline -10
git rev-parse --abbrev-ref HEAD
git rev-parse @{u} 2>/dev/null || true
```

### 2. Backend CI

```bash
bin/ci
head -1 .cursor/ci.stamp
git rev-parse HEAD
```

Both SHAs must match.

### 3. CI fix commits

When CI failures require code changes, follow rule `git-atomic-commits`:

- One atomic commit per fix type (RuboCop, spec, OpenAPI, security).
- Imperative commit message focused on **why**.
- Re-run `web/bin/backend-ci` after commits before push/PR.

Subagent **backend-ci** is authorized to commit CI fixes without a separate user request.

### 4. Push

```bash
git push -u origin HEAD
```

Requires `git_write` + network permissions.

### 5. Create PR

```bash
gh pr create --title "..." --body "$(cat <<'EOF'
## Summary
- ...

## Test plan
- [ ] ...

EOF
)"
```

Use HEREDOC for the body. Return the PR URL.

If a PR already exists for the branch, push only — do not create a duplicate.

## Branch naming

Skill `branch-naming` — prefixes: `feature/`, `fix/`, `refactor/`, `chore/`, `docs/`.

## Rules

- Never skip backend CI to save time.
- Never amend/push unless user rules allow.
- Hook `gate-pr-create.sh` blocks `gh pr create` without a valid stamp — if blocked, run `web/bin/backend-ci` first.
