# Design tokens

Source: `packages/design-tokens/colors.json`. Consumed by `createAppTheme()` and `app/src/theme/colors.ts`.

## Semantic tokens (dark | light)

| Token | Dark | Light | Notes |
|-------|------|-------|-------|
| `background.default` | `#081028` | `#F7FAFC` | Page / drawer backdrop |
| `background.paper` | `#0B1739` | `#FFFFFF` | Cards, inputs |
| `surface.alt` | `#0A1330` | `#F1F5F9` | Hover rows, secondary surfaces |
| `text.primary` | `#FFFFFF` | `#171923` | |
| `text.secondary` | `#AEB9E1` | `#4A5568` | |
| `text.disabled` | `#4A5568` | `#7E89AC` | |
| `border.default` | `#2D3748` | `#D9E1FA` | Mapped to `palette.divider` |
| `primary.main` | `#CB3CFF` | `#CB3CFF` | Brand purple |
| `success.main` | `#14CA74` | `#14CA74` | |
| `warning.main` | `#FDB52A` | `#FDB52A` | |
| `error.main` | `#FF5A65` | `#FF5A65` | |
| `transparent.*` | 20% alpha | 15% alpha | Semantic chips |

## Legacy map (`info.*` → semantic)

Do **not** use `palette.info` for surfaces in new code.

| Legacy (DashdarkX) | Replacement |
|--------------------|-------------|
| `info.darker` | `background.default` |
| `info.main` | `background.paper` |
| `info.dark` | `surface.alt` |

## Spacing and typography

- Spacing unit: `8px` (`theme.spacing(1)`)
- Default `borderRadius`: `4px`; Paper uses `12px` (3 × radius)
- Fonts: Mona Sans (default), Work Sans (dashboard labels via `fontFamily.workSans`)

## Adding a token

1. Add to `colors.json` (both schemes).
2. Extend `SemanticTokens` in `packages/design-tokens/index.ts`.
3. Map in `mapTokensToPalette.ts`.
4. Rebuild the static doc site and update this table.
