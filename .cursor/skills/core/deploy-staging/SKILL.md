---
name: deploy-staging
description: >-
  Deploy School Lab (site, school SPA, backoffice SPA, web API) to staging with
  Kamal 2 from branch staging only. Use when the user asks to deploy staging,
  sobe staging, kamal -d staging, publish to
  https://staging.scholarpremium.com.br, or to QA on staging. Always finish with
  Discord notify_deploy. After smoke, skill jira-task-lifecycle Ready to QA.
  Shared Kamal mechanics live in skill deploy-kamal. Not for production
  (skill deploy-production) or first-time machine setup (skill setup-deploy).
---

# Deploy staging

Lock destination to **`-d staging`**. Host: `https://staging.scholarpremium.com.br`.

Shared layers, CI, secrets, cutover, Discord payload, rollback: skill **`deploy-kamal`**. Read it before the first Kamal command. First-time machine: skill **`setup-deploy`**.

If the user also asked for production, **finish this skill first** (including Discord), then skill **`deploy-production`**.

```
- [ ] 1. Branch + pull
- [ ] 2. GHCR token
- [ ] 3. Preflight + CI
- [ ] 4. kamal deploy -d staging
- [ ] 5. Smoke (read-only)
- [ ] 6. Jira Ready to QA
- [ ] 7. Discord notify_deploy
```

## 1. Branch

From repo root:

```bash
git fetch origin
git checkout staging
git pull origin staging
bin/require-deploy-branch staging
```

Refuse on mismatch. Never deploy staging from `main` or a feature branch. Tell the user to merge the PR into `staging` first.

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
cd web && bin/deploy-preflight staging
```

Secrets files: `.kamal/secrets-common` in each service dir; `web/.kamal/secrets.staging` for API. `kamal secrets print -d staging` must show non-empty registry secrets — do not dump them into chat.

Essential CI for every layer you will deploy (skill `deploy-kamal` table). Stop on non-zero. `bin/ci --full` from repo root is the full-stack alternative.

## 4. Deploy

From each service directory, **always** `-d staging`:

```bash
cd site                && kamal deploy -d staging
cd frontend/app        && kamal deploy -d staging
cd frontend/backoffice && kamal deploy -d staging
cd web                 && kamal deploy -d staging
```

Routine order: site → school SPA → backoffice SPA → API. Use `bin/kamal` when present. First time only: `kamal setup -d staging`. Schema change: `cd web && kamal app exec -d staging "bin/rails db:migrate"`.

On Kamal failure: skip smoke and Jira; go to Discord with `status: failure`. Cutover/proxy errors: `deploy-kamal` § Cutover and [`../deploy-kamal/troubleshooting.md`](../deploy-kamal/troubleshooting.md).

## 5. Smoke (read-only)

```bash
curl -sI https://staging.scholarpremium.com.br/ | head -3
curl -sI https://staging.scholarpremium.com.br/app/ | head -3
curl -sI https://staging.scholarpremium.com.br/backoffice/ | head -3
curl -sI https://staging.scholarpremium.com.br/up | head -3
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy ls'
```

No invite, password reset, guardian access, or other mailer routes. No `rails runner` mailers. Rule `email-safety`.

## 6. Jira Ready to QA

After smoke passes, skill **`jira-task-lifecycle`** Ready to QA (In Progress → Ready to QA; comment with staging URL + SHA). Skip if no In Progress issue or Atlassian MCP is missing — tell the user; that is not a deploy failure. **Not** on Kamal/smoke failure.

Do this **before** Discord.

## 7. Discord

Mandatory last step — success **or** failure. `deploy-kamal` § Discord notify.

- `destination`: `staging`
- `git_branch`: `staging`
- `layer`: named surface, or `all` for full stack

## Do not

- Pass `-d production` from this skill.
- Deploy while on any branch other than `staging` aligned with `origin/staging`.
- Skip `notify_deploy`.
- Skip Ready to QA after a successful staging deploy (unless no ticket / MCP missing).
- Print PATs, webhook URLs, or `.kamal/` secret values.
