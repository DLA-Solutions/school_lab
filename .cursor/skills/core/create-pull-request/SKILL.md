---
name: create-pull-request
description: Create a GitHub pull request in DLA-Solutions/school_lab after backend CI passes. Use when the user asks to open a PR, create a pull request, or submit changes for review.
---

# Create Pull Request

Open PRs in `DLA-Solutions/school_lab` **only after backend CI is green** on the current `HEAD`.

## Gate (mandatory)

**Do not run `gh pr create` until backend CI passes.**

1. Run `web/bin/backend-ci` (or delegate to subagent **backend-ci**).
2. Confirm exit code 0 and `.cursor/backend-ci.stamp` contains the same SHA as `git rev-parse HEAD`.
3. If CI fails: fix issues, re-run until green. **Stop and report** if blocked — never open a PR on red CI.

For branches that only touch `frontend/`, `site/`, or docs, still run backend CI when `web/` files changed; skip only when the diff has **zero** files under `web/`.

## Workflow

Copy and track:

```
- [ ] 1. git status / diff / log (parallel)
- [ ] 2. Backend CI green (web/bin/backend-ci)
- [ ] 3. Push branch if needed (git push -u origin HEAD)
- [ ] 4. gh pr create
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
web/bin/backend-ci
head -1 .cursor/backend-ci.stamp
git rev-parse HEAD
```

Both SHAs must match.

### 3. Push

```bash
git push -u origin HEAD
```

Requires `git_write` + network permissions.

### 4. Create PR

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

## Branch naming

Skill `branch-naming` — prefixes: `feature/`, `fix/`, `refactor/`, `chore/`, `docs/`.

## Rules

- Never skip backend CI to save time.
- Never amend/push unless user rules allow.
- Do not commit unless the user asked.
- Hook `gate-pr-create.sh` blocks `gh pr create` without a valid stamp — if blocked, run `web/bin/backend-ci` first.
