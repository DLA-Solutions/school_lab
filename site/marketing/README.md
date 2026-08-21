# Scholar Premium — Marketing Site

Full scroll narrative marketing site (`Frames 01–06`) for Scholar Premium. Isolated from the production `site/public/` placeholder until approved for deploy.

## Preview

```bash
cd site/marketing
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

## Product captures

Frame 04 (product proof) is temporarily hidden until authentic captures exist. Placeholder assets stay in `product-captures/`; see `product-captures/README.md` and `npm run capture:product` when the school SPA is running locally.

## Brand boundary

Public output uses **Scholar Premium** only. Internal School Lab identifiers never appear in customer-facing HTML, metadata, or manifests.

## Anti-patterns avoided

No POC flat-material poster, gold squiggle seam, 51% page split, CSS cap composition, neon/glass/bento grids, or fabricated product UI.
