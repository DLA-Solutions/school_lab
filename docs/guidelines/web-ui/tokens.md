# Design tokens

Source: `packages/design-tokens/colors.json`. Consumed by `createAppTheme()` and `mobile/src/theme/colors.ts`.

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
| `success.main` | `#14CA74` | `#0B7A45` | Light darkened for AA on white — same hue |
| `warning.main` | `#FDB52A` | `#8A6316` | Light darkened for AA on white — same hue |
| `error.main` | `#FF5A65` | `#B03C44` | Light darkened for AA on white — same hue |
| `info.main` | `#00C2FF` | `#006F93` | Legacy alias, see below; light darkened for AA |
| `transparent.*` | 20% alpha | 15% alpha | Semantic chips; built from the dark hues in both schemes |

The four light values above are scheme-specific as of tokens `1.1.0`; the dark values are the
DashdarkX originals. Rationale and measured ratios: [accessibility.md](./accessibility.md) → F5.

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
4. Bump the package version and add a `CHANGELOG.md` entry — see
   [versioning.md](./versioning.md).
5. Rebuild the static doc site and update this table.
