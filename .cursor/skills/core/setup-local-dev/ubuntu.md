# Ubuntu (local dev)

Install host tooling only. Then return to [`SKILL.md`](SKILL.md) happy path. Same `Makefile` as macOS. WSL2 Ubuntu is this path (`README.md`: Docker works on Linux and WSL). Do not run `bundle install` / `bin/dev` here unless you opted into Host Rails at the bottom.

## Docker path (required)

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
```

1. Docker Engine + Compose **v2 plugin** — [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/). The Makefile calls `docker compose` (space, not `docker-compose`).
2. Docker group so `docker` works without sudo — then **log out and back in** (or reboot):

   ```bash
   sudo usermod -aG docker $USER
   ```

3. Node.js **22.x** (`frontend/app/README.md`; there is **no** `.nvmrc`). Default after nvm is on PATH ([nvm install](https://github.com/nvm-sh/nvm#installing-and-updating)):

   ```bash
   nvm install 22 && nvm use 22
   ```

   fnm/mise are fine if they yield v22.x.

```bash
docker info
docker compose version
node -v    # v22.x
```

**OK when:** all three succeed without sudo. Return to [`SKILL.md`](SKILL.md) happy path (`cp web/.env.example web/.env` …).

## Host Rails (skip unless…)

Skip unless you want Rails on the host. Do **not** also apt-install PostgreSQL/Redis on 5432/6379 unless you override `POSTGRES_PORT` / `REDIS_PORT` in `web/.env` — Compose already publishes those ports.

[mise](https://mise.jdx.dev/) for Ruby **4.0.5** (`web/mise.toml`, `web/.ruby-version`). README also lists `gem install rails -v 8.1.3`.

Packages from `web/Dockerfile.dev` (needed to compile gems on the host):

```bash
sudo apt-get update
sudo apt-get install --no-install-recommends -y \
  build-essential curl git libpq-dev libvips libyaml-dev pkg-config postgresql-client
```

From **repo root**:

```bash
cp web/.env.example web/.env    # still add CORS_ORIGINS — see SKILL.md
make services-up
(cd web && mise install && ruby -v)    # ruby 4.0.5
(cd web && bundle install && bin/rails db:prepare)
(cd web && bin/dev)
```

## GitHub MCP on Linux

`.cursor/scripts/install-github-mcp.sh` is **Darwin-only** (`github-mcp-server_Darwin_arm64.tar.gz` / `github-mcp-server_Darwin_x86_64.tar.gz`, release `v1.7.0`). Do not run it on Ubuntu.

From **repo root**, after `cp .cursor/mcp.env.example .cursor/mcp.env` ([`cursor.md`](cursor.md)):

```bash
mkdir -p .cursor/bin
# x86_64:
curl -fsSL https://github.com/github/github-mcp-server/releases/download/v1.7.0/github-mcp-server_Linux_x86_64.tar.gz \
  -o /tmp/github-mcp.tgz
# aarch64 / arm64 instead:
# curl -fsSL https://github.com/github/github-mcp-server/releases/download/v1.7.0/github-mcp-server_Linux_arm64.tar.gz \
#   -o /tmp/github-mcp.tgz
tmpdir="$(mktemp -d)"
tar -xzf /tmp/github-mcp.tgz -C "$tmpdir"
install -m 755 "$tmpdir/github-mcp-server" .cursor/bin/github-mcp-server
```

Asset names (v1.7.0, same pattern as the Darwin script): `github-mcp-server_Linux_x86_64.tar.gz`, `github-mcp-server_Linux_arm64.tar.gz`. URL pattern: `https://github.com/github/github-mcp-server/releases/download/v1.7.0/<asset>`. Binary path: `.cursor/bin/github-mcp-server` (gitignored). Then set `GITHUB_PERSONAL_ACCESS_TOKEN` and restart Cursor.
