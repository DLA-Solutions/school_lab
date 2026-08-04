# Theming

## Stack

- MUI v7 `colorSchemes` with `cssVariables.colorSchemeSelector: 'class'`
- Factory: `frontend/main/src/theme/createAppTheme.ts`
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

## Component overrides (cssVariables-safe)

All `theme/components/**` overrides read palette values via `(theme.vars || theme).palette` (not `theme.palette` directly), so they resolve correctly whether `theme.vars` is generated (`cssVariables` mode) or not. When light/dark need different literal values (e.g. shadows), use `theme.applyStyles('light', {...})` — see `shadowSx()` in `theme/shadows.ts`.

Registered overrides by category (`theme/components/`):

| Category | Components |
|----------|------------|
| `button/` | Button, ButtonBase, IconButton, Toolbar |
| `input/` | TextField, OutlinedInput, FilledInput, InputBase, InputAdornment, Checkbox, Radio, Switch, Autocomplete, FormControlLabel, FormHelperText, Select |
| `surface/` | Paper |
| `navigation/` | Drawer, Link, Menu, Tabs, Tab, Breadcrumbs, Stepper, StepLabel, StepConnector |
| `data-display/` | Divider, Chip, Tooltip, Avatar, Badge |
| `feedback/` | Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress, LinearProgress, SnackbarContent, Skeleton |
| `list/` | List, ListItemButton, ListItemIcon, ListItemText, MenuItem, Collapse |
| `data-grid/`, `date-picker/`, `pagination/` | DataGrid, MonthCalendar/YearCalendar, PaginationItem |

All are registered in `createAppTheme.ts`'s `componentOverrides` map.

## Charts

Use `useChartTheme()` from `design-system/hooks/useChartTheme` for axis, tooltip, and series defaults.

## Mobile

React Native imports dark tokens from `@school-lab/design-tokens`. Theme mode toggle on mobile is out of scope for this design system v1.
