# Ubuntu (local dev)

Use with skill `setup-local-dev`. Same `README.md` / `Makefile` commands as macOS. WSL2 Ubuntu is the same path (`README.md`: Docker works on Linux and WSL).

## Docker path (recommended)

1. Docker Engine + Compose **v2** — [Get Docker](https://docs.docker.com/get-docker/). The `docker compose` plugin (space, not hyphen) is required (`Makefile` uses `docker compose`).
2. Add the user to the `docker` group and re-login so `docker info` works without sudo.
3. Node.js **22.x** — `frontend/app/README.md`. nvm/fnm/mise are fine; there is **no** `.nvmrc`.
4. `git`, `curl`, `ca-certificates`.

```bash
docker info
docker compose version
node -v    # v22.x
```

Then return to `SKILL.md` §4. Skip host Rails packages unless compiling gems on the host.

## Host Rails (optional)

[mise](https://mise.jdx.dev/) for Ruby **4.0.5** (`web/mise.toml`, `web/.ruby-version`). README also lists `gem install rails -v 8.1.3`.

Packages from `web/Dockerfile.dev` (install on the host if `bundle install` runs outside Docker):

```bash
sudo apt-get update
sudo apt-get install --no-install-recommends -y \
  build-essential curl git libpq-dev libvips libyaml-dev pkg-config postgresql-client
```

Do **not** also run apt PostgreSQL/Redis on 5432/6379 unless you override `POSTGRES_PORT` / `REDIS_PORT` in `web/.env`. Compose already publishes those ports.

```bash
cd web && mise install && ruby -v    # ruby 4.0.5
```

Then the host Rails block in `SKILL.md` (`make services-up`, `bundle install`, `bin/rails db:prepare`, `bin/dev`).

## GitHub MCP on Linux

`.cursor/scripts/install-github-mcp.sh` only maps `arm64` / `x86_64` to **Darwin** tarballs (`v1.7.0`). On Ubuntu, download the matching **Linux** asset from the same release and install the binary to `.cursor/bin/github-mcp-server` (gitignored), then follow `cursor.md`. Do not run the Darwin script and expect it to work.
