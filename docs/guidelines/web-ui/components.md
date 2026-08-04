# Pattern components

Import from `design-system` (barrel: `frontend/main/src/design-system/index.ts`).

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

## SearchField

Controlled filled search input with icon.

## SemanticChip

```tsx
<SemanticChip variant="success" label="Delivered" width={80} />
```

Variants: `success` | `warning` | `error` | `info`.

## EmptyState

Centered empty list placeholder with optional CTA.

## ErrorBanner

```tsx
{error && <ErrorBanner message={error} onRetry={refetch} />}
```

Wraps MUI `Alert`; severities are themed with `transparent.*` tokens (see `theming.md`).

## ConfirmDialog

Modal for destructive confirmations. Wraps MUI `Dialog`/`DialogTitle`/`DialogContent`/`DialogContentText`/`DialogActions`, all themed for brand-consistent paper, spacing, and typography.

## DataTable

MUI X DataGrid wrapper with default footer pagination. Forwards all `DataGridProps`.

## ThemeToggle

Topbar light/dark switch; persists via `ThemeModeProvider`.

## Deprecated wrappers

- `StatusChip` → thin wrapper over `SemanticChip`
- `DataGridFooter` → internal to `DataTable` (OrdersStatusTable still uses legacy footer optionally)

## MUI primitives showcase

`frontend/design-system-docs/src/pages/MuiPrimitives.tsx` (split into `mui-primitives/*Section.tsx` helpers) demonstrates themed raw MUI components: Button, TextField/Select/Switch/Radio/Autocomplete, Paper, Chip/Alert, Checkbox, Dialog/Snackbar, Menu, Tooltip, Avatar/Badge, CircularProgress/LinearProgress/Skeleton, ListItemButton, and Tabs/Breadcrumbs/Stepper. Use it as a quick reference for how a bare MUI component looks once themed, separate from the product pattern components above.
