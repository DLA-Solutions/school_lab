---
name: create-pull-request
description: Create a GitHub pull request in DLA-Solutions/school_lab. Use when the user asks to open a PR, create a pull request, or submit changes for review.
---

# Create Pull Request

Open PRs in `DLA-Solutions/school_lab` when the branch is ready for review. **Local CI is not required** before PR creation — essential CI runs at deploy time (skill `deploy-kamal`).

Subagent **backend-ci** can run CI, fix failures, commit atomically, push, and open a PR when the user asks for that full pipeline. Use this skill directly when only the PR step is needed.

## Workflow

Copy and track:

```
- [ ] 1. git status / diff / log (parallel)
- [ ] 2. Push branch if needed (git push -u origin HEAD)
- [ ] 3. gh pr create
```

Optional: run `bin/ci` or `web/bin/backend-ci` manually when validating changes before review.

### 1. Gather context (parallel)

```bash
git status
git diff
git log --oneline -10
git rev-parse --abbrev-ref HEAD
git rev-parse @{u} 2>/dev/null || true
```

### 2. Push

```bash
git push -u origin HEAD
```

Requires `git_write` + network permissions.

### 3. Create PR

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

- Never amend/push unless user rules allow.
- CI fixes (when run manually): follow rule `git-atomic-commits`; subagent **backend-ci** is authorized to commit CI fixes without a separate user request.
