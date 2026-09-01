---
name: deploy-kamal
description: Deploy site, school SPA, backoffice SPA, or web API to staging or production with Kamal 2. Use when the user asks to deploy site, frontend, SPA, backoffice, API, or web to staging or production, run kamal deploy, cut over path routing, or fix kamal-proxy deploy errors. Always finish with Discord notify_deploy via discord-deploy MCP (success or failure). After a successful staging deploy, move the related DLA Jira issue to Ready to QA (skill jira-task-lifecycle).
---

# Deploy with Kamal

Deploy one layer or the full stack to **staging** or **production**. Runbook: `docs/guidelines/process/deployment.md`. Guardrails: `.cursor/rules/core/deployment.mdc`. First-time machine setup: skill `setup-deploy`.

## Workflow (end-to-end)

1. Pre-deploy checks (CI, secrets, branch vs destination — `bin/require-deploy-branch`).
2. `kamal deploy -d <staging|production>` from the service directory.
3. Post-deploy smoke (read-only) on success.
4. **Staging success only** — skill `jira-task-lifecycle` Ready to QA phase (In Progress → Ready to QA). Skip on failure and on production.
5. **Discord `notify_deploy`** — mandatory last step; success or failure. Never skip.

## Parse the request

| User says | Layer | Directory | Kamal service |
|---|---|---|---|
| site, landing, institutional | `site` | `site/` | `scholarpremium-site` |
| frontend, SPA, app (UI), school web | `frontend` | `frontend/app/` | `scholarpremium-spa` |
| backoffice, platform SPA | `backoffice` | `frontend/backoffice/` | `scholarpremium-backoffice-spa` |
| API, web, Rails, backend | `web` | `web/` | `scholarpremium` |
| everything, full stack, all services | `all` | see order below | all four |

| User says | Destination flag |
|---|---|
| staging | `-d staging` |
| production, prod | `-d production` |

Default to **staging** when the destination is ambiguous. Confirm before **production** deploys.

## Before deploy (always)

0. **Branch vs destination (mandatory)** — refuse to deploy on mismatch. From repo root:

   ```bash
   bin/require-deploy-branch staging      # required for -d staging
   bin/require-deploy-branch production   # required for -d production
   ```

   | Flag | Required Git branch | Must match |
   |------|---------------------|------------|
   | `-d staging` | `staging` | `origin/staging` |
   | `-d production` | `main` | `origin/main` |

   Feature branches never deploy. Production never deploys from `staging` — fast-forward
   `origin/staging` onto `main` first (rule `deploy-environment-branches`). If the user is on the wrong
   branch, stop and tell them to merge/checkout/pull; do not run `kamal deploy`.

1. **Essential CI (mandatory before deploy)** — local CI is **not** run on commit, push, or PR; deploy is the quality gate.

   | Layer | Command (from repo root unless noted) |
   |-------|----------------------------------------|
   | **web** (API) | `cd web && bin/backend-ci --full` |
   | **frontend** (school SPA) | `cd frontend/app && npm test && npm run build` |
   | **backoffice** | `cd frontend/backoffice && npm test && npm run build` |
   | **site** | `make site-build` or project build script |
   | **all** | Run each row for surfaces you are deploying |

   Stop deploy if any command exits non-zero. `bin/ci --full` from repo root is an alternative when deploying the full stack.

2. **Working directory** — run Kamal from the service directory (`cd site`, `cd frontend/app`, `cd frontend/backoffice`, or `cd web`). Use `bin/kamal` in `site/`, `frontend/app/`, and `frontend/backoffice/` if present.
3. **Registry token** — in the same shell:
   ```bash
   export KAMAL_REGISTRY_PASSWORD='...'   # classic PAT: write:packages + read:packages
   ```
4. **Secrets file** — must exist in that service dir:
   ```bash
   test -f .kamal/secrets-common || cp .kamal/secrets-common.example .kamal/secrets-common
   ```
   For **web** only, also need `.kamal/secrets.staging` or `.kamal/secrets.production` (copy from `.example`).
5. **Verify Kamal resolves secrets**:
   ```bash
   kamal secrets print -d <staging|production>
   ```
   `KAMAL_REGISTRY_USERNAME` and `KAMAL_REGISTRY_PASSWORD` must be non-empty.
6. **Docker** — `docker info` must succeed locally (Kamal builds on the deploy machine).
7. **Preflight (API, recommended)** — `cd web && bin/deploy-preflight [staging|production]` before first deploy or when secrets changed. Pass the destination so the script also checks the Git branch.

Exit early with clear instructions if any check fails — do not run `kamal deploy` blind.

## Deploy one layer

Replace `<dest>` with `staging` or `production`.

### Site

```bash
cd site
kamal deploy -d <dest>
```

First time only: `kamal setup -d <dest>` before deploy.

### Frontend (school SPA)

```bash
cd frontend/app
kamal deploy -d <dest>
```

First time only: `kamal setup -d <dest>` before deploy.

### Backoffice SPA

```bash
cd frontend/backoffice
kamal deploy -d <dest>
```

First time only: `kamal setup -d <dest>` before deploy.

### API (web)

```bash
cd web
kamal deploy -d <dest>
```

First time only: `kamal setup -d <dest>` before deploy.

Migrations (when schema changed):

```bash
cd web
kamal app exec -d <dest> "bin/rails db:migrate"
```

