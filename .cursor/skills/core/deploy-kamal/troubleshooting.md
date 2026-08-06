# Deploy Kamal — troubleshooting

## Secrets

### `Secret 'KAMAL_REGISTRY_USERNAME' not found`

Kamal reads secrets from the **service directory** you run the command in.

**Fix:** create `.kamal/secrets-common` in that directory:

```bash
cp .kamal/secrets-common.example .kamal/secrets-common
# or copy from web/.kamal/secrets-common (GHCR lines are identical)
export KAMAL_REGISTRY_PASSWORD='...'
kamal secrets print -d staging
```

## Docker build

### `Missing site/Dockerfile` or `Missing frontend/Dockerfile`

`builder.dockerfile` is resolved from the service cwd, not from `builder.context`.

**Fix:** in `site/config/deploy.yml` and `frontend/config/deploy.yml`:

```yaml
builder:
  context: ..
  dockerfile: Dockerfile   # not site/Dockerfile or frontend/Dockerfile
```

## kamal-proxy registration

### `host settings conflict with another service`

Another service already owns the hostname without path prefixes (usually the API).

**Fix:** cutover — remove API proxy route, then deploy site → API → SPA. See skill `deploy-kamal` § Cutover.

### `TLS settings must be specified on the root path service`

A path-prefixed service (API or SPA) tried to register with `--tls`.

**Fix:** remove `proxy.ssl` from `web/config/deploy.yml` and `frontend/config/deploy.yml`. Only `site/` sets `ssl: true`. Deploy site first if cutover is in progress.

### `Failed to boot web` / container healthy but proxy fails

Check proxy stderr in Kamal output. Container logs may be fine; the failure is often proxy registration, not the app.

```bash
ssh deploy@77.42.33.33 'docker exec kamal-proxy kamal-proxy ls'
```

## Runtime / SPA

### `/app` shows blank dark page (title "School Lab" only)

React Router `basename` must not have a trailing slash when the URL is `/app`.

**Fix:** in `frontend/src/routes/router.tsx`, strip trailing slash from `import.meta.env.BASE_URL` before passing to `createBrowserRouter`. Redeploy frontend.

### `/app/assets/*.js` returns 404

Build likely missing `VITE_BASE_PATH=/app/`. Check `frontend/config/deploy.staging.yml` builder args and redeploy.

## Wrong commands

| Do not | Do instead |
|---|---|
| `kamal proxy remove` | `docker exec kamal-proxy kamal-proxy remove <service-name>` |
| `kamal deploy` (no `-d`) | `kamal deploy -d staging` or `-d production` |
| Deploy API before site on fresh host | site → SPA → API |
| Deploy API before site on cutover | remove API route → site → API → SPA |
