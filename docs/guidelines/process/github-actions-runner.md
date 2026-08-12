# GitHub Actions — self-hosted runner

School Lab CI and staging deploys run on a **self-hosted runner** on the Hetzner app
server (`77.42.33.33`). This avoids GitHub-hosted runner minutes when billing or spending
limits block hosted runners.

Workflows: `.github/workflows/ci.yml`, `.github/workflows/openapi.yml` — all jobs use
`runs-on: [self-hosted, hetzner, linux]`.

## What still needs GitHub (free)

- Workflow orchestration, secrets, environments, and GHCR push/pull (no runner minutes).
- Repository secrets used by deploy jobs (`KAMAL_SSH_PRIVATE_KEY`, staging app secrets).

## What runs on the server

| Job type | When | Needs on runner |
|---|---|---|
| PR lint / test / npm | Pull request | Ruby, Node 22, Docker (Postgres service container) |
| Docker build + push | Push to `main` | Docker Buildx, GHCR login |
| Kamal staging deploy | Push to `main` | Ruby, Kamal, SSH to `deploy@77.42.33.33` |

Production deploys stay **manual** from a developer machine (see `deployment.md`).

## Security

- Use a dedicated OS user (`github-runner`), not `deploy` or `root`.
- PR jobs from **forks are skipped** on the self-hosted runner (workflow `if` guard).
- Do not log or commit runner registration tokens, SSH keys, or Kamal secrets.

## One-time setup (on the app server)

Run as a user with `sudo`. The runner user needs Docker group membership for service
containers and image builds.

### 1. Create the runner user

```bash
sudo adduser --disabled-password --gecos "GitHub Actions runner" github-runner
sudo usermod -aG docker github-runner
```

### 2. Install the runner (as `github-runner`)

Get a **registration token** from GitHub:

**Settings → Actions → Runners → New self-hosted runner → Linux → x64**

Copy the token from the configure step (valid for one hour). Then on the server:

```bash
sudo -u github-runner -i
mkdir -p ~/actions-runner && cd ~/actions-runner

# Pin matches https://github.com/actions/runner/releases — update when upgrading
RUNNER_VERSION=2.325.0
curl -fsSL -o actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz \
  "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
tar xzf actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz

./config.sh \
  --url https://github.com/DLA-Solutions/school_lab \
  --token <REGISTRATION_TOKEN> \
  --name hetzner-app \
  --labels hetzner,linux \
  --unattended

sudo ./svc.sh install github-runner
sudo ./svc.sh start
sudo ./svc.sh status
```

Or use the helper script from the repo (after cloning on the server):

```bash
REGISTRATION_TOKEN='<token>' ./scripts/setup-github-runner.sh
```

### 3. Deploy SSH key for Kamal jobs

Staging deploy jobs SSH to `deploy@77.42.33.33`. When the runner is **on that host**,
add the same deploy key the workflow used from GitHub-hosted runners:

- Store the private key only in GitHub **repository secret** `KAMAL_SSH_PRIVATE_KEY`
  (already configured for CI).
- Ensure `deploy` user's `authorized_keys` includes the matching public key.
- The runner does not need the key on disk permanently — `webfactory/ssh-agent` injects
  it per job from the secret.

### 4. Verify

1. GitHub → **Settings → Actions → Runners** — `hetzner-app` shows **Idle**.
2. Re-run a failed workflow on `main` or open a small PR — jobs should leave
   "Waiting for a runner" and complete.

## While the runner is offline

Jobs queue as **Waiting for a runner** (not a billing error). Staging does **not**
auto-deploy until a runner picks up `main` push jobs.

### Local CI (no GitHub runner)

```bash
# Backend (lint, security, RSpec, OpenAPI drift, optional Docker)
web/bin/backend-ci          # full
web/bin/backend-ci --fast     # changed files vs origin/main

# School SPA
cd frontend/app && npm ci && npm run test:run && VITE_BASE_PATH=/app/ npm run build

# Backoffice SPA
cd frontend/backoffice && npm ci && npm run test:run && VITE_BASE_PATH=/backoffice/ npm run build
```

### Manual staging deploy

See `deployment.md` § Day-to-day and skill `deploy-kamal`. Export registry and app
secrets on your machine, then:

```bash
cd site                && kamal deploy -d staging
cd frontend/app        && kamal deploy -d staging
cd frontend/backoffice && kamal deploy -d staging
cd web                 && kamal deploy -d staging
```

## Branch protection

If required checks stay **pending** because no runner is registered, either:

1. Register the runner (preferred), or
2. Temporarily allow admin bypass for merges, with local `web/bin/backend-ci` as the
   gate before merge.

## Maintenance

```bash
# On the server as github-runner
cd ~/actions-runner
sudo ./svc.sh stop
# Download newer runner tarball, extract over existing, then:
sudo ./svc.sh start
```

Remove a runner: GitHub UI → Runners → remove, then on server `./config.sh remove`
and delete `~/actions-runner`.

## Resource notes

- CI Postgres uses a Docker service container on port 5432 — must not conflict with
  another listener on the app server.
- Concurrent workflows share one runner; heavy Docker builds may queue. The workflow
  `concurrency` group cancels in-progress PR runs for the same ref.