## Deploy full stack (routine)

Post-cutover order — **site → school SPA → backoffice SPA → API**:

```bash
cd site                && kamal deploy -d <dest>
cd frontend/app        && kamal deploy -d <dest>
cd frontend/backoffice && kamal deploy -d <dest>
cd web                 && kamal deploy -d <dest>
```

## Cutover (API already owns the full hostname)

Use when site deploy fails with `host settings conflict` or API deploy fails with `TLS settings must be specified on the root path service`. See runbook section *Cutover when the API already owns the host*.

```bash
# 1. Inspect proxy routes
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy ls'

# 2. Remove API full-host registration (name from ls output, e.g. scholarpremium-web-staging)
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy remove scholarpremium-web-<dest>'

# 3. Deploy in cutover order
cd site                && kamal deploy -d <dest>
cd web                 && kamal deploy -d <dest>
cd frontend/app        && kamal deploy -d <dest>
cd frontend/backoffice && kamal deploy -d <dest>
```

Expect brief downtime on `/` and `/api` between steps 2 and 3.

## Post-deploy smoke tests

**Staging:**

```bash
curl -sI https://staging.scholarpremium.com.br/ | head -3
curl -sI https://staging.scholarpremium.com.br/app/ | head -3
curl -sI https://staging.scholarpremium.com.br/backoffice/ | head -3
curl -sI https://staging.scholarpremium.com.br/up | head -3
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy ls'
```

**Production** — same paths on `scholarpremium.com.br` (and `www.` if configured).

Smoke is **read-only**. Do not POST invite, password reset, guardian access, school create/handoff, or any other mailer-triggering route. Do not run `rails runner` mailers or `deliver_now` on the host. See rule `email-safety`.

## Jira Ready to QA (staging success only)

After smoke passes on **`-d staging`**, run skill **`jira-task-lifecycle`** Ready to QA phase: assign stays as-is; status **In Progress** → **Ready to QA**; comment with staging URL + git SHA.

Skip when:

- Deploy **failed**, or smoke did not pass
- Destination is **production** (QA already happened)
- Atlassian MCP is missing — tell the user; do **not** treat that as a deploy failure

Do this **before** Discord notify so Discord remains the last step.

## Discord notify (mandatory — do not end deploy without this)

Post to the **School Lab** Discord channel via the `discord-deploy` MCP. This is the **last step** of every deploy task. Do it once the user's requested deploy has a final result — after smoke on success, or as soon as `kamal deploy` fails. **Do not skip on failure.** A deploy task is incomplete until Discord is notified (or the user is told MCP is misconfigured).

### Steps

1. Capture context before notifying:
   ```bash
   git rev-parse --short HEAD
   git branch --show-current
   ```
2. Discover the tool: `GetDynamicTools` with `namespace: "discord-deploy"` or pattern `notify_deploy`.
3. Call `CallDynamicTool`:
   - `namespace`: `discord-deploy`
   - `toolName`: `notify_deploy`
   - `arguments`:
     - `layer`: `site` | `frontend` | `backoffice` | `web` | `all` (use `all` only for a full-stack run)
     - `destination`: `staging` | `production`
     - `status`: `success` | `failure`
     - `smoke_ok`: `true` / `false` when smoke ran; omit if it did not
     - `git_sha` / `git_branch` from step 1 when available
     - `note`: short extra context (migrations, rollback, error summary) — **never** secrets, webhook URLs, PATs, or `.kamal/` values

### Example (staging API deploy, smoke passed)

```json
{
  "namespace": "discord-deploy",
  "toolName": "notify_deploy",
  "arguments": {
    "layer": "web",
    "destination": "staging",
    "status": "success",
    "smoke_ok": true,
    "git_sha": "16fc469",
    "git_branch": "main"
  }
}
```

### MCP not available

If `discord-deploy` is missing or disconnected, tell the user to set `DISCORD_BOT_TOKEN` + `DISCORD_DEPLOY_CHANNEL_ID` in `.cursor/mcp.env` (channel ID via Developer Mode → Copy Channel ID; no channel edit permission needed). Webhook URL is optional when someone with Manage Webhooks can create one. See `.cursor/mcp.env.example`. Restart Cursor after changing env. **Do not treat a Discord outage as a deploy failure**, but do report that notify was skipped and why.

This MCP only notifies this project. Do not send other Discord messages through it.

## Rollback (single layer)

```bash
cd <site|frontend/app|frontend/backoffice|web>
kamal rollback -d <dest>
```

Database migrations are **not** rolled back with the container. Coordinate API rollback with site/SPA if needed.

## Checklists and errors

- Preflight checklist: [`checklist.md`](checklist.md)
- Common Kamal/proxy errors: [`troubleshooting.md`](troubleshooting.md)

## Do not

- Finish a deploy task without calling `notify_deploy` (unless MCP is misconfigured — then tell the user).
- Skip Jira Ready to QA after a successful staging deploy (unless Atlassian MCP is missing — then tell the user).
- Run `kamal deploy` without `-d` (blocked by config, but never omit intentionally).
- Run `kamal deploy -d staging` except from branch `staging`, or `-d production` except from `main`.
- Run `kamal proxy remove` — removes the entire kamal-proxy container.
- Set `proxy.ssl: true` on `web/` or `frontend/` deploy configs.
- Commit secret files under `.kamal/`.
