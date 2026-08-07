# Pattern components

Import from `design-system` (barrel: `frontend/main/src/design-system/index.ts`).

## Strings

A pattern component owns no word the user reads. Every string it can render is a prop with an
English default, so a screen changes wording by passing it rather than by forking the component.

| Component | String props | Defaults |
|---|---|---|
| `ConfirmDialog` | `confirmLabel`, `cancelLabel` | `'Confirm'`, `'Cancel'` |
| `DataTable` | `rangeLabel` | `'1-25 of 400'` |
| `EmptyState` | `icon` | the `∅` glyph |
| `ErrorBanner` | `retryLabel` | `'Retry'` |
| `SearchField` | `placeholder`, `ariaLabel` | `'Search for...'`, `'Search'` |
| `ThemeToggle` | `switchToLightLabel`, `switchToDarkLabel` | `'Switch to light mode'`, `'Switch to dark mode'` |
| `BrandLogo` | `alt` | `'Scholar Premium'` |

`SearchField`'s `ariaLabel` and `ThemeToggle`'s tooltips are accessible names, not decoration —
they are the only names those controls have. The product locale is pt-BR and the SPA has no i18n
layer yet; these defaults are what the codebase already shipped and say nothing about which
library will eventually supply the translations (`docs/open-questions.md` → Web stack).

## PageHeader

```tsx
<PageHeader title="Orders" subtitle="Optional" actions={<Button>New</Button>} />
```

## SectionCard

```tsx
<SectionCard title="Section" headerActions={...} padding={0}>
  {children}
</SectionCard>
```

`padding` is in theme spacing units (`0` = flush, the default for list/table layouts; `3.5` matches
themed `Paper`). When flush, add `px={3.5}` on body content so it aligns with the card header.

## SearchField

Controlled filled search input with icon. `placeholder` and `ariaLabel` are separate on purpose: a
placeholder disappears once the user types and is not exposed as the accessible name everywhere.

## SemanticChip

```tsx
<SemanticChip variant="success" label="Delivered" width={80} />
```

Variants: `success` | `warning` | `error` | `info`.

## EmptyState

Centered empty list placeholder with optional CTA.

```tsx
<EmptyState title="No orders" description="Create one to start." action={<Button>New</Button>} />
<EmptyState title="No orders" headingLevel={2} />  {/* page-level: announce a heading */}
<EmptyState title="No orders" icon={<IconifyIcon icon="mingcute:inbox-line" />} />
```

The tile holding `icon` is `aria-hidden`, so whatever goes in it is decorative and must not carry
meaning the title leaves out.

The title is a paragraph unless `headingLevel` is given. In the list-page composition the
surrounding `SectionCard` already titles the region; pass a level only when the empty state is the
page body and its title is the only landmark.

## ErrorBanner

```tsx
{error && <ErrorBanner message={error} onRetry={refetch} retryLabel="Try again" />}
```

Wraps MUI `Alert`; severities are themed with `transparent.*` tokens (see `theming.md`). The retry
button has no text of its own, so `retryLabel` is also its accessible name.

## ConfirmDialog

Modal for destructive confirmations. Wraps MUI `Dialog`/`DialogTitle`/`DialogContent`/`DialogContentText`/`DialogActions`, all themed for brand-consistent paper, spacing, and typography.

```tsx
<ConfirmDialog
  open={open}
  title="Delete enrolment?"
  message="The guardian keeps access to past invoices."
  confirmLabel="Delete enrolment"
  onConfirm={remove}
  onCancel={close}
  destructive
/>
```

Name the action in `confirmLabel` — "Delete enrolment" tells the reader what the button does,
"Confirm" only tells them the dialog is a dialog.

## DataTable

MUI X DataGrid wrapper with default footer pagination. Forwards all `DataGridProps`, and adds
`rangeLabel` for the row-range summary in the footer.

```tsx
<DataTable
  rows={rows}
  columns={columns}
  rangeLabel={({ from, to, count }) => `${from}-${to} of ${count} students`}
/>
```

`rangeLabel` covers only the footer summary. The grid's own strings — column menu, no-rows overlay,
page-size selector — are MUI's, and are set through the forwarded `localeText`.

## ThemeToggle

Light/dark switch; persists via `ThemeModeProvider`. The tooltip is the button's accessible name,
since the icon carries no text.

```tsx
<ThemeToggle />
<ThemeToggle size="small" switchToLightLabel="Use the light theme" />
```

## BrandLogo

Theme-aware Scholar Premium mark. Assets live in `frontend/src/assets/brand/` — navy/gold for
light surfaces, white/gold for dark (the product default). Both files render; CSS on the
`light` / `dark` document class picks the visible one, so there is no hydration flash.

```tsx
<BrandLogo />                              {/* brasão, 24px */}
<BrandLogo variant="lockup" height={32} /> {/* icon + wordmark */}
```

Use `mark` in compact slots (mobile topbar) and `lockup` where the brand replaces a logo + name
pair (sidebar, auth). Do not import the PNGs directly in screens.

## useChartTheme

The bridge between the theme and ECharts, which knows nothing about either. Returns a `ChartTheme`
— `textColor`, `axisColor`, `splitLineColor`, `seriesColors`, `tooltipBg` — resolved for the colour
scheme currently on screen.

```tsx
const chartTheme = useChartTheme();

const option = useMemo(
  () => ({
    color: chartTheme.seriesColors,
    tooltip: { backgroundColor: chartTheme.tooltipBg, textStyle: { color: chartTheme.textColor } },
  }),
  [chartTheme, data],
);
```

Build the option inside `useMemo` with `chartTheme` in the dependencies, or the chart keeps the
colours of whichever scheme it first rendered in. Never read `theme.palette` in a chart option —
under `cssVariables` it is pinned to the default scheme (see `theming.md` → Charts).

## Deprecated wrappers

- `StatusChip` → thin wrapper over `SemanticChip`
- `DataGridFooter` → internal to `DataTable` (OrdersStatusTable still uses legacy footer optionally)

## MUI primitives showcase

The Primitives section of the catalog (`frontend/design-system-docs/src/pages/primitives/` — Buttons, Form inputs, Surfaces, Overlays, Data display, Navigation) demonstrates themed raw MUI components: Button, TextField/Select/Switch/Radio/Autocomplete, Paper, Chip/Alert, Checkbox, Dialog/Snackbar, Menu, Tooltip, Avatar/Badge, CircularProgress/LinearProgress/Skeleton, ListItemButton, and Tabs/Breadcrumbs/Stepper. Shared demos live in `mui-primitives/*Section.tsx`. Use it as a quick reference for how a bare MUI component looks once themed, separate from the product pattern components above.
