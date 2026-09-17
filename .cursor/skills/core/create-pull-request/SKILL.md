---
name: create-pull-request
description: Create a GitHub pull request in DLA-Solutions/school_lab. Use when the user asks to open a PR, create a pull request, submit changes for review, or says "pode versionar" / "versione" / "versionar" (after atomic commits and push).
---

# Create Pull Request

Open PRs in `DLA-Solutions/school_lab` when the branch is ready for review. **Local CI is not required** before PR creation — essential CI runs at deploy time (skills `deploy-staging` / `deploy-production`).

Subagent **backend-ci** can run CI, fix failures, commit atomically, push, and open a PR when the user asks for that full pipeline. Use this skill directly when only the PR step is needed.

## "Pode versionar" (ship branch)

When the user says **"pode versionar"**, **"versione"**, or **"versionar"**, run the full ship pipeline — not PR-only:

1. **Atomic commits** — rule `git-atomic-commits` (one logical change per commit).
2. **Push** — `git push -u origin HEAD`.
3. **Open PR** — this skill (`gh pr create --base staging`); return the PR URL.

Step 3 is mandatory after steps 1–2 unless a PR already exists for the branch (then push only).

## Workflow

Copy and track:

```
- [ ] 1. git status / diff / log (parallel)
- [ ] 2. Push branch if needed (git push -u origin HEAD)
- [ ] 3. gh pr create --base staging
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
gh pr create --base staging --title "..." --body "$(cat <<'EOF'
## Summary
- ...

## Test plan
- [ ] ...

EOF
)"
```

Use HEREDOC for the body. Return the PR URL.

If a PR already exists for the branch, push only — do not create a duplicate.

Default base is **`staging`** (QA). Do not open feature PRs against `main`. Production
promotion is a local fast-forward, not a GitHub squash/rebase merge:

```bash
git fetch origin
git checkout main
git merge --ff-only origin/staging
git push origin main
```

An optional PR `--base main --head staging` can exist for review visibility. After the
FF push, GitHub marks it merged. Never click Squash or Rebase and merge on that PR.

## Branch naming

Skill `branch-naming` — prefixes: `feature/`, `fix/`, `refactor/`, `chore/`, `docs/`.

## Rules

- Never amend/push unless user rules allow.
- CI fixes (when run manually): follow rule `git-atomic-commits`; subagent **backend-ci** is authorized to commit CI fixes without a separate user request.
