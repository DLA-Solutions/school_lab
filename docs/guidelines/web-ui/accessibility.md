# Accessibility

The accessibility baseline for `frontend/app`, and the record of the token contrast audit required
by `docs/prds/layer-web-spa.md` (Non-functional requirements → Accessibility, and the acceptance
criterion *"Token contrast ratios are verified for light and dark; failures are fixed or waived in
writing"*).

Audit date: **August 2026**, against `packages/design-tokens` **1.0.0**
(`colors.json`, both schemes) and the theme overrides registered in
`frontend/app/src/theme/createAppTheme.ts` — 62 at the time of the first sweep, **64** today.

Re-measured **2026-08-04** against **1.1.0**, after F5 gave the `light` scheme its own semantic
status colours. Only the light rows F5 touches have moved. The `dark` palette was not changed, so
every dark measurement below still stands exactly as first taken.

Re-measured again **2026-08-04**, after the theme-override pass applied F1, F2, F3, F4, F6, F7, F9,
F10 and the white label that waiver W3 requires. **No token moved.** `packages/design-tokens` is
still **1.1.0** and both `colors.json` blocks are byte-identical to what F5 left them. Every ratio
that changed below changed because an override now names a *different* token, not because a token
holds a different value — which is why this pass carries no version bump. F8 is the one fix that
cannot be expressed that way and is still open.

Re-measured a third time **2026-08-04** against **1.2.0**, after F8 gave `light.secondary.darker` its
own value. Only T11 and N14 move, and only in light; the `dark` palette is byte-identical to 1.0.0
for the third release running.

Re-measured a fourth time **2026-08-04**, against the two picker overrides
(`MuiPickersOutlinedInput`, `MuiPickersSectionList`) that took the date-picker field's styling out of
a local `sx`. That pass found a **reachable failure this document had wrongly excluded**: the
exclusion below rested on "no date picker is mounted anywhere in the SPA", which stopped being true
when `components/common/DateSelect.tsx` shipped in `RevenueByCustomer` and `CompletedTask`. The
pairing is now measured as **B07** and fixed by F12; **no token moved**, so `packages/design-tokens`
is still **1.2.0**. **No blocking AA failure remains in either scheme** — a claim that was
inaccurate between the third pass and this one.

## Target and thresholds

The target is **WCAG 2.1 level AA**. Three thresholds apply, and picking the wrong one is the most
common way a contrast audit produces noise:

| Threshold | Success criterion | Applies to |
|-----------|-------------------|------------|
| **4.5:1** | 1.4.3 Contrast (Minimum) | Normal body text and images of text |
| **3:1** | 1.4.3 Contrast (Minimum) | Large text — at least 24px, or 18.66px when bold (>= 700) |
| **3:1** | 1.4.11 Non-text Contrast | Boundaries needed to identify a UI component or its state, and graphical objects needed to understand content |

Two exclusions are part of the standard and are used deliberately below:

- **Inactive components are exempt.** 1.4.3 excludes "text or images of text that are part of an
  inactive user interface component". Every `text.disabled` pairing falls here.
- **Decoration is exempt.** 1.4.11 covers boundaries that carry information. Row banding, a card
  edge against the page backdrop, and the tinted fill behind an alert whose meaning is already
  carried by its text and icon are decorative — they are measured below and marked *Advisory*, not
  *Fail*.

### Which type sizes actually exist

`frontend/app/src/theme/typography.ts` defines every variant the SPA uses. Only `h1`–`h5` clear the
large-text bar (`h5` is 20px/700). `h6` is 18px/700 — just under the 18.66px cut-off — and every
body, label, caption and button size is below it. **No pairing in this audit is relieved by the
large-text threshold**, because no failing pairing renders exclusively at `h5` or larger. Where a
pairing would pass at 3:1, that is noted, but it is not a basis for a waiver.

## Method

A throwaway Node script read `packages/design-tokens/colors.json` directly and computed WCAG 2.1
relative luminance and contrast ratios for **48 pairings in each scheme (96 total)**. Translucent
values (`transparent.*`, and the sidebar's former `opacity: 0.3`) are alpha-composited over their
real backdrop before measurement, because that is what the eye receives — and the composite is kept
in floating point, since rounding it to a hex triplet first moves a tint pairing by up to 0.04.
The gradient primary is measured at **both stops**, since a single flat label colour has to work
across the whole sweep.

The inventory started at 45 and has grown by three — two in the override pass, one in the picker
pass:

- **N15** is a genuine gap. `KPI.tsx` paints the card's overflow control in `neutral.light`, which
  is the same `#D1DBF9` in both schemes and therefore 1.38:1 on a white card. Nothing in the
  original 45 covered it, because the pairing lives in a section component rather than in a theme
  override, and the sweep was of `theme/components/**`.
- **N16** is not new, it is **N04 split**. N04 measured `neutral.darker` once and attributed it to
  three components at the same time. F3 moved only the InputBase border off that token, so the
  Divider and the Switch track need their own row rather than riding on a verdict that no longer
  describes them.
- **B07** was excluded, wrongly, and is now measured. See the exclusion table below: the pairing was
  parked as *latent* on a premise about the codebase that a later change falsified, and nothing
  re-checked the premise. That is the failure mode this row exists to record — an exclusion is a
  claim about what the SPA composes, and it goes stale exactly as easily as a ratio does.

The script is not committed: it has no consumer, and re-running an audit is a deliberate act rather
than a build step. Re-create it from this document's pairing list when tokens change.

Every 2026-08-04 re-measurement did exactly that: the script was rebuilt from the pairing list
below and reproduced every prior ratio to the last digit before anything was changed. Only rows
whose ratio actually moved were edited. The override pass additionally re-ran the **whole** table in
both schemes rather than only the rows it expected to touch, which is how the V02 promotion below
was caught; the picker pass re-read the **exclusion** table against `src/` the same way, which is
how B07 was caught.

Six of the fixes are now pinned by specs rather than by this document alone — F1, F2, F4, F6, F7 and
N15, plus the white label W3 depends on. `src/test/contrast.ts` computes the same ratio at render
time from the colour the mounted scheme actually resolves, and `componentOverrides.test.tsx`,
`ListItem.test.tsx` and `KPI.test.tsx` assert it in **both** schemes. Those specs assert the
*ratio*, not the colour name, so a token that moves underneath an override fails a test instead of
quietly failing WCAG. F3 and F12 are not among them and rest on the measurement alone — see
[Re-running this audit](#re-running-this-audit) for why each was left out.

### Which pairings are real

Every pairing below was confirmed against `frontend/app/src` — the theme overrides in
`src/theme/components/**`, the pattern components in `src/design-system/`, and the shell in
`src/layouts/`. Combinations that the theme can express but nothing composes were excluded:

| Excluded | Why |
|----------|-----|
| Selected day in the date pickers | **No longer a blanket exclusion — see B07.** The selected *month* and *year* are mounted and measured. The selected **day** is not: `DateSelect` opens with `views={['month', 'year']}`, so the day grid never renders and no `MuiPickersDay` override exists. Latent, and it fails the same way B07 did — MUI-derived white on `primary.main` at **3.73:1** — so a screen that adds a day view adds a `MuiPickersDay` override giving `.Mui-selected` a `grey[900]` label in the same change. |
| `Avatar` initials on `primary.main` | `ProfileMenu` always passes `src`, so the avatar renders an image and never falls back to text. |
| `purple.*`, `cyan.*`, `blue.*` | Not mapped into the palette by `mapTokensToPalette.ts`; nothing reads them. They duplicate values already exposed semantically. |
| `secondary.lighter` / `secondary.light` | Chart series colours — on the ECharts canvas and on the DOM legend swatch that keys it. Neither is text nor a component boundary. Measured below and **waived under W4**, not silently dropped. |

Three more pairings are measured here rather than in the main tables, because none is a token
pairing the theme composes as text. `grey.*` **is** mapped and read, and used to account for the
first two; after F10 only the chart gridlines still reach for it:

| Usage | Dark | Light |
|-------|------|-------|
| Scrollbar thumb — `neutral.main` on the scrolled surface (`theme/styles/scrollbar.ts`, `simplebar.ts`) | 9.05–9.71:1 | 3.31–3.46:1 |
| Chart split lines — `grey[700]` / `grey[200]` on `background.paper` (`useChartTheme.ts`) | 1.46:1 | 1.38:1 |
| Chart series and their legend swatches — `secondary.lighter` on `background.paper` (`useChartTheme.ts`, `VisitorsChartLegend.tsx`, `RevenueChartLegend.tsx`) | 2.69:1 | 2.21:1 |

The light-mode scrollbar thumb **was** a genuine shortfall at 1.85–1.94:1: a custom scrollbar is a
UI component, and its thumb is the part a pointer user has to find, so 1.4.11's 3:1 applies. The
cause was the same "identical value across schemes" root cause as F5 — the thumb was painted in
`grey[300]`, which is `#AEB9E1` in both. F10 swapped it for `neutral.main`, which happens to *be*
`#AEB9E1` in dark (so nothing moved there) and `#7E89AC` in light. Chart split lines are gridlines:
decorative reference marks whose data is read from the labelled axes, so they are waived on the same
basis as W2.

The third row is `secondary.lighter`, and it is the reason the series-colour exclusion is now
written as a waiver rather than as a dismissal. It was reviewed on 2026-08-04 and is **accepted with
reasoning under W4**, but the reasoning is narrow enough that a human should read it before treating
the row as settled — see [W4](#w4--chart-series-colours-and-their-legend-swatches-secondarylighter-secondarylight).

Four themed primitives — `Breadcrumbs`, `Stepper` / `StepLabel`, `Switch` and `SnackbarContent` —
have no screen composing them yet. Their pairings *are* measured, because they reuse tokens that
rendered surfaces also use, but nothing regresses today if they fail. `Tooltip` shares
`neutral.darker` with `SnackbarContent` and **is** live (topbar, `ThemeToggle`, `LanguageSelect`,
`ProfileMenu`), so F6 below was a real defect rather than a latent one — which is why it was fixed
in this pass while F11, on the unmounted `Switch`, was not.

Two pairings deserve their inclusion made explicit, because they look like dead code and are not:

- **`secondary.darker` as a DataGrid editing row** (T11 / N14) is real —
  `components/sections/dashboard/orders-status/OrdersStatusTable.tsx` sets `editMode="row"` with
  three editable columns.
- **The sidebar's dimmed nav item** (V01) was real — `layouts/main-layout/sidebar/list-items/ListItem.tsx`
  applied `sx={{ opacity: active ? 1 : 0.3 }}` to the whole button, icon and label included. F4 has
  removed it; the row is kept and re-measured rather than dropped, because the *pairing* still
  renders, only at a different value.

## Results — dark

Dark is the default scheme and the one users see. **48 pairings, 1 accepted-waiver shortfall
(B01, under W3), 1 latent shortfall (N16), 13 exempt or advisory. No blocking AA failure remains.**

Before the override pass it was 45 pairings with 6 AA failures; the picker pass added B07, which was
a blocking failure in both schemes until F12 closed it.

#### What moved — dark

| ID | Was | Now | Cause |
|----|-----|-----|-------|
| T09 | 11.14:1 | 11.14:1 | F6 pinned the Tooltip / Snackbar label to `common.white` instead of `text.primary`. Identical value in dark, so nothing renders differently — the change exists for light. |
| T10 | 12.72:1 | 9.05:1 | F7 moved the pagination digit from `neutral.light` to `text.secondary`. A deliberate step down, taken so light stops failing at 1.38:1. |
| B05 | **3.04:1** | 5.75:1 | F1 gave `containedError` a `grey[900]` label instead of inheriting white from the `MuiButton` root. |
| B06 | **2.70:1** | 4.69:1 | F2 gave `.Mui-selected` a `grey[900]` digit. |
| V01 | **1.93:1** | 9.71:1 | F4 removed `opacity: 0.3`; the label is the themed `text.secondary` at full strength. |
| V02 | 9.71:1 | 18.83:1 | F4 consequence. Once the dimming is gone, "active" and "inactive" would have shared `text.secondary`, so active items are promoted to `text.primary`. |
| N04 | **1.58:1** | 5.07:1 | F3 pointed the InputBase border at `neutral.dark`. |
| N05 | **1.69:1** | 5.44:1 | F3, on the `colorSecondary` backdrop. |
| N15 | — | 9.05:1 | New row. The KPI overflow control was already `neutral.light` here and already passing; it is added because light was not. |
| N16 | — | 1.58:1 | New row, split out of N04. The Divider and Switch track still use `neutral.darker`. |
| B07 | **3.73:1** | 4.69:1 | New row, and the exclusion it replaces was wrong. F12 gave the selected month and year a `grey[900]` label instead of the MUI-derived white. |

#### Text on surfaces — dark

| ID | Foreground | Background (resolved) | Where it renders | Ratio | Min | Verdict |
|----|------------|-----------------------|------------------|-------|-----|---------|
| T01 | `text.primary` #FFFFFF | `background.default` #081028 | CssBaseline body, sidebar heading, page content on the app backdrop | 18.83:1 | 4.5:1 | Pass |
| T02 | `text.primary` #FFFFFF | `background.paper` #0B1739 | Paper/SectionCard body, DialogTitle, DataGrid cell on an even row | 17.56:1 | 4.5:1 | Pass |
| T03 | `text.primary` #FFFFFF | `surface.alt` #0A1330 | DataGrid cell on an odd row, contained secondary Button label | 18.28:1 | 4.5:1 | Pass |
| T04 | `text.secondary` #AEB9E1 | `background.default` #081028 | Footer, sidebar ListItemText, topbar icon buttons | 9.71:1 | 4.5:1 | Pass |
| T05 | `text.secondary` #AEB9E1 | `background.paper` #0B1739 | FormLabel, FormHelperText, DialogContentText, InputBase placeholder | 9.05:1 | 4.5:1 | Pass |
| T06 | `text.secondary` #AEB9E1 | `surface.alt` #0A1330 | Avatar colorDefault initials, DataGrid overlay text | 9.42:1 | 4.5:1 | Pass |
| T07 | `text.disabled` #4A5568 | `background.paper` #0B1739 | disabled FormLabel, disabled text/outlined Button, Breadcrumbs separator | 2.33:1 | 4.5:1 | Exempt |
| T08 | `text.disabled` #4A5568 | `background.default` #081028 | disabled controls on the app backdrop | 2.50:1 | 4.5:1 | Exempt |
| T09 | `common.white` #FFFFFF | `neutral.darker` #343B4F | Tooltip label, SnackbarContent message | 11.14:1 | 4.5:1 | Pass |
| T10 | `text.secondary` #AEB9E1 | `background.paper` #0B1739 | PaginationItem (unselected) in the DataTable footer | 9.05:1 | 4.5:1 | Pass |
| T11 | `text.primary` #FFFFFF | `secondary.darker` #082366 | DataGrid row in edit mode | 14.56:1 | 4.5:1 | Pass |

#### Semantic as text — dark

| ID | Foreground | Background (resolved) | Where it renders | Ratio | Min | Verdict |
|----|------------|-----------------------|------------------|-------|-----|---------|
| S01 | `success.main` #14CA74 | `transparent.success` over `background.paper` → #0A3942 | Alert severity="success", SemanticChip variant="success" on a card | 5.80:1 | 4.5:1 | Pass |
| S02 | `warning.main` #FDB52A | `transparent.warning` over `background.paper` → #3C3632 | Alert severity="warning", SemanticChip variant="warning" on a card | 6.73:1 | 4.5:1 | Pass |
| S03 | `error.main` #FF5A65 | `transparent.error` over `background.paper` → #3C2442 | Alert severity="error" (ErrorBanner), SemanticChip variant="error" on a card | 4.52:1 | 4.5:1 | Pass |
| S04 | `info.main` #00C2FF | `transparent.info` over `background.paper` → #093961 | Alert severity="info", SemanticChip variant="info" on a card | 5.74:1 | 4.5:1 | Pass |
| S05 | `success.main` #14CA74 | `transparent.success` over `background.default` → #073335 | same chips/alerts rendered directly on the page backdrop | 6.31:1 | 4.5:1 | Pass |
| S06 | `warning.main` #FDB52A | `transparent.warning` over `background.default` → #393024 | same chips/alerts rendered directly on the page backdrop | 7.27:1 | 4.5:1 | Pass |
| S07 | `error.main` #FF5A65 | `transparent.error` over `background.default` → #391F34 | same chips/alerts rendered directly on the page backdrop | 4.86:1 | 4.5:1 | Pass |
| S08 | `info.main` #00C2FF | `transparent.info` over `background.default` → #063453 | same chips/alerts rendered directly on the page backdrop | 6.28:1 | 4.5:1 | Pass |
| S09 | `error.main` #FF5A65 | `background.paper` #0B1739 | FormHelperText.Mui-error, FormLabel.Mui-error, required asterisk, RateChip negative | 5.77:1 | 4.5:1 | Pass |
| S10 | `success.main` #14CA74 | `background.paper` #0B1739 | RateChip positive | 8.14:1 | 4.5:1 | Pass |
| S11 | `primary.main` #CB3CFF | `background.default` #081028 | selected sidebar nav item label + icon (ListItem active) | 5.05:1 | 4.5:1 | Pass |
| S12 | `text.secondary` #AEB9E1 | `transparent.error` over `background.paper` → #3C2442 | Alert action slot (ErrorBanner "Retry" button) | 7.09:1 | 4.5:1 | Pass |

#### Filled controls — dark

| ID | Foreground | Background (resolved) | Where it renders | Ratio | Min | Verdict |
|----|------------|-----------------------|------------------|-------|-----|---------|
| B01 | `common.white` #FFFFFF | `gradients.primary.main` #CB3CFF | contained primary Button label — gradient stop 1 (19.86%) | 3.73:1 | 4.5:1 | **Waived (W3)** |
| B02 | `common.white` #FFFFFF | `gradients.primary.state` #7F25FB | contained primary Button label — gradient stop 2 (68.34%) | 5.90:1 | 4.5:1 | Pass |
| B03 | `text.primary` #FFFFFF | `surface.alt` #0A1330 | contained secondary Button label | 18.28:1 | 4.5:1 | Pass |
| B04 | `text.secondary` #AEB9E1 | `text.disabled` #4A5568 | disabled contained Button label | 3.88:1 | 4.5:1 | Exempt |
| B05 | `grey[900]` #171923 | `error.main` #FF5A65 | ConfirmDialog destructive confirm Button | 5.75:1 | 4.5:1 | Pass |
| B06 | `grey[900]` #171923 | `primary.main` #CB3CFF | selected PaginationItem digit | 4.69:1 | 4.5:1 | Pass |
| B07 | `grey[900]` #171923 | `primary.main` #CB3CFF | selected month and year in the date-picker popper (`DateSelect`) | 4.69:1 | 4.5:1 | Pass |

#### Sidebar — dark

| ID | Foreground | Background (resolved) | Where it renders | Ratio | Min | Verdict |
|----|------------|-----------------------|------------------|-------|-----|---------|
| V01 | `text.secondary` #AEB9E1 | `background.default` #081028 | inactive sidebar nav item | 9.71:1 | 4.5:1 | Pass |
| V02 | `text.primary` #FFFFFF | `background.default` #081028 | active sidebar nav item that is not the dashboard root | 18.83:1 | 4.5:1 | Pass |

#### Boundaries — dark

| ID | Foreground | Background (resolved) | Where it renders | Ratio | Min | Verdict |
|----|------------|-----------------------|------------------|-------|-----|---------|
| N01 | `border.default` #2D3748 | `background.paper` #0B1739 | Tabs bottom rule, Menu/Autocomplete paper border, StepConnector line | 1.46:1 | 3:1 | Advisory |
| N02 | `border.default` #2D3748 | `background.default` #081028 | dividers drawn on the page backdrop | 1.57:1 | 3:1 | Advisory |
| N03 | `border.default` #2D3748 | `surface.alt` #0A1330 | divider between alternating DataGrid rows | 1.52:1 | 3:1 | Advisory |
| N04 | `neutral.dark` #7E89AC | `background.paper` #0B1739 | InputBase border | 5.07:1 | 3:1 | Pass |
| N05 | `neutral.dark` #7E89AC | `background.default` #081028 | InputBase colorSecondary border on the page backdrop | 5.44:1 | 3:1 | Pass |
| N06 | `primary.main` #CB3CFF | `background.paper` #0B1739 | Tabs indicator, active StepConnector, Switch track (on) | 4.71:1 | 3:1 | Pass |
| N07 | `background.paper` #0B1739 | `background.default` #081028 | Drawer right border, card edge against the page backdrop | 1.07:1 | 3:1 | Advisory |
| N08 | `surface.alt` #0A1330 | `background.paper` #0B1739 | odd DataGrid row banding, LinearProgress track, Skeleton block | 1.04:1 | 3:1 | Advisory |
| N09 | `transparent.success` #0A3942 | `background.paper` #0B1739 | success Alert/SemanticChip border and fill against the card | 1.40:1 | 3:1 | Advisory |
| N10 | `transparent.warning` #3C3632 | `background.paper` #0B1739 | warning Alert/SemanticChip border and fill against the card | 1.47:1 | 3:1 | Advisory |
| N11 | `transparent.error` #3C2442 | `background.paper` #0B1739 | error Alert/SemanticChip border and fill against the card | 1.28:1 | 3:1 | Advisory |
| N12 | `transparent.info` #093961 | `background.paper` #0B1739 | info Alert/SemanticChip border and fill against the card | 1.48:1 | 3:1 | Advisory |
| N13 | `neutral.light` #D1DBF9 | `neutral.darker` #343B4F | Switch thumb (off) against its track | 8.07:1 | 3:1 | Pass |
| N14 | `secondary.darker` #082366 | `background.paper` #0B1739 | DataGrid editing-row highlight against the card | 1.21:1 | 3:1 | Advisory |
| N15 | `text.secondary` #AEB9E1 | `background.paper` #0B1739 | KPI card overflow-menu glyph | 9.05:1 | 3:1 | Pass |
| N16 | `neutral.darker` #343B4F | `background.paper` #0B1739 | Divider, Switch track (off) | 1.58:1 | 3:1 | Latent — see F11 |

## Results — light

**48 pairings, 1 accepted-waiver shortfall (B01, under W3), 13 exempt or advisory. No blocking AA
failure remains.** Before F12 it was 1 blocking failure (B07, which light and dark shared); before
F8, 1 blocking failure and 12 exempt or advisory; before the override pass it was 45 pairings with
8 AA failures, and before F5, 17.
Light used to be materially worse than dark, which was the opposite of the intuition. The reason was
structural: light mode inherited several values that were only ever chosen for a dark surface, so a
colour tuned to glow on `#0B1739` was asked to read on `#FFFFFF`.

F5 removed ten of those failures by giving `success.main`, `warning.main`, `error.main` and
`info.main` their own values in the `light` block. The override pass removed six more without
touching a token, by moving the overrides off the values that are byte-identical in both schemes —
`neutral.light` and `neutral.darker` still are, which is exactly why T09, T10 and N15 no longer
name them.

The last one, T11, was the only failure in this document that could not be expressed as an override
change. F8 has now closed it in tokens `1.2.0`.

#### What moved — light

| ID | Was | Now | Cause |
|----|-----|-----|-------|
| T09 | **1.57:1** | 11.14:1 | F6. The Tooltip / Snackbar plate is deliberately inverted in both schemes, so the label is `common.white` rather than `text.primary`. |
| T10 | **1.38:1** | 7.53:1 | F7 moved the pagination digit to `text.secondary`. |
| S11 | **3.56:1** | 16.70:1 | F9. The active nav label is `text.primary` in light; the brand purple survives on the icon (X01, 3.56:1 against a 3:1 threshold) and on the dark label. |
| B01 | 4.69:1 | **3.73:1** | W3. Light used to inherit `#171923`, which reads better at stop 1 and much worse at stop 2. What governs is the worst stop, and that improved from 2.97:1 to 3.73:1 — the ceiling for any flat label on this gradient. |
| B02 | **2.97:1** | 5.90:1 | W3, same change seen at the other stop. |
| B05 | **2.98:1** | 5.87:1 | F1 gave `containedError` a white label in light. |
| B06 | **2.70:1** | 4.69:1 | F2. |
| V01 | **1.60:1** | 7.18:1 | F4 removed `opacity: 0.3`. |
| V02 | 7.18:1 | 16.70:1 | F4 consequence — active items promoted to `text.primary`. |
| N15 | — | 7.53:1 | New row, and the reason it is new: at `neutral.light` this glyph was **1.38:1**. |
| N16 | — | 11.14:1 | New row, split out of N04. Light already passed and still does. |
| T11 | **1.20:1** | 14.69:1 | F8 gave `light.secondary.darker` its own value in tokens 1.2.0. |
| B07 | **3.73:1** | 4.69:1 | New row. F12, identical to dark — `primary.main` and `grey[900]` both hold the same value in both schemes, so one label serves both. |
| N14 | 14.56:1 | 1.19:1 | F8 consequence. The editing-row fill is now a tint rather than a near-black navy, so it recedes against the card instead of dominating it — decoration, waived under W2, and the same reading dark has always had (1.21:1). |

N04 and N05 do not appear above: F3 is scoped to the dark scheme with `theme.applyStyles`, so the
light input border still renders `neutral.darker` at exactly the ratios it did before.

#### Text on surfaces — light

| ID | Foreground | Background (resolved) | Where it renders | Ratio | Min | Verdict |
|----|------------|-----------------------|------------------|-------|-----|---------|
| T01 | `text.primary` #171923 | `background.default` #F7FAFC | CssBaseline body, sidebar heading, page content on the app backdrop | 16.70:1 | 4.5:1 | Pass |
| T02 | `text.primary` #171923 | `background.paper` #FFFFFF | Paper/SectionCard body, DialogTitle, DataGrid cell on an even row | 17.50:1 | 4.5:1 | Pass |
| T03 | `text.primary` #171923 | `surface.alt` #F1F5F9 | DataGrid cell on an odd row, contained secondary Button label | 15.98:1 | 4.5:1 | Pass |
| T04 | `text.secondary` #4A5568 | `background.default` #F7FAFC | Footer, sidebar ListItemText, topbar icon buttons | 7.18:1 | 4.5:1 | Pass |
| T05 | `text.secondary` #4A5568 | `background.paper` #FFFFFF | FormLabel, FormHelperText, DialogContentText, InputBase placeholder | 7.53:1 | 4.5:1 | Pass |
| T06 | `text.secondary` #4A5568 | `surface.alt` #F1F5F9 | Avatar colorDefault initials, DataGrid overlay text | 6.87:1 | 4.5:1 | Pass |
| T07 | `text.disabled` #7E89AC | `background.paper` #FFFFFF | disabled FormLabel, disabled text/outlined Button, Breadcrumbs separator | 3.46:1 | 4.5:1 | Exempt |
| T08 | `text.disabled` #7E89AC | `background.default` #F7FAFC | disabled controls on the app backdrop | 3.31:1 | 4.5:1 | Exempt |
| T09 | `common.white` #FFFFFF | `neutral.darker` #343B4F | Tooltip label, SnackbarContent message | 11.14:1 | 4.5:1 | Pass |
| T10 | `text.secondary` #4A5568 | `background.paper` #FFFFFF | PaginationItem (unselected) in the DataTable footer | 7.53:1 | 4.5:1 | Pass |
| T11 | `text.primary` #171923 | `secondary.darker` #E4EBFF | DataGrid row in edit mode | 14.69:1 | 4.5:1 | Pass |

#### Semantic as text — light

| ID | Foreground | Background (resolved) | Where it renders | Ratio | Min | Verdict |
|----|------------|-----------------------|------------------|-------|-----|---------|
| S01 | `success.main` #0B7A45 | `transparent.success` over `background.paper` → #DCF7EA | Alert severity="success", SemanticChip variant="success" on a card | 4.77:1 | 4.5:1 | Pass |
| S02 | `warning.main` #8A6316 | `transparent.warning` over `background.paper` → #FFF4DF | Alert severity="warning", SemanticChip variant="warning" on a card | 4.97:1 | 4.5:1 | Pass |
| S03 | `error.main` #B03C44 | `transparent.error` over `background.paper` → #FFE6E8 | Alert severity="error" (ErrorBanner), SemanticChip variant="error" on a card | 4.96:1 | 4.5:1 | Pass |
| S04 | `info.main` #006F93 | `transparent.info` over `background.paper` → #D9F6FF | Alert severity="info", SemanticChip variant="info" on a card | 5.03:1 | 4.5:1 | Pass |
| S05 | `success.main` #0B7A45 | `transparent.success` over `background.default` → #D5F3E8 | same chips/alerts rendered directly on the page backdrop | 4.59:1 | 4.5:1 | Pass |
| S06 | `warning.main` #8A6316 | `transparent.warning` over `background.default` → #F8F0DD | same chips/alerts rendered directly on the page backdrop | 4.77:1 | 4.5:1 | Pass |
| S07 | `error.main` #B03C44 | `transparent.error` over `background.default` → #F8E2E5 | same chips/alerts rendered directly on the page backdrop | 4.75:1 | 4.5:1 | Pass |
| S08 | `info.main` #006F93 | `transparent.info` over `background.default` → #D2F2FC | same chips/alerts rendered directly on the page backdrop | 4.83:1 | 4.5:1 | Pass |
| S09 | `error.main` #B03C44 | `background.paper` #FFFFFF | FormHelperText.Mui-error, FormLabel.Mui-error, required asterisk, RateChip negative | 5.87:1 | 4.5:1 | Pass |
| S10 | `success.main` #0B7A45 | `background.paper` #FFFFFF | RateChip positive | 5.41:1 | 4.5:1 | Pass |
| S11 | `text.primary` #171923 | `background.default` #F7FAFC | selected sidebar nav item label (ListItem active) | 16.70:1 | 4.5:1 | Pass |
| S12 | `text.secondary` #4A5568 | `transparent.error` over `background.paper` → #FFE6E8 | Alert action slot (ErrorBanner "Retry" button) | 6.37:1 | 4.5:1 | Pass |

#### Filled controls — light

| ID | Foreground | Background (resolved) | Where it renders | Ratio | Min | Verdict |
|----|------------|-----------------------|------------------|-------|-----|---------|
| B01 | `common.white` #FFFFFF | `gradients.primary.main` #CB3CFF | contained primary Button label — gradient stop 1 (19.86%) | 3.73:1 | 4.5:1 | **Waived (W3)** |
| B02 | `common.white` #FFFFFF | `gradients.primary.state` #7F25FB | contained primary Button label — gradient stop 2 (68.34%) | 5.90:1 | 4.5:1 | Pass |
| B03 | `text.primary` #171923 | `surface.alt` #F1F5F9 | contained secondary Button label | 15.98:1 | 4.5:1 | Pass |
| B04 | `text.secondary` #4A5568 | `text.disabled` #7E89AC | disabled contained Button label | 2.17:1 | 4.5:1 | Exempt |
| B05 | `common.white` #FFFFFF | `error.main` #B03C44 | ConfirmDialog destructive confirm Button | 5.87:1 | 4.5:1 | Pass |
| B06 | `grey[900]` #171923 | `primary.main` #CB3CFF | selected PaginationItem digit | 4.69:1 | 4.5:1 | Pass |
| B07 | `grey[900]` #171923 | `primary.main` #CB3CFF | selected month and year in the date-picker popper (`DateSelect`) | 4.69:1 | 4.5:1 | Pass |

#### Sidebar — light

| ID | Foreground | Background (resolved) | Where it renders | Ratio | Min | Verdict |
|----|------------|-----------------------|------------------|-------|-----|---------|
| V01 | `text.secondary` #4A5568 | `background.default` #F7FAFC | inactive sidebar nav item | 7.18:1 | 4.5:1 | Pass |
| V02 | `text.primary` #171923 | `background.default` #F7FAFC | active sidebar nav item that is not the dashboard root | 16.70:1 | 4.5:1 | Pass |

#### Boundaries — light

| ID | Foreground | Background (resolved) | Where it renders | Ratio | Min | Verdict |
|----|------------|-----------------------|------------------|-------|-----|---------|
| N01 | `border.default` #D9E1FA | `background.paper` #FFFFFF | Tabs bottom rule, Menu/Autocomplete paper border, StepConnector line | 1.30:1 | 3:1 | Advisory |
| N02 | `border.default` #D9E1FA | `background.default` #F7FAFC | dividers drawn on the page backdrop | 1.24:1 | 3:1 | Advisory |
| N03 | `border.default` #D9E1FA | `surface.alt` #F1F5F9 | divider between alternating DataGrid rows | 1.19:1 | 3:1 | Advisory |
| N04 | `neutral.darker` #343B4F | `background.paper` #FFFFFF | InputBase border | 11.14:1 | 3:1 | Pass |
| N05 | `neutral.darker` #343B4F | `background.default` #F7FAFC | InputBase colorSecondary border on the page backdrop | 10.63:1 | 3:1 | Pass |
| N06 | `primary.main` #CB3CFF | `background.paper` #FFFFFF | Tabs indicator, active StepConnector, Switch track (on) | 3.73:1 | 3:1 | Pass |
| N07 | `background.paper` #FFFFFF | `background.default` #F7FAFC | Drawer right border, card edge against the page backdrop | 1.05:1 | 3:1 | Advisory |
| N08 | `surface.alt` #F1F5F9 | `background.paper` #FFFFFF | odd DataGrid row banding, LinearProgress track, Skeleton block | 1.10:1 | 3:1 | Advisory |
| N09 | `transparent.success` #DCF7EA | `background.paper` #FFFFFF | success Alert/SemanticChip border and fill against the card | 1.13:1 | 3:1 | Advisory |
| N10 | `transparent.warning` #FFF4DF | `background.paper` #FFFFFF | warning Alert/SemanticChip border and fill against the card | 1.09:1 | 3:1 | Advisory |
| N11 | `transparent.error` #FFE6E8 | `background.paper` #FFFFFF | error Alert/SemanticChip border and fill against the card | 1.18:1 | 3:1 | Advisory |
| N12 | `transparent.info` #D9F6FF | `background.paper` #FFFFFF | info Alert/SemanticChip border and fill against the card | 1.13:1 | 3:1 | Advisory |
| N13 | `neutral.light` #D1DBF9 | `neutral.darker` #343B4F | Switch thumb (off) against its track | 8.07:1 | 3:1 | Pass |
| N14 | `secondary.darker` #E4EBFF | `background.paper` #FFFFFF | DataGrid editing-row highlight against the card | 1.19:1 | 3:1 | Advisory |
| N15 | `text.secondary` #4A5568 | `background.paper` #FFFFFF | KPI card overflow-menu glyph | 7.53:1 | 3:1 | Pass |
| N16 | `neutral.darker` #343B4F | `background.paper` #FFFFFF | Divider, Switch track (off) | 11.14:1 | 3:1 | Pass |

## Failures, fixes and waivers

Every failure below carries either a concrete replacement value or a written waiver.

**Everything except F11 has now been applied.** F5 landed as tokens 1.1.0 and W3 was formally
waived, both on 2026-08-04; the override pass later the same day applied F1, F2, F3, F4, F6, F7, F9,
F10 and the white label W3 depends on; F8 followed as tokens 1.2.0, the one fix that needed a token
value to move rather than a theme edit; F12 closed B07, the pairing this document had wrongly
excluded. **No blocking failure remains in either scheme.** F11 is a latent shortfall that the F3
fix exposed, on a component no screen composes.

`docs/prds/layer-web-spa.md` puts "redesigning the DashdarkX visual identity" out of scope. F5 stayed
inside that boundary because `colors.json` is split per scheme and the `dark` block was untouched;
the override pass stayed inside it more simply still, by changing no token at all.

Dark still changed where dark was failing — the destructive label, the selected pagination digit, the
input border and the sidebar dimming all repaint in the default scheme, because all four were AA
failures *in* the default scheme. What was avoided is repainting dark for a problem that only exists
in light:

| Fix | How dark was spared |
|-----|---------------------|
| F3 input border | `theme.applyStyles('dark', …)` — the swap is dark-only in the other direction: light keeps `neutral.darker` untouched at 11.14:1 |
| F9 active nav label | `theme.applyStyles('dark', …)` keeps the brand purple on the dashboard root, which already measured 5.05:1 |
| F6 Tooltip / Snackbar label | `common.white` is what dark was already rendering; only light moves |
| F10 scrollbar thumb | `neutral.main` is `#AEB9E1` in dark, the same value `grey[300]` was painting |

Two exceptions are worth naming rather than burying, because they *did* step dark down to help light:
**F7** takes the pagination digit from 12.72:1 to 9.05:1 and **N15** takes the KPI overflow glyph
from 12.72:1 to 9.05:1, both by replacing `neutral.light` with `text.secondary`. Neither could be
scoped per scheme without leaving the two schemes reading from different tokens for the same
de-emphasised text, which is the drift that caused these failures in the first place.

Bump levels follow [versioning.md](./versioning.md). A change that alters a rendered value is a
**minor** bump at minimum; adding a token is also minor. Fixes that live in
`frontend/app/src/theme/` change no token and need **no bump** — those are the cheap ones, and most
of the light-mode damage fell into that category.

### Waived

#### W1 — `text.disabled` on every surface (T07, T08) and the disabled contained Button (B04)

Dark 2.33:1 / 2.50:1 / 3.88:1; light 3.46:1 / 3.31:1 / 2.17:1.

**Waived.** WCAG 2.1 SC 1.4.3 explicitly exempts text that is part of an inactive user interface
component. A disabled control is not operable, and dimming it is the conventional signal that it is
not. Raising `text.disabled` to meet 4.5:1 would make disabled controls indistinguishable from
enabled ones, trading a non-violation for a real usability regression.

One caveat that is **not** waived: `MuiBreadcrumbs.separator` also uses `text.disabled`, and a
breadcrumb separator is not an inactive control. It is purely decorative punctuation between links
that are themselves `text.secondary`, so it carries no information — acceptable as decoration.
`Breadcrumbs` is not composed by any screen today; if it ships, the separator should be given
`aria-hidden` treatment rather than a colour change.

#### W2 — Decorative surface adjacency (N01, N02, N03, N07, N08, N09–N12, N14)

Ratios between 1.04:1 and 1.57:1 in both schemes.

**Waived.** SC 1.4.11 requires 3:1 for boundaries needed to *identify a component or its state*, not
for every visible edge. These are all decoration:

- **N07, N08, N14** — a card edge against the page backdrop, DataGrid row banding, and the
  editing-row highlight. None of them is the only indicator of anything: the card's content
  identifies it, and the editing row also shows active input controls.
- **N09–N12** — the tinted fill and border of an `Alert` / `SemanticChip`. Severity is conveyed by
  the label text and the icon, both of which pass comfortably (S01–S08 in dark). The tint is
  reinforcement.
- **N01, N02, N03** — `border.default` used as a divider or a rule. A divider separates content
  visually; removing it loses no information.

The low-contrast banding is a legibility annoyance, not an AA violation. If it is ever tightened,
`border.default` would need roughly `#5E6673` in dark and `#8F94A5` in light for a 3:1 edge — both
of which read as a much heavier UI than DashdarkX intends, which is why this is a waiver.

#### W3 — Contained primary Button label on the gradient (B01 dark, B02 light)

Dark 3.73:1 at stop 1; light 2.97:1 at stop 2.

**Waived. Decision recorded 2026-08-04 by the product owner: the brand purple is preserved
deliberately. This is an accepted, reviewed exception — not an oversight, and not an unmeasured
corner.**

The contained primary Button paints
`linear-gradient(128.49deg, #CB3CFF 19.86%, #7F25FB 68.34%)`, and the label is a single flat colour
(`text.primary`, via the `MuiButton` root override). One flat colour has to hold across the whole
sweep, and none reaches 4.5:1 against both stops:

| Label colour | On `#CB3CFF` | On `#7F25FB` | Worst case |
|--------------|--------------|--------------|------------|
| `#FFFFFF` | 3.73:1 | 5.90:1 | **3.73:1** |
| `#171923` (light `text.primary`) | 4.69:1 | 2.97:1 | **2.97:1** |
| `#000000` | 5.63:1 | 3.56:1 | **3.56:1** |

White is not just the best of those three, it is the best of all of them: a sweep of the whole RGB
cube finds no flat colour whose worst case beats **3.73:1**. That is the theoretical ceiling for this
control, and it lands between the two thresholds — **above the 3:1 floor that governs non-text
contrast (1.4.11) and large text, below the 4.5:1 floor for normal text (1.4.3)**. So the pairing
clears every AA threshold except the one that actually applies to a 14–16px label at weight 500, and
it misses that one by 0.77.

AA is therefore unreachable without changing the gradient itself. The minimum change would be
darkening the first stop from `#CB3CFF` to about `#B733E5`, which brings white to **4.55:1** at stop 1
while stop 2 stays at 5.90:1 — AA across the whole sweep. **That is the change the product owner
declined.** `#CB3CFF` is named in [web-stack.md](../../web-stack.md) §14 as the brand purple and is
the same value as `primary.main`, so darkening it repaints the product's primary accent everywhere to
buy 0.82 of a ratio point on one control. Keeping the purple is the deliberate trade.

What this waiver accepts, and what it still requires:

- **Accepted:** the contained primary Button label sits below 4.5:1, at a floor of 3.73:1 — the
  highest any flat label can reach on this gradient. The button's fill and boundary are non-text and
  clear 1.4.11 comfortably, so the control itself stays identifiable; the accepted shortfall is
  confined to the label.
- **Satisfied 2026-08-04:** the 3.73:1 floor only holds if the label is **white in both schemes**.
  Light mode used to inherit `#171923` from the `MuiButton` root override, whose worst case is
  2.97:1 — strictly worse than white, and outside what is waived here. `containedPrimary` now sets
  `common.white` explicitly, so both schemes sit at the waived floor: 3.73:1 at stop 1, 5.90:1 at
  stop 2. Note this *lowers* light's stop-1 reading from 4.69:1; the worst stop is what governs a
  single flat label, and that is what improved. No token bump. Pinned by a spec in
  `componentOverrides.test.tsx`, which asserts the label is white and that its worst stop clears
  3.7:1 in both schemes — so a future edit cannot silently drop the label below the waived floor.
- **Rejected:** a text shadow or a solid label plate. It fights the template's flat aesthetic, and
  WCAG does not credit shadows toward the ratio.

Revisit only if the brand palette is reopened. `#B733E5` is the documented route to AA, and it would
be a **minor** bump touching `gradients.primary.main` — and `primary.main` alongside it, if the two
are to stay in step.

#### W4 — Chart series colours and their legend swatches (`secondary.lighter`, `secondary.light`)

`secondary.lighter` against `background.paper`: dark **2.69:1** (`#0E43FB`), light **2.21:1**
(`#8AADFF`). `secondary.light` (`#21C3FC`, identical in both schemes) is comfortable in dark at
8.59:1 and **2.04:1** in light.

**Accepted as an exception, reviewed 2026-08-04.** These are the only measured values in this
document that no threshold in [Target and thresholds](#target-and-thresholds) is written for, and
that is deliberate rather than convenient — but the reasoning is narrower than the old one-line
dismissal implied, so it is set out here.

The exclusion used to say these colours live "only as ECharts series colours against chart
backgrounds". Half of that is right and half was never checked. The canvas half holds: a series
colour's job under SC 1.4.11 is to be distinguishable **from the other series**, not from the plot
background, and the three the dashboard legends toggle are a purple, a blue and a cyan. The other
half is wrong —
`VisitorsChartLegend.tsx` and `RevenueChartLegend.tsx` paint an 8px DOM swatch in the same token,
and a legend swatch that keys a label to a series is closer to "a graphical object needed to
understand content" than a canvas fill is.

What keeps it accepted is that the swatch is not the only thing carrying the association:

- The swatch sits **inside** the same `ButtonBase` as a `text.secondary` label naming the source
  (9.05:1 dark, 7.53:1 light), so the legend entry is identified by its text, not by its colour.
- Selecting a series is a **click on that labelled button**, not an act of matching colours. The
  colour reinforces the selection; the label performs it.
- De-selection is signalled by `mutedSeriesColors`, index-aligned with `seriesColors`. What a user
  reads is the *change* between the two states, not either one's absolute ratio against the card —
  and F8 exists precisely because that relationship had inverted in light, where the muted bar was
  more prominent than the active one.

**What this does not settle, and a human should decide.** Dark `secondary.lighter` is `#0E43FB` — a
deep, fully saturated blue at hue 226° on a `#0B1739` card whose own hue is 224°. Same hue family,
low lightness separation: 2.69:1 is a number that describes something genuinely hard to pick out at
8px, and "no threshold applies" is not the same as "it reads well". **Light is worse, at 2.21:1**,
and `secondary.light` in light is worse still at 2.04:1, which the old exclusion never surfaced
because it never measured them. If these are ever revisited, revisit all three together and in both
schemes rather than the one dark value that prompted the question.

**Not changed here.** Moving any of them is a token value change — a **minor** bump under
[versioning.md](./versioning.md), a repaint of the dashboard charts in the scheme that is the
DashdarkX identity, and therefore a product decision rather than an audit one. Recorded for a human
in `docs/open-questions.md` (Web stack → the WCAG AA item) and in `docs/prds/layer-web-spa.md`
(Pending decisions) instead.

### Found in the dark scheme

F1 started as a dark-only failure and became a both-schemes failure when F5 landed. It is kept here
rather than renumbered, so the IDs in this document stay stable — as is the "dark scheme" grouping
itself, which records where each failure was *found*, not where its fix ended up landing.

#### F1 — Destructive confirm Button (B05), was 3.04:1 dark / 2.98:1 light — **applied**

`ConfirmDialog` with `destructive` renders `<Button color="error" variant="contained">`, and the
`MuiButton` root override sets `color: palette.text.primary` — one flat label over whatever
`error.main` is in that scheme.

**Both schemes now fail, in opposite directions:** dark puts white on `#FF5A65` (3.04:1), light puts
`#171923` on the new `#B03C44` (2.98:1). Light passed at 5.75:1 before F5, and that regression is
structural rather than a bad choice of value. `error.main` has to be dark enough to read *as* text on
white (S09) and light enough to carry a near-black label (B05), and those requirements exclude each
other: the first caps its relative luminance at 0.1833, the second demands at least 0.2199. No single
`error.main` satisfies both, so the label is what has to move.

**Applied.** `containedError` now sets its own label per scheme instead of inheriting
`text.primary`. Dark takes `grey[900]` (`#171923`, the one grey step that is identical in both
schemes, so it needs no cross-scheme reference) at **5.75:1** on `#FF5A65`; light takes
`common.white` at **5.87:1** on `#B03C44`. `theme.applyStyles()` supplies the dark branch. The slot
override outranks the `MuiButton` root's `color: text.primary` because MUI emits the variant slots
after the root, and the disabled rule keeps winning over both on specificity — a disabled
destructive button still greys out as before. Change is in
`frontend/app/src/theme/components/button/Button.tsx`. **No token bump** — no token value moved.

This one mattered most: it is the confirm button on a destructive action, so the label is exactly
the text a user must read before committing. F5 shipped ahead of it, which left light mode regressed
in between. Both schemes are now pinned by a spec that measures the rendered pairing.

#### F2 — Selected pagination digit (B06), was 2.70:1 in both schemes — **applied**

`MuiPaginationItem` sets `color: palette.neutral.light` on the root and only swaps the background on
`.Mui-selected`, so `#D1DBF9` lands on `#CB3CFF`.

**Applied.** `&.Mui-selected` now sets `color: grey[900]` — `#171923`, **4.69:1**. Pure black would
give 5.63:1 but is not a token the palette exposes; `grey[900]` holds the same value in both schemes,
which is what this pairing needs, since the selected background is the brand purple in both. Change
is in `frontend/app/src/theme/components/pagination/PaginationItem.tsx`. **No token bump.**

#### F3 — Input border against its surface (N04, N05), was 1.58:1 and 1.69:1 — **applied**

`MuiInputBase` draws a 1px border in `neutral.darker` (`#343B4F`) on `background.paper`. This is the
one boundary case that is squarely inside SC 1.4.11: the border is the only thing identifying where
a text field is, and a form control's boundary is the canonical example the specification gives.

The original proposal was a new `border.strong` token — `#646B80` in dark (3.31:1 on paper, 3.55:1
on the page) and today's `#343B4F` carried forward in light. That is still the *tidiest* answer, but
it costs a minor bump, and this pass was scoped to changes that cost none.

**Applied without the token.** `neutral.dark` is already mapped, already scheme-aware, and is the
only step in the dark palette between `neutral.darker` and `text.secondary`: `#7E89AC`, which
measures **5.07:1** on `background.paper` and **5.44:1** on the `colorSecondary` backdrop. That
overshoots the 3:1 floor by more than `#646B80` would, so the dark input border reads as a slightly
heavier slate than a bespoke token would have given. That is the visible cost of avoiding the bump,
and it is confined to one component in one scheme.

Light is untouched — `theme.applyStyles('dark', …)` scopes the swap, so light keeps `neutral.darker`
at 11.14:1 exactly as before. Raising `neutral.darker` itself was never an option: it is also the
Tooltip and SnackbarContent plate and the Divider colour, so moving it would relight four unrelated
components. Splitting the border off it is what created N16 below.

The documentation drift the original note flagged still stands: [tokens.md](./tokens.md) says
`border.default` is the border token, but `InputBase` has never used it and now uses `neutral.dark`.
Introducing `border.strong` would resolve both at once and remains the right move whenever the next
minor bump happens.

#### F4 — Inactive sidebar navigation (V01), was 1.93:1 dark / 1.60:1 light — **applied**

`ListItem` dimmed the entire nav button with `opacity: 0.3`. Every non-current destination in the
primary navigation was below 2:1 in both schemes — the worst *text* result in the audit, on the
control users need most.

It was a **double** defect, and the second half only became visible once the focus ring landed.
`opacity` composites the element's outline along with its text, so the ring on an inactive nav item
was drawn at 30% too: `primary.main` at 0.3 over `background.default` resolves to `#431D69` in dark,
**1.45:1**, against the 3:1 that SC 1.4.11 asks of a focus indicator. The keyboard fix was being
undone on the first control a keyboard user reaches.

**Applied.** The dimming is gone and the state is carried by colour. Inactive items keep the themed
`text.secondary` at full opacity — **9.71:1** dark, **7.18:1** light. Opacity could not have rescued
this: even at 0.7 the light scheme only reaches 3.50:1, and no value below 1 clears 4.5:1 there.

Removing the dimming removed the *only* thing separating the two states for every item except the
dashboard root, which alone was tinted purple. Active items are therefore promoted to `text.primary`
— **18.83:1** dark, **16.70:1** light — which is a stronger separation than the dimming gave and is
what moved V02. `aria-current="page"` was already present and carries the same state for assistive
technology, so the state is not signalled by colour alone.

Change is in `frontend/app/src/layouts/main-layout/sidebar/list-items/ListItem.tsx`.
**No token bump.** Pinned by specs in `ListItem.test.tsx`, including one asserting the button
computes to full opacity, so the focus ring cannot be dimmed back down.

### Found in the light scheme

#### F5 — Semantic colours as text (S01–S10), was 1.56:1 to 3.04:1 — **applied in 1.1.0**

Ten of the seventeen light failures were one root cause: `success.main`, `warning.main`, `error.main`
and `info.main` held the same hex in both schemes. A colour picked to sit on `#0B1739` cannot also sit
on `#FFFFFF`.

`colors.json` is **already split per scheme**, so this was a value change in the `light` block only —
`dark` is untouched and the DashdarkX identity is unaffected. Each new value is the dark one with its
hue and saturation held and its lightness dropped, so light still reads as the same product rather
than a second brand. Each was measured against all three backdrops the token actually meets in light
mode (the tint over `background.paper`, the tint over `background.default`, and bare
`background.paper`):

| Token (light only) | Was | Now | Hue held | Worst measured ratio | Was |
|--------------------|-----|-----|----------|----------------------|-----|
| `success.main` | `#14CA74` | `#0B7A45` | 151.6° → 151.4° | 4.59:1 (S05) | 1.83:1 |
| `warning.main` | `#FDB52A` | `#8A6316` | 39.5° → 39.8° | 4.77:1 (S06) | 1.56:1 |
| `error.main` | `#FF5A65` | `#B03C44` | 356.0° → 355.9° | 4.75:1 (S07) | 2.47:1 |
| `info.main` | `#00C2FF` | `#006F93` | 194.4° → 194.7° | 4.83:1 (S08) | 1.75:1 |

All ten pairings now pass at 4.5:1 — see S01–S10 above. **Minor bump**, shipped as **1.1.0**: four
rendered values moved, and the versioning policy never allows a rendered value to travel as a patch.

Two consequences are worth stating rather than leaving to be rediscovered:

- **`error.main` is also a background**, on the contained error Button. Making it readable as text on
  white necessarily makes it too dark for a near-black label, so B05 dropped from 5.75:1 to 2.98:1.
  That is unavoidable at the token level; F1 carries the arithmetic and has since closed it, in both
  schemes, by moving the label rather than the token.
- **The `transparent.*` tints were deliberately left alone.** They are pale enough already, and
  darkening the foreground is what closes the gap — leaving them also keeps every backdrop in the
  tables above unchanged, so these ratios are directly comparable to the pre-fix ones. The cost is
  that the light tints now drift from their semantic value the way the dark ones already do:
  `transparent.success` is built from `#14CA74` while `success.main` is `#0B7A45`. Re-deriving each
  tint from its token would be a separate minor bump and would visibly grey the tints (`#DBEBE3`
  rather than `#DCF7EA` over a card), so it is tracked as a follow-up instead of being folded in here.

The same drift exists in dark and is still worth cleaning up: `transparent.success` is `#05C16833`
while `success.main` is `#14CA74`, and `transparent.warning` is `#FFB01633` while `warning.main` is
`#FDB52A`. The dark results pass regardless, but a tint should be derived from its semantic value
rather than drifting from it.

#### F6 — Tooltip and Snackbar label (T09), was 1.57:1 — **applied**

`MuiTooltip` and `MuiSnackbarContent` both hardcoded `backgroundColor: neutral.darker` with
`color: text.primary`. `neutral.darker` is `#343B4F` in *both* schemes, so in light mode a
near-black label sat on a dark slate plate. Tooltips are rendered today by `ThemeToggle`,
`LanguageSelect`, `ProfileMenu` and the topbar notification button — this is live, and it is
effectively unreadable.

**Applied.** These two surfaces are intentionally inverted, so the label has to be light in both
schemes rather than following `text.primary`. `common.white` gives **11.14:1**. `neutral.lighter`
(`#D9E1FA`) was the alternative at 8.54:1, but it would have moved dark down from 11.14:1 for no
reason — white leaves dark rendering exactly as it did and fixes light outright. Change is in
`theme/components/data-display/Tooltip.tsx` and `theme/components/feedback/SnackbarContent.tsx`.
**No token bump.**

#### F7 — Unselected pagination digit (T10), was 1.38:1 — **applied**

`MuiPaginationItem` uses `neutral.light` (`#D1DBF9`, identical in both schemes) for the digit. On a
white card it is nearly invisible.

**Applied.** `text.secondary` gives **7.53:1** in light and **9.05:1** in dark and is the correct
semantic token for de-emphasised text. Dark steps down from 12.72:1 as a result; that is a
deliberate trade of headroom in the scheme that had plenty for a scheme that had none, and 9.05:1 is
still double the threshold. Change is in `theme/components/pagination/PaginationItem.tsx`.
**No token bump.**

#### F8 — DataGrid editing row (T11), was 1.20:1 — **applied in 1.2.0**

Light `secondary.darker` was `#082366`, a near-black navy carried over from the dark palette, and
`MuiDataGrid` paints the editing row with it while cells stay `text.primary`.

This was the only failure in the document that an override could not express. The fill and the cell
text must move apart, and unlike F1 the fill was not something the theme could re-point at a
different existing token: nothing else in the light palette is both a light tint and semantically
"the row being edited". So it needed a token value, a version bump and a product decision rather
than a theme edit. The override pass stopped here and reported it; **the product owner approved the
value change on 2026-08-04** and it ships as tokens **1.2.0**.

**Applied.** `light.secondary.darker` is `#E4EBFF` — cell text **14.69:1**. **Minor bump**: one
rendered value changes, light only, `dark` byte-identical.

The value is *not* the `#DDE6FF` this section originally proposed, and the reason is worth recording
because the proposal was measured against one pairing when the row carries five. `primary.main`
(`#CB3CFF`) is painted twice on the editing row — as the focus ring `DataGrid.tsx` draws inset on
`.MuiDataGrid-cell:focus-within`, and as the Save action glyph in `OrdersStatusTable` — and both are
governed by 3:1. `#DDE6FF` puts them at **2.99:1**, so it would have closed T11 and opened two
shortfalls of the kind [Visible focus](#visible-focus-sc-247-1411) says the ring clears everywhere.

The candidate band is squeezed from both sides: `text.primary` needs 4.5:1 from above and
`primary.main` 3:1 from below. `#E4EBFF` is the nearest point to the proposal that satisfies both
with margin, and holds the proposal's hue (224.1° → 224.4°) so the row still reads as the same blue
highlight. Three further light pairings on this row were below threshold and are fixed as a
consequence — none had been measured, because the inventory treated the editing row as one pairing:

| Pairing on the editing row (light) | Was | Now | Min |
|---|---|---|---|
| `primary.main` focus ring and Save glyph | 3.90:1 | 3.13:1 | 3:1 |
| `neutral.darker` edit-input border | 1.31:1 | **9.35:1** | 3:1 |
| `text.secondary` client e-mail and Cancel glyph | 1.93:1 | **6.32:1** | 4.5:1 |
| `neutral.dark` row checkbox stroke | 1.93:1 | **6.32:1** | 3:1 |

**The DataGrid is not the only consumer.**
`components/sections/dashboard/website-visitors/VisitorsChartLegends.tsx` paints the *dimmed* Social
polar bar in `secondary.darker` when another legend entry is selected — a second usage this document
had not recorded, found the same way N15 was: by sweeping `components/sections/**` rather than only
`theme/components/**`. It is not regressed. The dimmed bar goes from 14.56:1 to **1.19:1** against
its `Paper`, which is the point: at `#082366` the *dimmed* bar out-shouted the *active* one
(`secondary.lighter`, 2.21:1), so de-selecting a series made it more prominent. It now recedes, as
dark already did (dimmed 1.21:1 against an active 2.69:1). Chart series colours are outside this
inventory — see [Which pairings are real](#which-pairings-are-real) — so no threshold applies to
either bar in either scheme.

`light.info.darker` holds the same `#082366` and was left alone: it is a legacy alias
([tokens.md](./tokens.md) → *Legacy map*) that no component in `frontend/app` reads.

#### F9 — Active sidebar item in light (S11), was 3.56:1 — **applied**

The dashboard root nav item renders its label in `primary.main`. Brand purple on a near-white
backdrop is 3.56:1.

**Applied, scoped to light.** The label is `text.primary` (**16.70:1**) and the purple stays on the
**icon**, which is a graphical object governed by the 3:1 threshold and passes at 3.56:1 — the
accent survives exactly where the identity wants it while the text becomes readable.

The proposal did not say which schemes to change, and the answer is light only. Dark's purple label
already measured 5.05:1 and is comfortably AA, so repainting it would have changed the default
scheme's appearance for no accessibility gain. `theme.applyStyles('dark', …)` keeps it. Change is in
`layouts/main-layout/sidebar/list-items/ListItem.tsx` — **no token bump**, and no darkening of the
brand purple.

#### F10 — Scrollbar thumb in light, was 1.85:1 / 1.94:1 — **applied**

`theme/styles/scrollbar.ts` and `theme/styles/simplebar.ts` paint the thumb in `grey[300]`
(`#AEB9E1`), which is the same value in both schemes. A custom scrollbar is a UI component and the
thumb is the part a pointer user has to locate, so 1.4.11's 3:1 applies. See
[Which pairings are real](#which-pairings-are-real) for the measurements.

The proposal was `text.disabled` — `#7E89AC` in light (**3.31:1** on `background.default`) but
`#4A5568` in dark, which would have dropped dark from 9.71:1 to 2.50:1, so it needed
`theme.applyStyles()` to avoid breaking the scheme that was already fine.

**Applied, and it needed no per-scheme branch after all.** `neutral.main` resolves to `#AEB9E1` in
dark — the same value `grey[300]` was already painting, so nothing there moves — and `#7E89AC` in
light, which is the value the proposal wanted. One token reference covers both:

| | Dark | Light |
|---|------|-------|
| on `background.default` | 9.71:1 (was 9.71:1) | **3.31:1** (was 1.85:1) |
| on `background.paper` | 9.05:1 (was 9.05:1) | **3.46:1** (was 1.94:1) |

Change is in `theme/styles/scrollbar.ts` and `theme/styles/simplebar.ts`. **No token bump.**

### Found during the override pass

Two pairings that the original sweep did not report. One was a gap in the inventory; the other is a
consequence of F3.

#### N15 — KPI card overflow control, was 1.38:1 light — **applied**

`components/sections/dashboard/kpi/KPI.tsx` paints the card's overflow-menu `IconButton` in
`neutral.light`. That is `#D1DBF9` in both schemes, so it reads at 12.72:1 on a dark card and
**1.38:1** on a white one — the glyph is the only thing identifying the control, so SC 1.4.11's 3:1
applies and light missed it by more than half.

This pairing was **not** in the original 45. The sweep covered `theme/components/**`, the pattern
components and the layout shell, and this one lives in a dashboard section component — a category
the sweep did not walk. It is worth recording *why* it was missed rather than just adding the row:
any component that hardcodes a palette reference in `sx` can reintroduce exactly this, and the
inventory only catches it if the sweep includes `components/sections/**`.

**Fix:** `text.secondary` — **7.53:1** light, **9.05:1** dark. Same reasoning as F7, and the same
root cause as F6, F7 and F10: an override naming a token that holds one value for two very different
surfaces. **No token bump.** Pinned by `KPI.test.tsx` in both schemes.

#### F11 — Divider and Switch track (N16), 1.58:1 dark — **open, latent**

F3 moved the InputBase border off `neutral.darker`, which leaves two other components still using it
as a boundary against `background.paper`: `MuiDivider` and the off state of `MuiSwitch`'s track. The
row that used to cover all three (N04) now covers only the input, so the remainder is measured
separately as N16. Light passes at 11.14:1; dark is **1.58:1**.

Neither is blocking today, for different reasons:

- **The Divider** is decoration and is waived on the same basis as W2 — a divider separates content
  visually and removing it loses no information.
- **The Switch track** is not decoration. The track boundary is what tells a sighted user where the
  control is and which way it is thrown, so 1.4.11's 3:1 genuinely applies. It is latent only
  because **no screen composes a Switch**; the override is registered and nothing mounts it.

**Fix when a Switch ships:** the same treatment F3 used — `neutral.dark` in dark via
`theme.applyStyles()`, giving 5.07:1 — or `border.strong` if that token has been added by then. Not
applied now, because changing the track colour of a component nothing renders would be an
unverifiable change to the default scheme's appearance. **No token bump either way.**

### Found in the picker pass

#### F12 — Selected month and year in the date-picker popper (B07), was 3.73:1 in both schemes — **applied**

`MuiMonthCalendar` and `MuiYearCalendar` paint `.Mui-selected` with `primary.main` and let the label
fall through to MUI's derived `primary.contrastText`, which resolves to white on `#CB3CFF`. The
month abbreviation and the four-digit year are text at `body2`-ish size, so **4.5:1 applies** and
white misses it at 3.73:1 — the same theoretical ceiling W3 accepts on the gradient button, except
that here the fill is a flat colour rather than a sweep, so nothing forces the label to be white.

**This is a failure the audit had excluded, not a new one.** The exclusion read "no date picker is
mounted anywhere in the SPA", and it was true when written. `components/common/DateSelect.tsx` then
shipped in `revenue-by-customer/RevenueByCustomer.tsx` and `completed-task/CompletedTask.tsx`, and
the premise silently expired: opening either picker reaches the pairing in two clicks. Between the
third re-measurement and this one, the headline claim of no blocking AA failure was therefore
wrong in both schemes.

**Applied.** `.Mui-selected` now sets `color: grey[900]` — `#171923`, **4.69:1** — which is F2's fix
for the identical pairing on the selected pagination digit, arrived at for the identical reason:
`primary.main` and `grey[900]` both hold one value across the two schemes, so one label serves both
and no `theme.applyStyles()` branch is needed. Pure black would give 5.63:1 and is not a token the
palette exposes. Change is in `theme/components/date-picker/MonthCalendar.tsx` and
`YearCalendar.tsx`. **No token bump** — this is an override naming a different token, which is why
`packages/design-tokens` stays at 1.2.0.

Two things this fix does *not* cover, both deliberate:

- **The selected day.** `DateSelect` opens `views={['month', 'year']}`, so the day grid never
  renders and there is no `MuiPickersDay` override to carry the same label. It stays in the
  exclusion table as genuinely latent — with the fix named, so the next person does not re-derive
  it.
- **The `Mui-disabled` selected state.** MUI greys a disabled selected button through a rule this
  override outranks on specificity, the same way F1's `containedError` slot outranks the
  `MuiButton` root. No picker in the SPA disables a value today; if one does, the disabled rule
  needs its own entry rather than relying on cascade order.

Verified by rendering `DateCalendar` in both schemes through `src/test/renderWithTheme.tsx` and
measuring the resolved label against `primary.main` with `src/test/contrast.ts`. That check is not
committed as a spec — see [Re-running this audit](#re-running-this-audit).

### Summary of changes

| Fix | Scheme | Where | Token bump | Status |
|-----|--------|-------|------------|--------|
| F1 destructive Button label | both | `theme/components/button/Button.tsx` | none | **applied** |
| F2 selected pagination digit | both | `theme/components/pagination/PaginationItem.tsx` | none | **applied** |
| F3 input border | dark | `InputBase.tsx`, via `neutral.dark` | none | **applied** — took the override route, not the proposed `border.strong` token |
| F4 inactive sidebar item | both | `layouts/.../list-items/ListItem.tsx` | none | **applied** |
| F5 semantic colours as text | light | `colors.json` `light` block | **minor** | **applied in 1.1.0** |
| F6 Tooltip / Snackbar label | both | `Tooltip.tsx`, `SnackbarContent.tsx` | none | **applied** |
| F7 unselected pagination digit | both | `PaginationItem.tsx` | none | **applied** |
| F8 DataGrid editing row | light | `colors.json` `light.secondary.darker` | **minor** | **applied in 1.2.0** — shipped `#E4EBFF`, not the proposed `#DDE6FF` |
| F9 active sidebar item | light | `layouts/.../list-items/ListItem.tsx` | none | **applied** |
| F10 scrollbar thumb | light | `theme/styles/scrollbar.ts`, `simplebar.ts` | none | **applied** |
| F11 Divider / Switch track | dark | `Switch.tsx` | none | open — latent, no screen composes a Switch |
| F12 selected month / year label | both | `theme/components/date-picker/MonthCalendar.tsx`, `YearCalendar.tsx` | none | **applied** |
| N15 KPI overflow glyph | light | `components/sections/dashboard/kpi/KPI.tsx` | none | **applied** |
| W3 white gradient label | both | `theme/components/button/Button.tsx` | none | **applied** — the waiver's own precondition |

Eleven of the thirteen fixes needed no token change. F3 was expected to need one and did not:
`neutral.dark` turned out to be a usable stand-in for the proposed `border.strong`, at the cost of a
heavier border than a bespoke value would have given. **F8 is the only one that genuinely required a
token to move**, and with F12 applied alongside it no blocking failure is left.

The DashdarkX dark palette has still not been touched by any fix in this document, and the override
pass went further: every fix that would otherwise have repainted dark for a light-only problem — F3,
F9, F10 — is scoped so dark renders byte-identically.

## Beyond colour

The PRD names three more parts of the baseline. The audit below is a code read of
`frontend/app/src`, not a runtime assistive-technology test; treat it as the list to verify with a
keyboard and a screen reader, not as a clean bill of health. Items marked **landed** were re-read
against `frontend/app/src` on 2026-08-04 and are recorded rather than deleted, because knowing what
was wrong is what stops it coming back.

### Visible focus (SC 2.4.7, 1.4.11) — landed

`theme/styles/focusRing.ts` now defines the single focus treatment for the SPA: a 2px outline in
`primary.main` at a 2px offset, applied through `*:focus-visible` in the `MuiCssBaseline` override
and — with a negative offset, because cells sit flush against their neighbours — in place of the
`outline: 'none !important'` the DataGrid used to set on `.MuiDataGrid-cell:focus-within` and
`.MuiDataGrid-columnHeader:focus-within`. That last one was the serious defect: the DataGrid is a
roving-tabindex widget whose entire keyboard model depends on the user seeing which cell holds focus.

`primary.main` works as a single value for both schemes and needs no new token. Measured against all
eight surfaces the ring can land on it ranges from **3.13:1** (light `secondary.darker`, the DataGrid
editing row) to **5.05:1** (dark `background.default`), clearing the 3:1 non-text threshold
everywhere. The editing row is the floor and is what constrained the value F8 could choose; before
F8 the floor was 3.41:1 on light `surface.alt`. The comment in `theme/styles/focusRing.ts` quotes
the same 3.13:1–5.05:1 range, so the code and this document cannot drift apart unremarked — it
carried the stale pre-F8 figure until 2026-08-04.

One caveat worth keeping in view, because it is how this fix was quietly undone once already: an
ancestor's `opacity` composites the outline along with everything else, so any element dimmed below
1 dims its own focus ring by the same factor. That is what F4 found on the sidebar, where the ring
resolved to 1.45:1. `ListItem.test.tsx` now asserts the nav button computes to full opacity; the
same trap applies anywhere else `opacity` is reached for as a de-emphasis device, and
`Switch.tsx`'s `.Mui-disabled` track at 0.3 is the one remaining instance (harmless — a disabled
control is not focusable).

### Keyboard reachability (SC 2.1.1, 2.4.1, 2.4.3)

- Interactive elements use `ButtonBase` descendants or real anchors throughout, so nothing is a
  click-handler on a `div`. Sidebar entries render as `<a href>` via `ListItemButton component={Link}`
  and are reachable.
- **Skip link — landed.** `MainLayout` renders the 300px sidebar before `<main>`, so a keyboard user
  used to traverse the whole navigation list on every page load. A "Skip to main content" link is
  now the first focusable element.
- **Nested unlabelled `nav` landmarks — still open.** `sidebar/index.tsx` wraps the drawer in
  `<Box component="nav">` and `DrawerItems` renders `<List component="nav">` inside it. Two
  navigation landmarks with no `aria-label` are ambiguous in a landmark list; label them or drop the
  inner one.
- **Duplicate DOM id — landed.** Both `ProfileMenu` and `LanguageSelect` mounted their `Menu` with
  `id="account-menu"`, which breaks the `aria-controls` reference. They now use `profile-menu` and
  `language-menu`.

### ARIA and labelling (SC 1.3.1, 3.3.2, 4.1.2)

- **Search input accessible names — landed.** `SearchField` and the sidebar search in `DrawerItems`
  were `TextField`s with only a `placeholder`, which is not exposed as the accessible name in every
  combination and disappears once the user types. Both now set `aria-label`.
- **`ProfileMenu`'s ARIA attributes — landed.** `aria-controls`, `aria-expanded` and `aria-haspopup`
  were on the inner `<Stack>` (a `div`) rather than the `ButtonBase` that owns the click handler, so
  the button never announced that it opens a menu. They are on the `ButtonBase` now.
- **The active nav item — landed.** `ListItem` conveyed the current page through `opacity` and a
  `primary.main` tint with no `aria-current="page"` — SC 1.4.1 (use of colour) as well as a missing
  state for screen-reader users. `aria-current` is set, and F4 has since replaced the opacity with a
  colour promotion, so the visual signal is a genuine `text.primary` / `text.secondary` step rather
  than a dimming.
- **`EmptyState`'s `∅` glyph — landed.** It sat in a `Typography` and was announced; it is
  `aria-hidden` now.
- **Icon-only buttons are mostly covered.** `IconifyIcon` renders through `@iconify/react`, which
  marks its `<svg>` `aria-hidden`, and the topbar's icon buttons take their accessible name from a
  wrapping `Tooltip` or an explicit `aria-label`. This is the one area that reads clean.
- **Hardcoded user-facing strings — landed.** `ThemeToggle` (its two tooltips), `ErrorBanner`
  ("Retry"), `ConfirmDialog` ("Confirm" / "Cancel"), `SearchField` ("Search for…" and its
  `aria-label`), `DataTable` (the footer row range) and `EmptyState` (the decorative glyph) all
  used to bake the literal in. Every one is now a prop with an English default — inventory in
  [components.md](./components.md) → Strings. This is an accessibility fix as much as an i18n one:
  several of these strings *are* accessible names, so a pt-BR screen-reader user used to hear
  English with no way for a call site to change it. What remains open is the **choice of i18n
  library** (`docs/open-questions.md` → Web stack), which decides where the pt-BR values come from,
  not whether the props exist.

## Re-running this audit

Re-measure whenever a colour token changes, a theme override introduces a new foreground/background
pair, or a new pattern component composes tokens in a way the tables above do not list. Update the
tables and the failure list in the same pull request as the token change, as
[versioning.md](./versioning.md) requires.

Three things the last two passes learned about doing this well:

- **Sweep `components/sections/**` too, not only `theme/components/**`.** N15 was missed for exactly
  that reason: a section component hardcoded a palette reference in `sx`, which no amount of reading
  the theme would have surfaced.
- **Re-run the whole table, not the rows you expect to move.** V02 changed as a side effect of F4 in
  both schemes, and nothing in the F4 proposal predicted it.
- **Re-check the exclusions, not only the pairings.** Every row in
  [Which pairings are real](#which-pairings-are-real) is a claim about what the SPA composes today,
  and a claim goes stale the same way a ratio does — B07 sat excluded as "no date picker is mounted"
  for as long as it took someone to mount one. An exclusion that rests on absence needs re-reading
  against `src/` on every pass, and it should name the fix it is deferring so that re-reading it is
  cheap.

Six fixes are pinned by specs (F1, F2, F4, F6, F7 and N15, plus W3's white label). F3 and F12 are
not: F3 because jsdom cannot resolve a CSS variable inside a `border-color`, F12 because pinning it
means mounting a `DateCalendar` per scheme, which is a heavier spec than the one-line override it
guards. Both were verified by measurement at the time they landed, and both are cheap to promote to
a spec — `src/test/contrast.ts` already does the arithmetic.

A fix that lands in `frontend/app/src/theme/` or a component is cheaper than a token change, but it
is not free of consequence: it makes the pairing scheme-dependent, which means both schemes have to
be measured every time, and it puts the value somewhere [tokens.md](./tokens.md) does not describe.
Where a fix is scoped with `theme.applyStyles()`, say so in the row, or the next reader will assume
one value covers both schemes.
