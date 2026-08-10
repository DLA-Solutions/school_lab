# Theming

## Stack

- MUI v7 `colorSchemes` with `cssVariables.colorSchemeSelector: 'class'`
- Factory: `frontend/app/src/theme/createAppTheme.ts`
- Default mode: **dark** (matches legacy DashdarkX template)

## Bootstrap

```tsx
<ThemeProvider theme={createAppTheme()} defaultMode="dark">
  <CssBaseline enableColorScheme />
  <ThemeModeProvider>{app}</ThemeModeProvider>
</ThemeProvider>
```

## Toggle and persistence

- Component: `ThemeToggle` in the topbar
- Hook: `useColorScheme()` from MUI
- Storage key: `school-lab-color-mode` (`light` | `dark` only)
- Flash prevention: inline script in `index.html` sets `class` + `data-mui-color-scheme` before React paint

## Custom theme keys

| Key | Purpose |
|-----|---------|
| `palette.surface.alt` | Secondary surfaces (row stripes, hovers) |
| `palette.transparent.*` | Semantic chip backgrounds |
| `theme.customShadows` | Per-scheme shadow array |

## Layout contract

`breakpoints` and `zIndex` are declared explicitly, in `theme/breakpoints.ts` and `theme/zIndex.ts`, even though the values equal the MUI v7 defaults. They are a documented contract rather than an inherited default, so a MUI upgrade that changed them would show up as a diff.

| Key | Values |
|-----|--------|
| `breakpoints.values` | `xs: 0`, `sm: 600`, `md: 900`, `lg: 1200`, `xl: 1536` |
| `zIndex` | `mobileStepper: 1000`, `fab`/`speedDial: 1050`, `appBar: 1100`, `drawer: 1200`, `modal: 1300`, `snackbar: 1400`, `tooltip: 1500` |

Read layers through `theme.zIndex.*` and breakpoints through responsive `sx` values or `theme.breakpoints.up/down/between` — never a literal. Full guidance: catalog → Layout.

## Component overrides (cssVariables-safe)

All `theme/components/**` overrides read palette values via `(theme.vars || theme).palette` (not `theme.palette` directly), so they resolve correctly whether `theme.vars` is generated (`cssVariables` mode) or not. When light/dark need different literal values (e.g. shadows), use `theme.applyStyles('light', {...})` — see `shadowSx()` in `theme/shadows.ts`. For a translucent colour use `theme.alpha(color, value)` rather than a literal `rgba()`: under `cssVariables` it rewrites the colour to its channel variable, so the result still follows the active scheme (`theme/components/feedback/Backdrop.tsx`). Only palette keys MUI generates a channel token for work this way — `background.default`, `background.paper`, `text.primary`, `text.secondary`, `divider` and the `main`/`light`/`dark` of each colour — not the `grey` shades.

The **64** registered overrides, by category (`theme/components/`):

| Category | Count | Components |
|----------|-------|------------|
| `button/` | 4 | Button, ButtonBase, IconButton, Toolbar |
| `input/` | 15 | TextField, OutlinedInput, FilledInput, InputBase, InputAdornment, Checkbox, Radio, Switch, Autocomplete, FormControl, FormControlLabel, FormHelperText, FormLabel, InputLabel, Select |
| `layout/` | 2 | Stack, Container |
| `surface/` | 2 | Paper, Popover |
| `navigation/` | 9 | Drawer, Link, Menu, Tabs, Tab, Breadcrumbs, Stepper, StepLabel, StepConnector |
| `data-display/` | 6 | Typography, Divider, Chip, Tooltip, Avatar, Badge |
| `feedback/` | 12 | Alert, Backdrop, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress, LinearProgress, Snackbar, SnackbarContent, Skeleton |
| `list/` | 6 | List, ListItemButton, ListItemIcon, ListItemText, MenuItem, Collapse |
| `data-grid/`, `date-picker/`, `pagination/` | 7 | DataGrid, MonthCalendar, YearCalendar, PickersOutlinedInput, PickersSectionList, Pagination, PaginationItem |
| `utils/` | 1 | CssBaseline |

