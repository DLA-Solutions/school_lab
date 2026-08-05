# Changelog

Every released change to `@school-lab/design-tokens` is recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the package follows semantic
versioning.

**When to bump major, minor or patch: `docs/guidelines/web-ui/versioning.md`.** A token change
never ships without a version bump and an entry below.

## [Unreleased]

Nothing yet.

## [1.2.0] — 2026-08-04

Closes the last blocking WCAG 2.1 AA failure in the SPA. `light.secondary.darker` was the fifth and
final token carrying a value chosen for the DashdarkX dark surface into the `light` scheme — the same
root cause 1.1.0 fixed for the four semantic status colours, left out of that release because it is a
separate value decision. `MuiDataGrid` fills the editing row with it while cells keep `text.primary`,
so in light mode near-black text sat on near-black navy at **1.20:1**. Minor rather than patch
because a rendered value moves — see `docs/guidelines/web-ui/versioning.md`.

### Changed

- `light.secondary.darker`: `#082366` → `#E4EBFF`. DataGrid editing-row cell text 1.20:1 → **14.69:1**.

The new value is a light tint of the same hue (224.1° → 224.4°), so the editing row still reads as a
blue highlight rather than a new accent. It was chosen by measurement rather than taken from the
proposal in `docs/guidelines/web-ui/accessibility.md` F8, which named `#DDE6FF`. That value closes the
cell-text failure at 14.03:1 but drops `primary.main` to **2.99:1** against the fill, and
`primary.main` is painted twice on this row — as the focus ring the DataGrid draws inset on
`.MuiDataGrid-cell:focus-within`, and as the Save action glyph in `OrdersStatusTable`. Both are
governed by the 3:1 of SC 1.4.11 / 2.4.7, so `#DDE6FF` would have closed one failure and opened two.
The constraint is two-sided — `text.primary` needs 4.5:1 from above, `primary.main` 3:1 from below —
and `#E4EBFF` is the closest point to the proposal that satisfies both with margin.

Three further light-mode pairings on the same row were below threshold before this change and are
fixed by it as a consequence. None had been measured, because the audit's inventory treated the
editing row as a single pairing:

| Pairing on the editing row (light) | Was | Now | Min |
|---|---|---|---|
| `primary.main` focus ring and Save glyph | 3.90:1 | 3.13:1 | 3:1 |
| `neutral.darker` edit-input border | 1.31:1 | **9.35:1** | 3:1 |
| `text.secondary` client e-mail and Cancel glyph | 1.93:1 | **6.32:1** | 4.5:1 |
| `neutral.dark` row checkbox stroke | 1.93:1 | **6.32:1** | 3:1 |

**Deliberately unchanged.** The whole `dark` block — DashdarkX is the dark scheme, and it stays
byte-identical to 1.0.0 and 1.1.0. Also `light.info.darker`, which holds the same `#082366` and is a
legacy alias no component in `frontend/main` reads; it is mapped by `mapTokensToPalette.ts` and used
only by the `frontend/base` template, so moving it would change nothing and widen the diff.

**Second consumer, verified not regressed.** `secondary.darker` is not read only by the DataGrid:
`components/sections/dashboard/website-visitors/VisitorsChartLegends.tsx` paints the *dimmed* Social
polar bar with it when another legend entry is selected. Against the `Paper` it sits on, that bar
goes from 14.56:1 to 1.19:1 in light. That is an improvement, not a regression, and for the same
reason the token needed to move: at `#082366` the dimmed bar was **more** prominent than the active
one (`secondary.lighter`, 2.21:1), so de-selecting a series made it stand out. It now recedes, which
is what dark already did (dimmed 1.21:1 against an active 2.69:1). Chart series colours are outside
the audit's measured inventory — the active bar is itself below 3:1 — so no threshold applies here in
either scheme.

