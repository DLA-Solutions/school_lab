# macOS (local dev)

Use with skill `setup-local-dev`. Commands in `README.md` stay the same; this file is host tooling only.

## Docker path (recommended)

1. [Docker Desktop](https://docs.docker.com/get-docker/) (Compose v2). Start it before any `make` target.
2. Node.js **22.x** — `frontend/app/README.md`. nvm/fnm/mise are fine; there is **no** `.nvmrc`.
3. Xcode CLT if `git` or native npm extras fail: `xcode-select --install`.

```bash
docker info
docker compose version
node -v    # v22.x
```

Then return to `SKILL.md` §4 (env files). Skip the rest of this file.

## Host Rails (optional)

`README.md` optional tools:

- [mise](https://mise.jdx.dev/) (Ruby 4.0.5 — see `web/mise.toml`)
- Rails 8.1.3 (`gem install rails -v 8.1.3`)

```bash
cd web && mise install && ruby -v    # ruby 4.0.5
```

`.ruby-version` is `ruby-4.0.5`. rbenv/asdf also work if they install that version; **mise is what the README names**.

Native libraries matching `web/Dockerfile.dev` (needed to compile `pg`, `ruby-vips`, psych):

```bash
brew install libpq vips libyaml pkg-config
export PATH="$(brew --prefix libpq)/bin:$PATH"
export PKG_CONFIG_PATH="$(brew --prefix libpq)/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
```

Keep those exports in the shell (or mise/direnv) before `bundle install`. Then:

```bash
cp web/.env.example web/.env   # from repo root
make services-up
cd web && bundle install && bin/rails db:prepare
bin/dev
```

Postgres/Redis still come from Docker (`make services-up`). Do not install a second Homebrew PostgreSQL on 5432 unless you set `POSTGRES_PORT` in `web/.env` (`README.md` troubleshooting).

## Cursor / GitHub MCP

`.cursor/scripts/install-github-mcp.sh` downloads Darwin assets (`github-mcp-server_Darwin_arm64.tar.gz` or `_Darwin_x86_64.tar.gz`, release `v1.7.0`). Run it from repo root after copying `.cursor/mcp.env` — see `cursor.md`.
