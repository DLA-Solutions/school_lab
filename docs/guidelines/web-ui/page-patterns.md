# Page patterns

Target structure as features migrate out of the dashboard template.

## List page

```
PageHeader
  └─ actions: SearchField, primary Button
SectionCard (padding={0})
  └─ DataTable | list
  └─ EmptyState when rows.length === 0
```

**Reference:** `OrdersStatus` (`frontend/main/src/components/sections/dashboard/orders-status/`).

## Form page

```
PageHeader
SectionCard
  └─ MUI TextField / Select fields
  └─ ErrorBanner (API error)
  └─ Stack of Cancel + Submit buttons
```

**Reference:** `Signin` uses `ErrorBanner` for auth errors.

## Detail page

```
PageHeader (title + edit/delete actions)
Grid of SectionCard blocks
```

Future feature folders (`src/features/`) should follow these compositions instead of ad-hoc Paper + Typography stacks.