All are registered in `createAppTheme.ts`'s `componentOverrides` map; this table must match that map.

Six of them change behaviour, not just appearance:

- **`MuiStack`** defaults to `direction: 'row'` (MUI defaults to `column`) and `useFlexGap: true`. A bare `<Stack>` is horizontal in this codebase — vertical layouts must pass `direction="column"`.
- **`MuiCssBaseline`** is the only global-style surface: an all-element margin/padding reset, smooth scrolling, ligatures off, the themed scrollbar, and the simplebar and ECharts baselines. Do not add a global stylesheet.
- **`MuiFormControl`** defaults to `variant: 'filled'`. `InputBase` paints the field's own border, so the outlined variant's notched fieldset would draw a second one around it. `TextField` passes `variant` down explicitly, so this default only reaches standalone `FormControl` usage.
- **`MuiInputLabel`** defaults to `shrink: true` and is pinned above the field (`position: static`, no transform). The `FilledInput` / `OutlinedInput` overrides zero the inner padding MUI reserves for a floating label, so an animated label would sit on top of the value. Labels never float in this design system.
- **`MuiTypography`** maps `subtitle1` and `subtitle2` to `p`. MUI maps both to `h6`, which put a heading in the accessibility tree for every EmptyState title, KPI label and DataGrid cell subtitle. Other variants keep MUI's element, and `component` still wins at the call site.
- **`MuiSnackbar`** anchors bottom-right, because MUI's bottom-left lands on the 300px sidebar, and sets `autoHideDuration: 6000` where MUI leaves it `null`. A snackbar that must persist passes `autoHideDuration={null}` and offers a close control.

Two more are scoped so that they do not reach a surface another override already owns, and the guard is load-bearing:

- **`MuiPopover`** styles its `paper` slot behind `&:not(.MuiMenu-paper)`. Menu composes Popover, so without the guard the override would re-decide every Menu, Select and ProfileMenu surface.
- **`MuiBackdrop`** paints behind `&:not(.MuiBackdrop-invisible)`. Menu, Select and Popover mount a backdrop only to catch the outside click; a `styleOverrides` rule is serialised after MUI's `invisible` class, so an unguarded root would drop a scrim behind every open dropdown.

Field label typography and its error/disabled colours live in **`MuiFormLabel`**, which `InputLabel` composes — change one place, not two.

## Primitives with no override

Not every primitive the SPA imports needs one. These are decisions, not gaps:

