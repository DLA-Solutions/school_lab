# Web UI design system

Governance and conventions for the School Lab React SPA (`frontend/app`).

## Visual reference

Static catalog (built from `frontend/design-system-docs/`):

- Open locally: `docs/design-system/index.html`
- Rebuild: `make design-system-docs` or `npm run build` in `frontend/design-system-docs/`

Development playground: Ladle in `frontend/app` (`npm run ladle`).

## Documents

| Doc | Purpose |
|-----|---------|
| [tokens.md](./tokens.md) | Semantic color tokens, legacy `info.*` map, spacing, typography |
| [components.md](./components.md) | Pattern component APIs |
| [page-patterns.md](./page-patterns.md) | List, form, detail page composition |
| [theming.md](./theming.md) | colorSchemes, toggle, adding tokens |
| [testing.md](./testing.md) | Vitest + Testing Library setup and conventions |
| [versioning.md](./versioning.md) | When to bump `@school-lab/design-tokens` |
| [accessibility.md](./accessibility.md) | WCAG 2.1 AA contrast audit, waivers, keyboard and ARIA baseline |
| [contributing.md](./contributing.md) | How to add a token, an override, a pattern component, a catalog page |

## Layers

1. `packages/design-tokens` — shared JSON tokens (web + mobile)
2. `frontend/app/src/theme/` — MUI theme factory and primitive overrides
3. `frontend/app/src/design-system/` — product pattern components
4. Feature pages — consume patterns; do not duplicate card/header/chip layouts