The editing-row fill against the card drops from 14.56:1 to 1.19:1 (audit row N14), which is waived
decoration under W2 in both schemes: the row is also identified by the input controls it shows, and
dark has rendered that pairing at 1.21:1 since 1.0.0.

Consumers: `frontend/main` picks this up through `mapTokensToPalette.ts`, which passes the value
straight to the MUI palette, so no consumer code changes. `app/` reads the dark scheme only and is
unaffected.

## [1.1.0] — 2026-08-04

The `light` scheme gets its own semantic status colours. Six tokens carried byte-identical values in
both schemes, all of them tuned for the DashdarkX backdrop; on light surfaces they measured between
1.56:1 and 3.04:1, which accounted for ten of the light scheme's seventeen WCAG 2.1 AA failures. The
four below are the ones that can only be fixed in the tokens. Minor rather than patch because
rendered values move — see `docs/guidelines/web-ui/versioning.md`.

### Changed

- `light.success.main`: `#14CA74` → `#0B7A45`. Worst pairing 1.83:1 → 4.59:1.
- `light.warning.main`: `#FDB52A` → `#8A6316`. Worst pairing 1.56:1 → 4.77:1.
- `light.error.main`: `#FF5A65` → `#B03C44`. Worst pairing 2.47:1 → 4.75:1.
- `light.info.main`: `#00C2FF` → `#006F93`. Worst pairing 1.75:1 → 4.83:1.

Each value keeps the hue and saturation of its dark original and only drops lightness (hue moves by
at most 0.3°), so the light scheme still reads as the same product. Worst pairing is measured across
the three backdrops each token meets in light mode: its `transparent.*` tint over `background.paper`,
the same tint over `background.default`, and bare `background.paper`. All ten failing pairings now
clear 4.5:1, and no light pairing that passed before was lowered except the one noted below.

**Deliberately unchanged.** The whole `dark` block — DashdarkX is the dark scheme, and its values are
byte-identical to 1.0.0. Also `light.neutral.light` and `light.neutral.darker`, the other two tokens
identical across schemes: darkening either would regress pairings that pass today (`neutral.light` is
the Switch thumb on a `neutral.darker` track at 8.07:1, `neutral.darker` is the input border at
11.14:1), so their light-mode failures are fixed in the theme instead — see
`docs/guidelines/web-ui/accessibility.md` F6 and F7. And `light.transparent.*`, still built from the
dark hues: keeping them leaves every measured backdrop unchanged, so re-deriving them is a separate
change.

**One known consequence.** `error.main` is also a background, on the contained error Button
(`ConfirmDialog` destructive confirm). A value dark enough to read as text on white cannot also carry
a near-black label, so that label dropped from 5.75:1 to 2.98:1 in light. The fix is a per-scheme
label in `frontend/main/src/theme/components/button/Button.tsx` and needs no token change —
`docs/guidelines/web-ui/accessibility.md` F1.

Consumers: `frontend/main` picks this up through `mapTokensToPalette.ts`, which passes each value
straight to the MUI palette, so no consumer code changes. `app/` reads the dark scheme only and is
unaffected.

## [1.0.0] — 2026-08-04

Baseline: the token set as it existed when versioning started. Earlier changes predate this
changelog and are only in the Git history.

### Added

- `colors.json` with the `light` and `dark` semantic palettes: `background.default`,
  `background.paper`, `surface.alt`, `text.*`, `border.default`, `primary`, `secondary`,
  `success`, `warning`, `error`, `info`, `neutral`, `gradients.primary`, `transparent.*` and
  `customShadows`.
- Raw color scales (`grey`, `purple`, `cyan`, `blue`) kept from the DashdarkX template.
- `index.ts` typed exports: `tokens`, `getTokens(mode)`, `ColorScheme`, `SemanticTokens`,
  `DesignTokens`.

Consumers: `frontend/main/src/theme/mapTokensToPalette.ts` (both schemes) and `app/` (dark only).
