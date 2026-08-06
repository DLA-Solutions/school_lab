# site/

Static institutional landing surface for Scholar Premium. Serves the marketing placeholder at the
domain root (`/`) without calling the API.

## Local preview

From the repository root:

```bash
npx serve site/public
```

Or open `site/public/index.html` directly in a browser.

## Deploy

Kamal/nginx configs live in `site/config/`. Deploy with Kamal 2 from this directory — see
`docs/guidelines/process/deployment.md` for the three-service topology and deploy order
(site → SPA → API).

```bash
cd site
bin/deploy-preflight   # optional checks
kamal setup -d staging    # first time only
kamal deploy -d staging
```

Makefile shortcuts from the repo root: `make site-serve`, `make site-build`.
