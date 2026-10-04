# site/

Static institutional landing surface for Scholar Premium at the domain root (`/`). Full scroll
narrative marketing site (`Frames 01–06`) built with Vite; no API dependency at runtime.

## Development

```bash
cd site
npm install
npm run render:posters   # optional — regenerates WebP posters from the 3D scene
npm run dev              # http://127.0.0.1:5173
```

Production preview:

```bash
npm run build && npm run preview
```

## Quality gates

```bash
npm run check      # lint + typecheck + build + verify:dist
npm run evidence   # screenshots, Lighthouse, performance gates (run twice before review)
```

Evidence artifacts land in `evidence/`.

## Local static preview (built output)

From the repository root:

```bash
make site-build
make site-serve
```

Or after `npm run build` inside `site/`:

```bash
npx serve site/dist
```

## Product captures

Frame 04 (product proof) is temporarily hidden until authentic captures exist. Placeholder assets
stay in `product-captures/`; see `product-captures/README.md` and `npm run capture:product` when
the school SPA is running locally.

## Brand boundary

Public output uses **Scholar Premium** only. Internal School Lab identifiers never appear in
customer-facing HTML, metadata, or manifests.

## Deploy

Kamal/nginx configs live in `site/config/`. The Docker image builds `dist/` inside a Node
stage and copies that output into nginx. Deploy with Kamal 2 from this directory — see
`docs/guidelines/process/deployment.md` for the four-service topology and deploy order
(site → school SPA → backoffice SPA → API).

```bash
cd site
bin/deploy-preflight   # optional checks
kamal setup -d staging    # first time only
kamal deploy -d staging
```

Makefile shortcuts from the repo root: `make site-serve`, `make site-build`.

## POC

`poc/` holds an isolated frame-01 experiment; it is not part of the production deploy surface.
