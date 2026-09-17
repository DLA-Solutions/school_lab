---
name: setup-deploy
description: >-
  Sets up a School Lab deploy machine for the first Kamal run: 1Password
  secrets, GHCR classic PAT, .kamal/ files, SSH as deploy@77.42.33.33, and
  bin/deploy-preflight. Use when a developer needs first-time deploy access, or
  asks about KAMAL_REGISTRY_PASSWORD, máquina de deploy, setup deploy, or
  primeiro kamal. Not for running the app on a laptop (skill setup-local-dev)
  or publishing after onboarding (skill deploy-kamal).
---

# Setup deploy (first time)

Onboard this machine for Kamal **staging**. Runbook: `docs/guidelines/process/deployment.md`. Tables and failures: [`reference.md`](reference.md).

## Which skill?

- Only run the app on a laptop? → `setup-local-dev`
- This machine will run `kamal deploy` for the first time? → `setup-deploy`
- Already onboarded, just publish? → `deploy-kamal`

You are in the right file. First-day target is **staging**. Feature branches never deploy.

| Flag | Required Git branch | Must match |
|------|---------------------|------------|
| `-d staging` | `staging` | `origin/staging` |
| `-d production` | `main` | `origin/main` |

**Admin vs developer:** if you received the onboarding email, skip to [Developer](#developer--after-the-email).

## Admin — send the email

Send **three 1Password share links** (not family vault membership). **Do not share** `GITHUB_TOKEN`, `KAMAL_REGISTRY_PASSWORD`, or any GitHub PAT. Each developer creates their own classic PAT with `read:packages` + `write:packages`.

| Link | Contents |
|------|----------|
| 1 | `web/config/master.key` (Rails credentials key) |
| 2 | Staging Kamal env block (see `reference.md` § Required env vars) |
| 3 | *(optional)* Production Kamal env block — for later |

**Email template:**

```
Subject: School Lab — deploy onboarding

Hi,

Here are 1Password share links for deploy setup (open each once, save locally):

1. Rails master.key → place at web/config/master.key
2. Staging Kamal env → export in your shell before deploy
3. (optional) Production env → ignore until staging is green

SSH: deploy@77.42.33.33 (your key must already be on the server).

Create your own GitHub classic PAT (read:packages + write:packages) for GHCR.
Repo: github.com/DLA-Solutions/school_lab
```

Tell the developer that `bin/deploy-preflight` still needs `JWT_SECRET_KEY_PRODUCTION` **set and different from staging** (optional link, or send that one key). They must not run `-d production` on day one.

## Stop-the-line (before any command)

1. Open the 1Password links. Save `master.key` and the staging env text **locally, not in git**.
2. Your SSH **public** key must already be on `deploy@77.42.33.33`.

```bash
ssh -o BatchMode=yes deploy@77.42.33.33 true
```

**If SSH fails: stop.** Send `cat ~/.ssh/id_ed25519.pub` to the admin and wait. Do not continue to PAT, secrets, or preflight.

## Developer — after the email

All commands from **monorepo root** using `(cd dir && …)`. Ignore production **deploys** until staging preflight is green. Keep exports in the **same shell** as later `kamal deploy` (or direnv / a local `~/.zshrc` snippet — never git). They vanish when the terminal closes.

### 0. Open 1Password links

Save `master.key` and the staging env block locally (not in git).

**OK when:** you have `master.key` and staging env values in a local note.

### 1. Install tools

Kamal 2 is the `kamal` gem. This repo pins **2.12.0** in `web/Gemfile.lock`. `web/bin/kamal` (and `bin/kamal` wrappers in `site/`, `frontend/app/`, `frontend/backoffice/`) use that pin after `(cd web && bundle install)`. `web/bin/deploy-preflight` expects `kamal` on **PATH**. README also allows a globally installed gem.

Needs **Ruby** (`gem`) and **Docker running** (Kamal builds locally). Project Ruby is 4.0.5 (`web/.ruby-version`); mise extras live in skill `setup-local-dev` `macos.md` / `ubuntu.md` (Host Rails). GitHub CLI: [cli.github.com](https://cli.github.com/) (`brew install gh` on macOS).

```bash
# A) Global (README) — enough for PATH + preflight:
gem install kamal
# B) Repo pin instead/as well:
# (cd web && mise install && bundle install)
# export PATH="$PWD/web/bin:$PATH"

kamal version    # must be 2.x
docker info
```

**OK when:** `kamal version` prints 2.x and `docker info` succeeds.

### 2. GitHub CLI login

```bash
gh auth login
gh auth status
gh config get -h github.com user
```

**OK when:** `gh auth status` shows logged in and username prints.

### 3. Classic PAT + GHCR login

Create a **classic** PAT at https://github.com/settings/tokens with `read:packages` + `write:packages` (org `DLA-Solutions` package write). This is **not** `GITHUB_TOKEN`, **not** the `gh` token, and **not** the GitHub MCP PAT.

A fine-grained token or `GITHUB_TOKEN` without packages scopes fails here as GHCR `401` that looks like a wrong password.

```bash
export KAMAL_REGISTRY_PASSWORD='<your-pat>'
docker login ghcr.io -u "$(gh config get -h github.com user)" \
  --password-stdin <<< "$KAMAL_REGISTRY_PASSWORD"
```

**OK when:** `docker login` prints `Login Succeeded`.

### 4. Rails master key

```bash
cp /path/to/master.key web/config/master.key
test -f web/config/master.key
```

**OK when:** file exists and `git status` does not list it.

### 5. Kamal secrets files (four service dirs)

Copy all six `.example` files, including `secrets.production.example` so `bin/deploy-preflight` does not fail the file check. Do **not** run production Kamal yet.

```bash
cp site/.kamal/secrets-common.example site/.kamal/secrets-common
cp frontend/app/.kamal/secrets-common.example frontend/app/.kamal/secrets-common
cp frontend/backoffice/.kamal/secrets-common.example frontend/backoffice/.kamal/secrets-common
cp web/.kamal/secrets-common.example web/.kamal/secrets-common
cp web/.kamal/secrets.staging.example web/.kamal/secrets.staging
cp web/.kamal/secrets.production.example web/.kamal/secrets.production
```

**OK when:** all six files exist.

### 6. Export staging env block

Paste values from the 1Password staging link. URL-encode `@ : / ? #` in DB/Redis passwords ([`reference.md`](reference.md)).

`bin/deploy-preflight` also requires `JWT_SECRET_KEY_PRODUCTION` **set and different from staging** even on first day. Use the optional production 1Password link for that key (or ask admin). Still no `kamal deploy -d production`.

```bash
export JWT_SECRET_KEY_STAGING='...'
export JWT_SECRET_KEY_PRODUCTION='...'   # distinct; preflight only on day one
export POSTGRES_PASSWORD='...'
export REDIS_PASSWORD='...'
export API_DOCS_USERNAME='...'
export API_DOCS_PASSWORD='...'
export POSTMARK_API_TOKEN_STAGING='...'
export GOOGLE_OAUTH_CLIENT_ID='...'
```

These must stay in **this shell** (or direnv / local `~/.zshrc` — never git).

**OK when:** `echo "$JWT_SECRET_KEY_STAGING" | wc -c` is greater than 1.

### 7. Verify Kamal resolves secrets

```bash
(cd web && kamal secrets print -d staging | grep -E '^(KAMAL_REGISTRY|RAILS_MASTER_KEY|JWT_SECRET_KEY|DATABASE_URL)=')
```

**OK when:** `KAMAL_REGISTRY_USERNAME`, `KAMAL_REGISTRY_PASSWORD`, `RAILS_MASTER_KEY`, `JWT_SECRET_KEY`, and `DATABASE_URL` are non-empty.

### 8. Deploy preflight

```bash
(cd web && bin/deploy-preflight)
```

**OK when:** exits 0 and prints `Tudo pronto para kamal setup -d staging.`

### 9. Kamal app details (four dirs)

```bash
(cd site && kamal app details -d staging)
(cd frontend/app && kamal app details -d staging)
(cd frontend/backoffice && kamal app details -d staging)
(cd web && kamal app details -d staging)
```

**OK when:** each reaches the server without auth errors (empty app list is OK before the first `kamal setup`).

### 10. Discord deploy MCP (Cursor agents only)

Skip if you will run `kamal` in a terminal yourself. Required only when **Cursor agents** deploy from this machine (`notify_deploy` after every deploy).

```bash
cp .cursor/mcp.env.example .cursor/mcp.env   # if not already present
# Set DISCORD_BOT_TOKEN + DISCORD_DEPLOY_CHANNEL_ID (comments in mcp.env.example)
# Restart Cursor; verify GetDynamicTools finds discord-deploy / notify_deploy
```

**OK when:** `discord-deploy` MCP is connected, or you skipped this because you deploy by hand.

**Ready** → skill **`deploy-kamal`** (`kamal setup` / `kamal deploy -d staging` per service dir; always finish with `notify_deploy` when an agent deploys).
