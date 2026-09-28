# Git and deploy flow

Short version of [ADR 003](../../adr/003-environment-branches.md). Full Kamal runbook:
[deployment.md](deployment.md).

## The two long-lived branches

| Branch | Environment | Deploy command |
|--------|-------------|----------------|
| `staging` | `https://staging.scholarpremium.com.br` | `kamal deploy -d staging` |
| `main` | `https://scholarpremium.com.br` | `kamal deploy -d production` |

Feature work never deploys. Merge first, then deploy from the environment branch.

```
feature/meu-trabalho  →  PR para staging  →  merge  →  deploy staging  →  QA
staging               →  git merge --ff-only na main →  push main      →  deploy production

Jira (`DLA-N`, skill `jira-task-lifecycle`): claim → **In Progress**; after successful
`kamal deploy -d staging` → **Ready to QA**. QA then owns **QA in progress** / **Done**.
```

## Everyday work

```bash
git checkout staging
git pull origin staging
git checkout -b feature/short-slug   # or fix/ refactor/ chore/ docs/
# …commits…
git push -u origin HEAD
gh pr create --base staging
```

After merge and QA sign-off, promote with a **local fast-forward** so production keeps the
same SHA that was tested (GitHub’s merge/squash/rebase buttons all create a new SHA):

```bash
git fetch origin
git checkout main
git merge --ff-only origin/staging
git push origin main
# then: bin/require-deploy-branch production && kamal deploy -d production
```

A PR `staging` → `main` is optional (review visibility). After the FF push, GitHub closes
it as merged. Do not click Squash or Rebase and merge on that PR.

## Do not

- Open feature PRs against `main` (except a production hotfix).
- Run `kamal deploy -d production` from `staging` or from a feature branch.
- Run `kamal deploy -d staging` from `main` or from a feature branch.
- Merge `staging` → `main` with a merge commit (that changes the SHA that was tested).

```bash
bin/require-deploy-branch staging      # before kamal … -d staging
bin/require-deploy-branch production   # before kamal … -d production
```

## Hotfix

If `staging` has unapproved work and production is broken: branch from `main`, PR to
`main`, deploy production, then merge `main` into `staging` so the branches do not diverge.

---

## Aviso ao time (pt-BR)

Copiar e colar no Discord / grupo:

```
Novo fluxo Git (a partir de agora)

• Trabalho novo nasce da branch staging e o PR aponta para staging (não para main).
• Depois do merge, subimos só staging (kamal deploy -d staging) e testamos em
  https://staging.scholarpremium.com.br
• Quando estiver aprovado, na máquina:
  git checkout main && git merge --ff-only origin/staging && git push origin main
  e só então kamal deploy -d production.
  (Não usar Squash / Rebase and merge no GitHub — isso muda o SHA testado.)

main = produção. staging = ambiente de teste.
Não fazemos deploy a partir de feature/*.
Não subimos produção “porque o código já está na staging” — precisa do fast-forward para a main.

Dúvidas: docs/guidelines/process/git-and-deploy-flow.md
```
