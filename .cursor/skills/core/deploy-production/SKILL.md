---
name: deploy-production
description: >-
  Deploy School Lab (site, school SPA, backoffice SPA, web API) to production
  with Kamal 2 from branch main only, after a fast-forward of origin/staging.
  Use when the user asks to deploy production, deploy prod, sobe produção,
  kamal -d production, or publish to https://scholarpremium.com.br. Confirm
  before running Kamal. Always finish with Discord notify_deploy. Do not move
  Jira to Ready to QA. Shared Kamal mechanics live in skill deploy-kamal. Not
  for staging (skill deploy-staging) or first-time machine setup (skill
  setup-deploy).
---

# Deploy production

Lock destination to **`-d production`**. Host: `https://scholarpremium.com.br` (and `www.` if configured).

Shared layers, CI, secrets, cutover, Discord payload, rollback: skill **`deploy-kamal`**. Read it before the first Kamal command. First-time machine: skill **`setup-deploy`**.

If staging is also requested, **finish skill `deploy-staging` first** (including Discord) before this skill.

**Confirm with the user** before `kamal deploy -d production` unless they already gave an explicit go (e.g. “pode deployar produção”).

```
- [ ] 1. Confirm + promote main
- [ ] 2. GHCR token
- [ ] 3. Preflight + CI
- [ ] 4. kamal deploy -d production
- [ ] 5. Smoke (read-only)
- [ ] 6. Discord notify_deploy
```

## 1. Promote `main`, then check branch

Production SHA must be the SHA already on `origin/staging` (QA). Rule `deploy-environment-branches`.

```bash
git fetch origin
git checkout main
git merge --ff-only origin/staging
git push origin main
git pull origin main
bin/require-deploy-branch production
```

Refuse and stop when:

- Fast-forward fails (branches diverged) — do not merge-commit, squash, or rebase-merge `staging` → `main`.
- Current branch is `staging` or a feature branch — never `kamal deploy -d production` from those.
- `origin/staging` has commits that have not been QA’d and the user did not ask to promote them.

Hotfix exception (production broken, staging has unrelated work): branch from `main`, PR to `main`, deploy, then merge `main` into `staging`. Do not invent this path.

Default layer is **all four** unless the user names one (`site`, `frontend`, `backoffice`, `web`).

## 2. GHCR token

`KAMAL_REGISTRY_PASSWORD` must be in **this** shell (classic PAT with `write:packages`). If unset, `source ~/.zshrc` — **do not print or commit the value**.

Probe (headers only):

```bash
curl -sI -H "Authorization: Bearer $KAMAL_REGISTRY_PASSWORD" https://api.github.com/user \
  | grep -iE 'HTTP/|x-oauth-scopes'
```

Stop on **401** or missing `write:packages`. The env var being set is not enough — GitHub must accept the PAT. User mints a new classic PAT (`read:packages` + `write:packages`), updates `.zshrc`, `source ~/.zshrc`, then retry.

Also: `docker info` succeeds (start OrbStack if the daemon is down). `ssh deploy@77.42.33.33` works.

## 3. Preflight + CI

```bash
cd web && bin/deploy-preflight production
```

Secrets files: `.kamal/secrets-common` in each service dir; `web/.kamal/secrets.production` for API. `kamal secrets print -d production` must show non-empty registry secrets — do not dump them into chat.

Essential CI for every layer you will deploy (skill `deploy-kamal` table). Stop on non-zero. `bin/ci --full` from repo root is the full-stack alternative.

## 4. Deploy

From each service directory, **always** `-d production`:

```bash
cd site                && kamal deploy -d production
cd frontend/app        && kamal deploy -d production
cd frontend/backoffice && kamal deploy -d production
cd web                 && kamal deploy -d production
```

Routine order: site → school SPA → backoffice SPA → API. Use `bin/kamal` when present. First time only: `kamal setup -d production`. Schema change: `cd web && kamal app exec -d production "bin/rails db:migrate"`.

On Kamal failure: skip smoke; go to Discord with `status: failure`. Cutover/proxy errors: `deploy-kamal` § Cutover and [`../deploy-kamal/troubleshooting.md`](../deploy-kamal/troubleshooting.md).

## 5. Smoke (read-only)

```bash
curl -sI https://scholarpremium.com.br/ | head -3
curl -sI https://scholarpremium.com.br/app/ | head -3
curl -sI https://scholarpremium.com.br/backoffice/ | head -3
curl -sI https://scholarpremium.com.br/up | head -3
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy ls'
```

Same paths on `www.scholarpremium.com.br` if that host is configured. No invite, password reset, guardian access, or other mailer routes. No `rails runner` mailers. Rule `email-safety`.

## 6. Discord

Mandatory last step — success **or** failure. `deploy-kamal` § Discord notify.

- `destination`: `production`
- `git_branch`: `main`
- `layer`: named surface, or `all` for full stack

**Do not** run skill `jira-task-lifecycle` Ready to QA after production.

## Do not

- Pass `-d staging` from this skill.
- Deploy production from `staging` or a feature branch.
- Promote `staging` → `main` with a GitHub squash/rebase/merge commit.
- Move Jira to Ready to QA (QA already happened on staging).
- Skip `notify_deploy`.
- Print PATs, webhook URLs, or `.kamal/` secret values.
