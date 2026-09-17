# macOS (local dev)

Install host tooling only. Then return to [`SKILL.md`](SKILL.md) happy path. Do not run `bundle install` / `bin/dev` here unless you opted into Host Rails at the bottom.

## Docker path (required)

1. Install [Docker Desktop](https://docs.docker.com/get-docker/) (Compose v2). **Start it** and wait until the whale is idle.
2. Node.js **22.x** (`frontend/app/README.md`; there is **no** `.nvmrc`). Default:

   ```bash
   nvm install 22 && nvm use 22
   ```

   Alternatives: Homebrew `node@22`, or fnm — same major version.
3. If `git` or native npm extras fail: `xcode-select --install`.

```bash
docker info
docker compose version
node -v    # v22.x
```

**OK when:** all three succeed. Return to [`SKILL.md`](SKILL.md) happy path (`cp web/.env.example web/.env` …).

## Host Rails (skip unless…)

Skip unless you want Rails on the host for faster Ruby-only feedback. Postgres/Redis still come from Docker (`make services-up`). Do not install a second Homebrew PostgreSQL on 5432 unless you set `POSTGRES_PORT` in `web/.env`.

Ruby **4.0.5** via [mise](https://mise.jdx.dev/) (`web/mise.toml`, `web/.ruby-version` is `ruby-4.0.5`). README also lists `gem install rails -v 8.1.3`. rbenv/asdf work if they honor that version; **mise is what the README names**.

Native libs matching `web/Dockerfile.dev` (to compile `pg`, `ruby-vips`, psych):

```bash
brew install libpq vips libyaml pkg-config
export PATH="$(brew --prefix libpq)/bin:$PATH"
export PKG_CONFIG_PATH="$(brew --prefix libpq)/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
```

Keep those exports in the shell (or mise/direnv). From **repo root**:

```bash
cp web/.env.example web/.env    # still add CORS_ORIGINS — see SKILL.md
make services-up
(cd web && mise install && ruby -v)    # ruby 4.0.5
(cd web && bundle install && bin/rails db:prepare)
(cd web && bin/dev)
```

`bin/dev` starts Puma via Foreman (`web/Procfile.dev`). API is JSON-only — no asset build.
