---
name: deploy-production
description: >-
  Production CD is GitHub Actions on ubuntu-latest: a push to branch main runs
  bin/deploy production after a fast-forward of origin/staging. Use when the
  user asks to deploy production, deploy prod, sobe produção, or publish to
  https://scholarpremium.com.br. Do not run Kamal on the developer machine.
  Local bin/deploy production is the fallback only when .kamal/secrets* already
  exist; it still enforces bin/require-deploy-branch. Confirm before that local
  fallback. Shared Kamal mechanics live in skill deploy-kamal. Discord on the
  workflow is best-effort. Do not move Jira to Ready to QA. Not for staging
  (skill deploy-staging) or first-time machine setup (skill setup-deploy).
---

# Deploy production

Host: `https://scholarpremium.com.br` (and `www.` if configured).

**Default path:** a push to `main` deploys production. GitHub Actions on
`ubuntu-latest` runs `bin/deploy` with Environment `production`. The job does
not run tests. The app server `77.42.33.33` only receives the image.

Promote with a local fast-forward, then push. That push is the deploy. Do not
run `kamal` on the developer machine afterward.

```bash
git fetch origin
git checkout main
git merge --ff-only origin/staging
git push origin main
```

Refuse a merge commit, squash, or rebase-merge of `staging` → `main`. Do not
push `main` when `origin/staging` has commits that have not been QA'd and the
user did not ask to promote them.

To redeploy without a new commit, use `workflow_dispatch` on ref `main`: layer
`changed`, `all`, `site`, `frontend`, `backoffice`, or `web`. The migrate
checkbox defaults to off. On a push, migrate runs only when the API layer
deploys and `web/db/migrate` or `web/db/schema.rb` changed.

Smoke on that run is a read-only GET. Discord notify is best-effort. Do not
move Jira to Ready to QA.

Secrets are created by a person in the GitHub UI before the workflow is merged.
List: `docs/guidelines/process/deployment.md`. Do not use `GITHUB_TOKEN` as
`KAMAL_REGISTRY_PASSWORD`. The production JWT is an Environment `production`
secret, not a staging secret.

If staging is also requested, that publish already happened on the push to
`staging` (skill **`deploy-staging`**). Do not Kamal staging locally first.

## Local fallback

Use this only when `.kamal/secrets*` already exist and the user wants a deploy
from this machine **instead of** the push. A fast-forward push to `main` already
starts Actions — do not also run `bin/deploy` after that push.

**Confirm** before `bin/deploy production` unless they already gave an explicit
go (e.g. “pode deployar produção”). The script calls `bin/require-deploy-branch`.
Shared mechanics: skill **`deploy-kamal`**. Do not re-derive them here.
First-time machine: skill **`setup-deploy`**.

```
- [ ] 1. Check branch (do not push)
- [ ] 2. GHCR token
- [ ] 3. Preflight + CI
- [ ] 4. bin/deploy production
- [ ] 5. Smoke (read-only)
- [ ] 6. Discord notify_deploy
```

## 1. Check branch

`main` must already match `origin/main`, and that SHA must be the one QA'd on
staging. Promoting is the default path above (fast-forward, then push). Do not
push from this checklist.

```bash
git fetch origin
git checkout main
git pull origin main
bin/require-deploy-branch production
```

Refuse and stop when:

- Current branch is `staging` or a feature branch — never `bin/deploy production` from those.
- `main` is not the QA'd SHA — go back to the default path and push; do not deploy locally and push.
- The user did not confirm this local fallback.

Hotfix exception (production broken, staging has unrelated work): branch from `main`, PR to `main`. The merge publishes production. Then merge `main` into `staging`. Do not invent this path.

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

From the repo root, after the branch check in step 1. This still enforces
`bin/require-deploy-branch`:

```bash
bin/deploy production
bin/deploy production web    # optional: site, frontend, backoffice, or web
```

Order inside the script: site → school SPA → backoffice SPA → API. It stops at
the first failure. First-time host bootstrap only: `kamal setup -d production`
from the service directory (skill `deploy-kamal`). Schema migrate on this
fallback follows the same rule as a push: API layer included and
`web/db/migrate` or `web/db/schema.rb` changed.

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
- Skip `notify_deploy` on this local fallback. The Actions path notifies on its own (best-effort).
- Print PATs, webhook URLs, or `.kamal/` secret values.
