# ADR 003 — Environment branches (`staging` and `main`)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-29 |
| **Supersedes** | Deploy-from-`main`-only policy (Cursor rule `deploy-from-main`) |

## Context

Kamal already separates **destinations** (`-d staging` vs `-d production`): different hosts,
databases, Redis logical DBs, JWT secrets, Cora sandbox vs production, and storage volumes.
Git did not: both destinations deployed from `main` after merge.

That forced QA on `https://staging.scholarpremium.com.br` to happen **after** the code was
already on `main`, so the only gate to production was human discipline not to run
`kamal deploy -d production`. Feature branches were forbidden from deploying at all, which
blocked “test on staging first”.

The GitHub org is on the **Free** plan, so branch protection and rulesets are unavailable.
The policy has to live in process, Cursor rules, and `bin/require-deploy-branch`.

## Decision

Introduce a long-lived **`staging`** branch as the integration line for the staging
environment. **`main`** remains production.

```
feature/*  →  PR →  staging  →  kamal deploy -d staging  →  QA
staging    →  PR →  main     →  kamal deploy -d production
```

- Open feature/fix/chore/docs PRs against **`staging`** (GitHub default branch).
- Deploy **staging** only from branch `staging`, in sync with `origin/staging`.
- Deploy **production** only from branch `main`, in sync with `origin/main`.
- Promote `staging` → `main` with a **local fast-forward** (`git merge --ff-only origin/staging`
  on `main`, then `git push origin main`) so production deploys the same SHA that passed QA.
  GitHub’s squash / rebase / merge-commit buttons all create a new SHA — do not use them
  for promotion. An optional PR `staging` → `main` can exist for review; the FF push closes it.
- Do not deploy from `feature/*`, `fix/*`, `chore/*`, or `docs/*`.
- Hotfix that cannot wait for unrelated work on `staging`: branch from `main`, PR to
  `main`, deploy production, then merge `main` back into `staging`.

Infra destinations, secrets, and hosts do not change. This ADR only changes **which Git
ref** each destination may receive.

## Consequences

- Staging can move ahead of production. That is expected.
- Cursor agents and `bin/require-deploy-branch` refuse a destination/branch mismatch.
- Without GitHub Team, direct pushes to `main` or `staging` are not blocked by the host.
  Upgrade when budget allows; until then the checklist is the gate.
- `bin/ci` change detection defaults to `origin/staging`. Promotion PRs use
  `--base origin/main`.

## Migration

1. Create `origin/staging` from the then-current `origin/main` (identical SHA).
2. Retarget open feature PRs from `main` to `staging`.
3. Set the GitHub default branch to `staging`.
4. Replace the deploy-from-`main` rule with `deploy-environment-branches`.
5. Do not merge feature work to `main` until it has been on staging and approved.

Developer-facing flow: [`git-and-deploy-flow.md`](../guidelines/process/git-and-deploy-flow.md).
Deploy runbook: [`deployment.md`](../guidelines/process/deployment.md).