| Primitive | Why there is no override |
|-----------|--------------------------|
| `Box` | A styled `div` with no appearance of its own. Everything visible about a Box comes from the `sx` at the call site. |
| `Grid` | Inherits the theme's spacing and breakpoints, which is the whole of its behaviour. Catalog → Layout → Grid. |
| `SvgIcon` | Sizing and colour come from the consumer (`fontSize`, `currentColor`). Product icons come from Iconify; `SvgIcon` only wraps the three checkbox glyphs. |
| `DatePicker` | MUI X gives a picker no `styleOverrides` key at all. It is themed on its parts — see [Date pickers](#date-pickers). |

`Card*` and `Table*` are a different case: they are **forbidden by default** and deliberately carry no override (decided, `docs/open-questions.md` → Web stack).

| Instead of | Use | Which gives you |
|------------|-----|-----------------|
| `Card`, `CardHeader`, `CardContent`, `CardActions` | `SectionCard` | The themed `Paper`, the section title and the header-actions slot, already spaced |
| `Table`, `TableHead`, `TableRow`, `TableCell` | `DataTable` | The `MuiDataGrid` override, the shared footer and the server-pagination contract |

The ban formalises what the codebase already does — neither primitive is imported anywhere in `frontend/app` — and keeps one sanctioned route to each result. An override is not the lighter alternative to a ban; it is the second route, and two routes to the same surface is how the visual language drifts.

Revisit if a screen needs genuinely static, non-paginated tabular content that `DataTable` is the wrong tool for — a printable report, a fixed reference matrix. That reopens the decision in `docs/open-questions.md`; it does not authorise a local import.

## Date pickers

**`MuiDatePicker` carries no `styleOverrides`, and cannot.** MUI X registers the picker itself with `defaultProps` only — a picker is a composition, and each themable part of it has its own theme key. Asking for a `MuiDatePicker.styleOverrides` block is not a gap in this design system; there is nothing for it to style.

The picker is themed on the parts that render instead:

| Key | Styles |
|-----|--------|
| `MuiPickersOutlinedInput` | The field: `surface.alt` background, horizontal padding, the notch removed in the default, hover and focus states, and the calendar button in the end adornment |
| `MuiPickersSectionList` | The `MMM` / `YYYY` sections, as `text.secondary` at `body2` — pairing T06 in [accessibility.md](./accessibility.md) |
| `MuiMonthCalendar`, `MuiYearCalendar` | The selected month and year in the popper: the brand-purple fill, and a `grey[900]` label in place of MUI's derived white — pairing B07 in [accessibility.md](./accessibility.md), 3.73:1 → 4.69:1 |

Two traps are worth knowing before adding to these, because both fail silently:

- **The variant is the last writer.** `MuiPickersOutlinedInput`'s styles are emitted after `MuiPickersInputBase`'s, so a padding or width declared on the shared base is overwritten by the outlined variant. Anything geometric goes on the variant.
- **`sectionContent` is themed from `MuiPickersSectionList`.** `MuiPickersInputBase` puts the same class on that element but resolves its overrides under the key `content` (MUI X carries a `FIXME` about the mismatch), so a `sectionContent` entry written there type-checks and styles nothing.

The field the SPA mounts is the outlined one, which is the picker default. A filled or standard picker field would come out unthemed — add the variant's key when a screen needs one, rather than moving these to the base.

`DateSelect` opens `views={['month', 'year']}`, so the **day** grid never renders and there is no `MuiPickersDay` override. A screen that adds a day view adds that key in the same change, giving `.Mui-selected` the same `grey[900]` label — the selected day inherits exactly the 3.73:1 the month and year had.

## Charts

Use `useChartTheme()` from `design-system/hooks/useChartTheme` for axis, tooltip, and series defaults.

Charts are the one surface `(theme.vars || theme).palette` does not serve: ECharts paints to a canvas from a plain option object, so it can use neither a CSS variable nor a component override. The hook resolves the scheme itself — it reads the reactive `mode` from `useColorScheme()` and takes the colours from `theme.colorSchemes[mode].palette`, which holds real values for both schemes.

That is also why a chart option must not read `theme.palette` directly. Under `cssVariables` that palette is pinned to the default scheme, so the value is silently the wrong one in the other.

**Every colour in a chart option comes from `useChartTheme()`. A colour the shape does not expose is a reason to widen `ChartTheme`, not to resolve the scheme at the call site.** Resolving it locally works exactly once and is indistinguishable from the correct version at a glance: the call site has to repeat the `systemMode ?? mode` rule, default the first render to dark, and keep the resolved value in its `useMemo` dependencies. Get any of the three wrong and the chart is quietly painted in the other scheme — the failure this rule exists to prevent. Keeping the resolution in one place also makes the rule checkable, which is what `no-restricted-syntax` does in `eslint.config.js`: `theme.palette` and `theme.colorSchemes` are both errors under `src/components/**` and `src/layouts/**`. The escape hatch a linter cannot see is destructuring (`const { palette } = useTheme()`); don't.

`ChartTheme` today: `textColor` and `axisColor` (`text.secondary`), `strongTextColor` (`text.primary`, for in-chart text that must read as strongly as body copy), `splitLineColor`, `tooltipBg`, `seriesColors`, and `mutedSeriesColors` — index-aligned with `seriesColors`, for a legend that repaints a series it has deselected rather than hiding it.

Charts are tested by capturing the option object rather than by rendering one: a spec mocks `components/base/ReactEchart`, renders the chart in each scheme through `renderWithTheme`, and asserts the colours against `@school-lab/design-tokens`. See `VisitorsChart.test.tsx`.

## Mobile

React Native imports dark tokens from `@school-lab/design-tokens`. Theme mode toggle on mobile is out of scope for this design system v1.
