# Web UI design system

Governance and conventions for the School Lab React SPA (`frontend/main`).

## Visual reference

Static catalog (built from `frontend/design-system-docs/`):

- Open locally: `docs/design-system/index.html`
- Rebuild: `make design-system-docs` or `npm run build` in `frontend/design-system-docs/`

Development playground: Ladle in `frontend/main` (`npm run ladle`).

## Documents

| Doc | Purpose |
|-----|---------|
| [tokens.md](./tokens.md) | Semantic color tokens, legacy `info.*` map, spacing, typography |
| [components.md](./components.md) | Pattern component APIs |
| [page-patterns.md](./page-patterns.md) | List, form, detail page composition |
| [theming.md](./theming.md) | colorSchemes, toggle, adding tokens |

## Layers

1. `packages/design-tokens` — shared JSON tokens (web + mobile)
2. `frontend/main/src/theme/` — MUI theme factory and primitive overrides
3. `frontend/main/src/design-system/` — product pattern components
4. Feature pages — consume patterns; do not duplicate card/header/chip layouts
