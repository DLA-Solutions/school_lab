# Git and deploy flow

Short version of [ADR 003](../../adr/003-environment-branches.md). Full runbook:
[deployment.md](deployment.md).

Continuous delivery is GitHub Actions on `ubuntu-latest` running `bin/deploy`.
CI stays local (`bin/ci`); the deploy workflow does not run tests. The app server
`77.42.33.33` only receives the image — no self-hosted runner and no git clone
on the server for deploy.

## The two long-lived branches

| Branch | Environment | What publishes |
|--------|-------------|----------------|
| `staging` | `https://staging.scholarpremium.com.br` | Push runs `bin/deploy staging` |
| `main` | `https://scholarpremium.com.br` | Push runs `bin/deploy production` |

Feature work never deploys. Merge to `staging` publishes staging. A fast-forward
onto `main`, then the push, publishes production. `workflow_dispatch` on those two
branches can redeploy one layer (`site`, `frontend`, `backoffice`, `web`) or all,
with an optional migrate checkbox (default off).

```
feature/meu-trabalho  →  PR to staging  →  merge  →  Actions deploys staging  →  QA
staging               →  git merge --ff-only onto main →  push main  →  Actions deploys production

Jira (`DLA-N`, skill `jira-task-lifecycle`): claim → **In Progress**. **Ready to QA**
stays manual after a successful staging deploy. The workflow does not move the ticket.
QA then owns **QA in progress** / **Done**.
```

On a push, `db:migrate` runs only when the API layer deploys and `web/db/migrate`
or `web/db/schema.rb` changed. On the manual button, it runs only when the migrate
checkbox is set and the API is one of the layers. Smoke is a read-only GET.
Discord notify is best-effort.

### Secrets in the GitHub UI

A person creates these in the GitHub UI **before** merging the workflow. The
repository does not create them.

Repository secrets (both jobs): `KAMAL_REGISTRY_USERNAME`,
`KAMAL_REGISTRY_PASSWORD` (classic PAT with `write:packages` and `read:packages` —
do not use `GITHUB_TOKEN`), `DEPLOY_SSH_PRIVATE_KEY`, `DEPLOY_KNOWN_HOSTS`,
`RAILS_MASTER_KEY`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`,
`GOOGLE_OAUTH_CLIENT_ID`, and optional `DISCORD_DEPLOY_WEBHOOK_URL`.

URL-encode `POSTGRES_PASSWORD` and `REDIS_PASSWORD` when they contain `@`, `:`,
`/`, `?`, or `#`.

Environment `staging`: `JWT_SECRET_KEY_STAGING`, `POSTMARK_API_TOKEN_STAGING`,
`API_DOCS_USERNAME`, `API_DOCS_PASSWORD`.

Environment `production`: `JWT_SECRET_KEY_PRODUCTION`,
`POSTMARK_API_TOKEN_PRODUCTION`. The production JWT does not go in the staging
environment.

### Local fallback

When `.kamal/secrets*` already exist, `bin/deploy staging` or
`bin/deploy production` (optional layer argument) still works. Outside Actions it
calls `bin/require-deploy-branch`. Developers do not run Kamal on their machine
as the default.

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
# that push publishes production; do not run kamal locally
```

A PR `staging` → `main` is optional (review visibility). After the FF push, GitHub closes
it as merged. Do not click Squash or Rebase and merge on that PR.

## Do not

- Open feature PRs against `main` (except a production hotfix).
- Deploy production from `staging` or from a feature branch. Only a push to `main` publishes production.
- Deploy staging from `main` or from a feature branch. Only a push to `staging` publishes staging.
- Merge `staging` → `main` with a merge commit (that changes the SHA that was tested).
- Run `kamal` on a developer machine as the default. Local `bin/deploy` is the fallback when `.kamal/secrets*` already exist, and it still runs `bin/require-deploy-branch`.

## Hotfix

If `staging` has unapproved work and production is broken: branch from `main`, PR to
`main`. The merge to `main` publishes production. Then merge `main` into `staging`
so the branches do not diverge.

---

## Aviso ao time (pt-BR)

Copiar e colar no Discord / grupo:

```
Novo fluxo Git (a partir de agora)

• Trabalho novo nasce da branch staging e o PR aponta para staging (não para main).
• Depois do merge, o deploy de staging é automático (GitHub Actions). Não rode kamal
  na sua máquina. Testamos em https://staging.scholarpremium.com.br
• Quando estiver aprovado, na máquina:
  git checkout main && git merge --ff-only origin/staging && git push origin main
  O push na main publica produção automaticamente. Não rode kamal na sua máquina.
  (Não usar Squash / Rebase and merge no GitHub — isso muda o SHA testado.)

main = produção. staging = ambiente de teste.
Não fazemos deploy a partir de feature/*.
Não subimos produção “porque o código já está na staging” — precisa do fast-forward para a main.

Dúvidas: docs/guidelines/process/git-and-deploy-flow.md
```
