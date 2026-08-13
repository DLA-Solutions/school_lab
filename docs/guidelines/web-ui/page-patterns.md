# Page patterns

Target structure as features migrate out of the dashboard template.

## Page roots

Page roots: always `<Stack direction="column">` — the backoffice theme defaults `Stack` to `row` (intentional for toolbars). Explicit column direction prevents headers, steppers, and cards from rendering in a single horizontal row.

**Reference:** `Dashboard`, `ProvisioningWizard`, `SchoolActivation` under `frontend/backoffice/src/pages/`.

## Wizard page

```
Stack direction="column" gap={3.5} (maxWidth ~960)
  PageHeader (title, subtitle, actions: back link)
  Box overflowX auto
    └─ Stepper alternativeLabel
  SectionCard padding={3.5} title={active step}
    └─ step content
    └─ footer: [Back] [Continue] space-between
```

**Reference:** `ProvisioningWizard`, design-system-docs `NavigationSection` (Stepper).

## List page

```
PageHeader
  └─ actions: SearchField, primary Button
SectionCard (padding={0})
  └─ DataTable | list
  └─ EmptyState when rows.length === 0
```

**Reference:** `OrdersStatus` (`frontend/app/src/components/sections/dashboard/orders-status/`).

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
