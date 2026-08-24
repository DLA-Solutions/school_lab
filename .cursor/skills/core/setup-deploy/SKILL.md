---
name: setup-deploy
description: First-time deploy machine onboarding for School Lab — 1Password secrets, GHCR PAT, Kamal secrets files, and preflight before the first kamal setup/deploy. Use when a new developer needs deploy access, SSH as deploy@77.42.33.33, or asks how to configure KAMAL_REGISTRY_PASSWORD and .kamal/ locally. For actually running deploy, use skill deploy-kamal instead.
---

# Setup deploy (first time)

Onboard a developer machine for Kamal **staging** deploys. Runbook: `docs/guidelines/process/deployment.md`. Troubleshooting: [`reference.md`](reference.md). Deploy only from **`main`** after merge — see skill **`deploy-kamal`**.

## Admin — send the email

Send **three 1Password share links** (not family vault membership):

| Link | Contents |
|------|----------|
| 1 | `web/config/master.key` (Rails credentials key) |
| 2 | Staging Kamal env block (see `reference.md` § Required env vars) |
| 3 | *(optional)* Production Kamal env block — for later |

**Do not share** `GITHUB_TOKEN`, `KAMAL_REGISTRY_PASSWORD`, or any GitHub PAT. Each developer creates their own classic PAT with `read:packages` + `write:packages`.

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

## Developer — after the email

Repo root unless noted. **Ignore production** until staging preflight is green.

### 0. Open 1Password links

Save `master.key` and the staging env text locally (not in git). Skip the production link for now.

**OK when:** you have `master.key` and staging env values in a local note.

### 1. Tools check

```bash
kamal version
docker info
gh auth status
ssh -o BatchMode=yes deploy@77.42.33.33 true
```

**OK when:** all four succeed (install Kamal 2, start Docker, fix SSH key if needed).

### 2. GitHub CLI login

```bash
gh auth login
gh config get -h github.com user
```

**OK when:** `gh auth status` shows logged in and username prints.

### 3. Personal PAT + registry login

Create a **classic** PAT: `read:packages`, `write:packages` (org `DLA-Solutions` package write).

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

**OK when:** file exists and is not committed (`git status` does not list it).

### 5. Kamal secrets files (four service dirs)

```bash
cp site/.kamal/secrets-common.example site/.kamal/secrets-common
cp frontend/app/.kamal/secrets-common.example frontend/app/.kamal/secrets-common
cp frontend/backoffice/.kamal/secrets-common.example frontend/backoffice/.kamal/secrets-common
cp web/.kamal/secrets-common.example web/.kamal/secrets-common
cp web/.kamal/secrets.staging.example web/.kamal/secrets.staging
cp web/.kamal/secrets.production.example web/.kamal/secrets.production
```

**OK when:** all seven files exist (production file is for preflight; no production export yet).

### 6. Export staging env block

Paste values from the 1Password staging link (URL-encode `@ : / ? #` in DB/Redis passwords):

```bash
export JWT_SECRET_KEY_STAGING='...'
export POSTGRES_PASSWORD='...'
export REDIS_PASSWORD='...'
export API_DOCS_USERNAME='...'
export API_DOCS_PASSWORD='...'
export POSTMARK_API_TOKEN_STAGING='...'
export GOOGLE_OAUTH_CLIENT_ID='...'
```

**OK when:** `echo "$JWT_SECRET_KEY_STAGING" | wc -c` is greater than 1.

### 7. Verify Kamal resolves secrets

```bash
cd web && kamal secrets print -d staging | grep -E '^(KAMAL_REGISTRY|RAILS_MASTER_KEY|JWT_SECRET_KEY|DATABASE_URL)='
```

**OK when:** `KAMAL_REGISTRY_USERNAME`, `KAMAL_REGISTRY_PASSWORD`, `RAILS_MASTER_KEY`, `JWT_SECRET_KEY`, and `DATABASE_URL` are non-empty.

### 8. Deploy preflight

```bash
cd web && bin/deploy-preflight
```

**OK when:** exits 0 and ends with “pronto para kamal setup -d staging”.

### 9. Kamal app details (four dirs)

```bash
cd site && kamal app details -d staging
cd frontend/app && kamal app details -d staging
cd frontend/backoffice && kamal app details -d staging
cd web && kamal app details -d staging
```

**OK when:** each reaches the server without auth errors (empty app list OK before first `kamal setup`).

**Ready for deploy** → skill **`deploy-kamal`** (`kamal setup` / `kamal deploy -d staging` per service dir).
