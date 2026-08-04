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

## Charts

Use `useChartTheme()` from `design-system/hooks/useChartTheme` for axis, tooltip, and series defaults.

## Mobile

React Native imports dark tokens from `@school-lab/design-tokens`. Theme mode toggle on mobile is out of scope for this design system v1.
