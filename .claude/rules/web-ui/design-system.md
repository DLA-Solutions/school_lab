> Use School Lab design system patterns and tokens in frontend/app
>
> **Relevant when touching:** `frontend/app/src/**`

# Web UI design system

Full guidelines: `docs/guidelines/web-ui/`.

**Agent routing:** Client UI work is owned by **frontend-implementer** (rule `agent-routing`).

- Import patterns from `design-system/` (`PageHeader`, `SectionCard`, `SearchField`, `SemanticChip`, etc.).
- Do not use `palette.info.*` for surfaces — use `background.default`, `background.paper`, `surface.alt`.
- Do not hardcode hex colors outside `packages/design-tokens` and theme mapping.
- New list pages: compose `PageHeader` + `SectionCard` + `DataTable` / `EmptyState`.
- Theme: `createAppTheme()` with `defaultMode="dark"`; toggle via `ThemeToggle` + `ThemeModeProvider`.

Visual reference: `docs/design-system/index.html` (rebuild with `make design-system-docs`).
