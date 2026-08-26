# Product captures

Authentic, privacy-safe screenshots of the Scholar Premium web product belong here.

## Manual capture workflow

1. Start the school SPA locally (`frontend/app`) against a seeded staging or development API.
2. Log in with anonymized test data — no real student names, CPFs, or partner-school identifiers.
3. Run `npm run capture:product` from `site/` when the SPA is reachable at `http://127.0.0.1:5173/app/`.
4. Replace the `*-placeholder.svg` files referenced in `index.html` with WebP captures.
5. Re-run `npm run evidence` to attach updated captures to the review bundle.

## Required captures (claims matrix)

| Surface | Status label | File target |
|---------|--------------|-------------|
| Boletos | Automação financeira parceira já em operação | `boletos.webp` |
| Boletins | Produto web em evolução | `boletins.webp` |
| Portal família | Em desenvolvimento | `portal-familia.webp` |
| Preceptoria | Produto web em evolução | `preceptoria.webp` |

Until authentic captures exist, placeholders are clearly marked in the SVG assets. Frame 04 markup is temporarily removed from `index.html` — restore it when WebP captures are ready.
