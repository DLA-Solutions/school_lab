---
name: deploy-staging
description: >-
  Staging CD is GitHub Actions on ubuntu-latest: a push to branch staging runs
  bin/deploy. Use when the user asks to deploy staging, sobe staging, publish to
  https://staging.scholarpremium.com.br, or QA on staging. Do not run Kamal on
  the developer machine. Local bin/deploy staging is the fallback only when
  .kamal/secrets* already exist; it still enforces bin/require-deploy-branch.
  Shared Kamal mechanics live in skill deploy-kamal. Discord on the workflow is
  best-effort. Jira Ready to QA stays manual. Not for production (skill
  deploy-production) or first-time machine setup (skill setup-deploy).
---

# Deploy staging

Host: `https://staging.scholarpremium.com.br`.

**Default path:** a push to `staging` deploys staging. GitHub Actions on
`ubuntu-latest` runs `bin/deploy` with Environment `staging`. The job does not
run tests. CI stays `bin/ci` before merge. The app server `77.42.33.33` only
receives the image.

Do not run `kamal` on the developer machine after a merge. Confirm the Actions
run instead. To redeploy without a new commit, use `workflow_dispatch` on ref
`staging`: layer `changed`, `all`, `site`, `frontend`, `backoffice`, or `web`.
The migrate checkbox defaults to off; set it only when the API should run
`db:migrate`. On a push, migrate runs only when the API layer deploys and
`web/db/migrate` or `web/db/schema.rb` changed.

Smoke on that run is a read-only GET. Discord notify is best-effort. Jira
**Ready to QA** stays manual — the workflow does not move the ticket. Run skill
`jira-task-lifecycle` only when the user asks, after the Actions run is green.

Secrets are created by a person in the GitHub UI before the workflow is merged.
List: `docs/guidelines/process/deployment.md` (repository secrets vs Environment
`staging` vs Environment `production`). Do not use `GITHUB_TOKEN` as
`KAMAL_REGISTRY_PASSWORD`.

If the user also asked for production, that is a later fast-forward push to
`main` (skill **`deploy-production`**), not a local Kamal run after this one.

## Local fallback

Use this only when `.kamal/secrets*` already exist and the user wants a deploy
from this machine. `bin/deploy staging [layer]` calls `bin/require-deploy-branch`.
Shared layers, cutover, Discord payload, rollback: skill **`deploy-kamal`**.
Do not re-derive those mechanics here. First-time machine: skill **`setup-deploy`**.

```
- [ ] 1. Branch + pull
- [ ] 2. GHCR token
- [ ] 3. Preflight + CI
- [ ] 4. bin/deploy staging
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

From the repo root. This still enforces `bin/require-deploy-branch`:

```bash
bin/deploy staging
bin/deploy staging web    # optional: site, frontend, backoffice, or web
```

Order inside the script: site → school SPA → backoffice SPA → API. It stops at
the first failure. First-time host bootstrap only: `kamal setup -d staging` from
the service directory (skill `deploy-kamal`). Schema migrate on this fallback
follows the same rule as a push: API layer included and `web/db/migrate` or
`web/db/schema.rb` changed.

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

The Actions path does not move the ticket. On this local fallback, after smoke
passes, skill **`jira-task-lifecycle`** Ready to QA (In Progress → Ready to QA;
comment with staging URL + SHA). Skip if no In Progress issue or Atlassian MCP
is missing — tell the user; that is not a deploy failure. **Not** on Kamal/smoke
failure.

Do this **before** Discord.

## 7. Discord

Mandatory last step — success **or** failure. `deploy-kamal` § Discord notify.

- `destination`: `staging`
- `git_branch`: `staging`
- `layer`: named surface, or `all` for full stack

## Do not

- Pass `-d production` from this skill.
- Deploy while on any branch other than `staging` aligned with `origin/staging`.
- Skip `notify_deploy` on this local fallback. The Actions path notifies on its own (best-effort).
- Skip Ready to QA after a successful local staging deploy (unless no ticket / MCP missing). The Actions path leaves that transition manual.
- Print PATs, webhook URLs, or `.kamal/` secret values.
