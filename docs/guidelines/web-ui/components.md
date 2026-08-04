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

## ConfirmDialog

Modal for destructive confirmations.

## DataTable

MUI X DataGrid wrapper with default footer pagination. Forwards all `DataGridProps`.

## ThemeToggle

Topbar light/dark switch; persists via `ThemeModeProvider`.

## Deprecated wrappers

- `StatusChip` → thin wrapper over `SemanticChip`
- `DataGridFooter` → internal to `DataTable` (OrdersStatusTable still uses legacy footer optionally)
