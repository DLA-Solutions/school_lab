> Deploy staging from staging and production from main — branch policy for Kamal
>
> **Always relevant** — read this whenever working anywhere in the repo.

# Deploy from environment branches

Deploy **staging** only from `staging`, and **production** only from `main`. How to run
Kamal: rule `deployment` and skill **`deploy-kamal`**. One-pager:
`docs/guidelines/process/git-and-deploy-flow.md`. ADR: `docs/adr/003-environment-branches.md`.

## Implementation flow

1. Branch from **`staging`** — naming per rule `git-branch-naming`.
2. Atomic commits on the feature branch — rule `git-atomic-commits`.
3. Open a PR targeting **`staging`**; wait for merge.
4. Deploy staging: checkout `staging`, pull, `bin/require-deploy-branch staging`, then Kamal `-d staging`.
5. After QA: on `main`, `git merge --ff-only origin/staging` and `git push origin main`
   (optional review PR `staging` → `main`; do not squash/rebase-merge it). Then checkout
   `main`; pull; `bin/require-deploy-branch production`; Kamal `-d production`.

Deploy is **never** a substitute for review or merge. Do not deploy a feature branch to
“try it on staging”.

## When deploy is allowed

| Destination | Required branch | Remote must match |
|-------------|-----------------|-------------------|
| `-d staging` | `staging` | `origin/staging` |
| `-d production` | `main` | `origin/main` |

## When deploy is forbidden

- Any `feature/*`, `fix/*`, `refactor/*`, `chore/*`, or `docs/*` branch.
- Open PR not yet merged to the environment branch.
- `-d staging` while on `main`, or `-d production` while on `staging`.
- Local environment branch not fast-forwarded to its `origin/*` counterpart.
- Merge-commit, squash, or rebase promotion of `staging` → `main` (use local
  `git merge --ff-only` so production SHA = QA SHA).

## Hotfix

If production is broken and `staging` has unrelated unapproved work: branch from `main`,
PR to `main`, deploy production, then merge `main` into `staging`.

## Pre-deploy (required)

```bash
# Staging
git checkout staging && git pull origin staging
bin/require-deploy-branch staging

# Production (after promoting with git merge --ff-only origin/staging)
git checkout main && git pull origin main
bin/require-deploy-branch production
```

Then run Kamal from the service directory per skill **`deploy-kamal`**.

## Agents

- **Parent agents**, **`deploy-kamal`**, **`backend-ci`**, and any deploy automation —
  **must not** deploy from a feature branch; **must not** deploy production from `staging`.
- If the user asks to deploy while on a feature branch, explain the policy: finish PR to
  `staging` → merge → checkout `staging` → pull → deploy staging.
- If the user asks to deploy production before a `staging` → `main` fast-forward, refuse
  (except the hotfix path above).
- **`backend-ci`** opens PRs against **`staging`**; it does not deploy.
- **Deploy agents** — after `kamal deploy` finishes (success or failure), **must** post to
  Discord via `discord-deploy` MCP `notify_deploy`. See skill **`deploy-kamal`** § Discord
  notify. Never end a deploy task without this step.
