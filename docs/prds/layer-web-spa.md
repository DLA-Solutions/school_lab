# Layer PRD — web-spa

> Status: draft
> Stack reference: `docs/web-stack.md` §3

## Objective

Deliver a complete, documented and governed design system for `frontend/main`, so that every
product surface (backoffice, school, teacher, guardian) can be built from a single set of tokens,
themed primitives and pattern components — without re-deciding the visual language per feature.

The SPA stays a thin client: it owns presentation, navigation and session handling, and consumes
`/api/v1` for every business rule.

## Context

`frontend/main` is the React 19 + Vite 7 SPA described in `docs/web-stack.md` §3. It serves the
backoffice, school and teacher web surfaces today; the guardian web surface is subject to an open
question (`docs/open-questions.md` — MVP and scope: "Parents in the MVP: app only, or web too?"),
which this PRD does not resolve.

The SPA was generated from the DashdarkX template, kept frozen as `frontend/base` (MIT,
ThemeWagon). The visual essence — dark admin shell, purple gradient primary (`#CB3CFF`), Mona Sans
/ Work Sans typography, MUI-on-Emotion overrides — is a product decision recorded in
`docs/web-stack.md` §14 and must be preserved. There is no migration to another UI kit.

The design system has three layers today:

| Layer | Location | State (Aug 2026) |
|-------|----------|------------------|
| Tokens | `packages/design-tokens/` (`@school-lab/design-tokens`, consumed as a `file:` dependency) | `colors.json` with light/dark semantic tokens; version `1.2.0`, with `CHANGELOG.md` and the bump policy in `docs/guidelines/web-ui/versioning.md` |
| Theme | `frontend/main/src/theme/` | `createAppTheme()` + **64** registered MUI component overrides under `theme/components/**` |
| Patterns | `frontend/main/src/design-system/` | 9 pattern components + `useChartTheme`, exported from `design-system/index.ts` |

Reference documentation is built from `frontend/design-system-docs/` into `docs/design-system/`
(`make design-system-docs`). Human-facing standards live in `docs/guidelines/web-ui/`; the
machine-facing rule is `.cursor/rules/web-ui/design-system.mdc`.

Completeness is benchmarked against Bootstrap 5's **documentation architecture** — foundations,
layout, content, forms, components, utilities, accessibility, governance — not against its
component inventory. MUI v7 already ships equivalents for nearly every Bootstrap component, so the
work is theme coverage, documentation and governance, never reimplementation.

## Responsibilities

### In scope (this layer)

- **Design tokens** — color, spacing, radius, typography, shadow, z-index and motion, for both
  color schemes, sourced from `packages/design-tokens`.
- **MUI theme coverage** — every MUI primitive the product uses carries a School Lab override, or a
  written decision that the primitive is not allowed.
- **Pattern components** — composition-level building blocks in `src/design-system/` with typed,
  documented props.
- **Documentation** — the static site in `docs/design-system/` is the canonical catalog; the
  guidelines in `docs/guidelines/web-ui/` stay the narrative companion and must not contradict it.
- **Accessibility baseline** — contrast, keyboard navigation, focus visibility and ARIA labelling.
- **Surface composition** — role-based routes and guards (`src/routes/`), page shells and the
  list/form/detail page patterns.
- **API consumption** — JWT access token in memory, refresh via httpOnly cookie, uniform error and
  pagination handling.
- **pt-BR product strings** in the SPA through i18n keys; English identifiers in code.

### Out of scope (delegated elsewhere)

- **Business rules** → Domain PRDs + `web/` service objects. Client-side validation is UX only and
  never the authority; it must not restate a BR-NNN rule.
- **API contracts** → `docs/api/v1/` narratives and the rswag-generated `swagger/v1/swagger.yaml`.
- **Mobile visual language** → the `app/` layer. Mobile shares the token package (dark tokens only),
  not the React components.
- **`frontend/base`** — frozen upstream reference; never modified, never deployed, never the subject
  of a layer PRD.

## Dependencies

| Depends on | For |
|------------|-----|
| `packages/design-tokens` | Single source of color and shadow values, shared with `app/` |
| `docs/web-stack.md` §3 | Locked stack: React 19, Vite 7, MUI v7 + Emotion, React Router v7 |
| `docs/guidelines/web-ui/` | Existing human-facing standards to absorb and keep in sync, not duplicate |
| `docs/api/README.md` + `docs/api/v1/` | Auth flow, error envelope, pagination contract |
| `web/` API (`/api/v1`) | Every data read and write |
| Domain PRDs (e.g. `docs/prds/fintech-first.md`) | Which surfaces and screens the design system must serve |

## Technical constraints

- **MUI v7 + Emotion.** No Tailwind, no Bootstrap CSS, no second UI kit (`docs/web-stack.md` §12).
- **Theming through `createAppTheme()`** with `colorSchemes` light/dark and
  `cssVariables: { colorSchemeSelector: 'class' }`. Dark is the default mode.
- Overrides read palette values via `(theme.vars || theme).palette` and use `theme.applyStyles()`
  for per-scheme literals, so they stay `cssVariables`-safe.
- **No hardcoded hex** outside `packages/design-tokens` and the token→palette mapping
  (`theme/mapTokensToPalette.ts`).
- **No utility class system** — the `sx` prop is the sanctioned styling escape hatch.
- **Icons via Iconify** (`@iconify/react`); `@mui/icons-material` is not a dependency.
- Tables use `@mui/x-data-grid` v8 through `DataTable`; dates use `@mui/x-date-pickers` v8; charts
  use ECharts through `useChartTheme()`.
- Access token stays in memory (`src/services/tokenStore.ts`); the refresh token is never readable
  by JavaScript.

## Interfaces

### Catalog

The static site (`frontend/design-system-docs/` → `docs/design-system/`, built with
`make design-system-docs`) is the **canonical, reviewable catalog**. It is committed to the
repository, opens without a dev server, and is the surface a reviewer is expected to check.

**Ladle** (`npm run ladle` in `frontend/main`, 9 story files) is retained as a **development
sandbox** for isolated component work. It is not a documentation surface: no page may exist only in
Ladle, and the catalog never links to it. This consolidation is recorded as a decision in
`docs/open-questions.md` (Web stack).

### Documentation architecture

The catalog mirrors Bootstrap 5's documentation axes, adapted to MUI. Pages marked *new* do not
exist yet.

| Axis | Pages |
|------|-------|
| Getting started | Introduction, Contents *(new)*, Browsers & devices *(new)*, Accessibility *(new)* |
| Foundations | Tokens, Typography, Spacing & Shadows, Theming, Customize *(new)* |
| Layout | Breakpoints, Containers, Grid, Z-index |
| Content | Reboot / `CssBaseline`, Images, Tables |
| Forms | Overview, Controls, Selection, Layout, Validation |
| Components | One page per pattern component (all ten exist); one page per themed primitive group — Snackbar, Popover, Backdrop and Pagination exist, the rest still share the MUI primitives showcase *(partial)* |
| Utilities | `sx` conventions, `Stack` and `useFlexGap`, truncation, visually hidden, ratio |
| About *(new axis)* | Changelog, versioning, licenses, DashdarkX attribution |

Bootstrap's Content axis also carries a *Typography usage* page. This catalog deliberately has no
equivalent: Bootstrap needs one because it styles raw HTML elements and has no theme-level type
scale, whereas here the MUI `Typography` variants *are* the scale and Foundations → Typography
already documents them. A second page could only repeat that inventory or split one contract across
two URLs. Prose and usage guidance belongs on the Foundations page, and so does the `MuiTypography`
override that landed in Phase 3 — it is a theming concern, not a Content one.

Nav lives in `frontend/design-system-docs/src/components/DocLayout.tsx`; adding an axis means adding
a nav section, not a separate site. Every nav entry must resolve to a route and every route must be
reachable from nav.

### API consumption

- **Auth** — Bearer access JWT (20 min) held in memory; refresh through the httpOnly cookie with a
  single transparent 401 retry (`src/services/api.ts`). Session state lives in
  `src/providers/AuthProvider.tsx`.
- **Errors** — the client unwraps `{ error: { code, message, details } }` into `ApiError`
  (`src/services/api.ts`); `ErrorBanner` is the standard presentation. On a `422`
  (`validation_error`) `details` is the record's `errors.to_hash` — snake_case attribute keys
  mapping to arrays of messages — and is the **only** authority for field-level errors. On any
  other status `details` is empty or diagnostic and must not be read as a field map. Client-side
  validation is UX only: it may check for an empty required field, a malformed date or a length
  that exceeds the column, and may never restate a business rule, an authorization decision or a
  state-transition rule. Documented in the catalog under Forms → Validation.
- **Pagination** — list endpoints are paginated by the API (Pagy). `DataTable` is a thin
  `@mui/x-data-grid` wrapper, so it inherits the grid's client-side pagination default; the
  server-side contract holds only when the **call site** passes `paginationMode="server"` together
  with `rowCount` from the API and a controlled `paginationModel` / `onPaginationModelChange` pair.
  Fetching a full dataset so the browser can paginate, sort or filter it is a defect, not a
  shortcut. `DataTable` does not enforce this today — see the Phase 5 debt item.
- **Isolation** — the SPA sends `school_id` scoped paths and never assumes cross-school or
  cross-family reads are permitted; authorization is enforced by Pundit in `web/`. The client must
  not display data it merely happens to hold in cache after a role or school switch.
- **Locale** — user-facing strings are pt-BR through i18n keys; code identifiers stay English.

## Non-functional requirements

- **Accessibility** — WCAG 2.1 AA contrast for all semantic tokens in both color schemes; every
  interactive element reachable, operable and visibly focused by keyboard. Any token that cannot
  meet AA without breaking the DashdarkX identity requires a written waiver in the catalog's
  Accessibility page.
- **Testability** — a component test runner in `frontend/main`: **Vitest + React Testing Library**
  on jsdom, configured in `vite.config.ts` and run with `npm run test:run`. Conventions in
  `docs/guidelines/web-ui/testing.md`. This closed the "SPA test runner" open item in
  `docs/open-questions.md` (Web stack).
- **Versioning** — `packages/design-tokens` carries a semantic version and a changelog; a token
  change that alters a rendered value is a minor or major bump, never silent.
- **Performance** — no regression in SPA bundle size attributable to design-system growth; the
  catalog is a separate build and never ships in the product bundle.
- **Privacy** — catalog examples and Ladle stories use synthetic data only. No real student,
  guardian, CPF or school data ever appears in a story, fixture or screenshot (LGPD).

## Acceptance criteria

- [x] Every MUI primitive used in `frontend/main` has either a theme override or a documented
      decision that it is not allowed. *(Every `@mui/material` primitive the SPA imports is covered
      — by an override, or by the `Box` / `Grid` / `SvgIcon` and `Card*` / `Table*` decisions in
      `theming.md`. The last gap was `DatePicker`, whose 40-line local `sx` in
      `components/common/DateSelect.tsx` is now the `MuiPickersOutlinedInput` and
      `MuiPickersSectionList` overrides, alongside the written decision that a picker takes no
      `styleOverrides` key of its own — `theming.md` → Date pickers, mirrored in the catalog under
      Foundations → Theming. `MuiPickersDay` is deliberately absent: no mounted view renders a day
      grid, and `theming.md` says what to add when one does.)*
- [x] Every export of `design-system/index.ts` has a catalog page with a preview, its props,
      when-to-use guidance and a code sample. *(`useChartTheme` closed the last gap in Phase 2; as a
      hook it documents its returned `ChartTheme` shape in place of a props table.)*
- [x] `breakpoints` and `zIndex` are explicit in `createAppTheme()` and documented, even where the
      values equal MUI defaults.
- [x] Token contrast ratios are verified for light and dark; failures are fixed or waived in
      writing. *(`docs/guidelines/web-ui/accessibility.md` — 48 pairings per scheme, twelve fixes
      applied (F1–F10, F12, N15), four written waivers (W1–W4), and one latent shortfall (F11) on a
      `Switch` no screen composes. No blocking AA failure remains in either scheme. The audit's own
      Accessibility **catalog page** is still open — Phase 5 — so the waivers live in the guideline
      rather than in the canonical catalog.)*
- [x] Pattern components contain no hardcoded user-facing strings. *(Every string a pattern renders
      is a prop with an English default — inventory in `docs/guidelines/web-ui/components.md` →
      Strings, mirrored in the catalog under Components → Strings. Standing invariant: a new
      literal in `design-system/` arrives as a prop in the same change. The choice of i18n library
      is a separate open question and is untouched by this.)*
- [x] `docs/guidelines/web-ui/` and the catalog do not contradict each other — in particular the
      override table in `theming.md` matches `componentOverrides` in `createAppTheme.ts` (**64**
      entries). This is a standing invariant: re-verify it whenever an override is added.
- [x] A contribution guide states how to add a token, an override and a pattern component.
      *(`docs/guidelines/web-ui/contributing.md`, which also covers catalog pages and carries the
      pre-merge checklist.)*
- [x] No page or component exists only in Ladle — each of the 9 story files has a catalog page.
- [x] `packages/design-tokens` has a changelog entry for every released token change.
      *(`CHANGELOG.md` from the `1.0.0` baseline; `1.1.0` records the light-scheme status colours
      and `1.2.0` the `light.secondary.darker` move, each with the measurements behind it. Standing
      invariant, like the override table: a token change without an entry is incomplete.)*

## Roadmap

Phases are ordered by leverage: documentation contracts first, then coverage, then new patterns,
then governance. Each phase is independently shippable.

### Phase 1 — Documentation foundation

- Add the **Layout** axis: Breakpoints, Containers, Grid, Z-index pages.
- Make `breakpoints` and `zIndex` **explicit** in `createAppTheme()` even where they replicate MUI
  defaults, so they become a documented contract instead of an inherited accident.
- Add the **Content** axis, starting with a Reboot page documenting the existing
  `theme/components/utils/CssBaseline.tsx` override, plus images and table baselines.
- Add the **Utilities** axis: `sx` conventions, `Stack` with `useFlexGap`, text truncation,
  visually-hidden content, fixed aspect ratio.
- Correct the override table in `docs/guidelines/web-ui/theming.md`, which omits `MuiStack`
  (`theme/components/layout/`) and `MuiCssBaseline` (`theme/components/utils/`).

### Phase 2 — Forms axis

- Catalog pages: Forms overview, controls, selection controls, form layout, validation.
- Add the missing `FormControl`, `FormLabel` and `InputLabel` overrides so label and helper-text
  rendering is consistent with the already-themed `TextField` / `OutlinedInput` / `FormHelperText`.
- Document the validation contract: client validation is UX only; the API error `details` map is
  the authority for field errors.

### Phase 3 — Primitive coverage

- High-priority overrides — **landed**: `Typography`, `Container`, `Snackbar` root, `Popover`,
  `Backdrop`, `Pagination` root, and the date-picker field (`PickersOutlinedInput`,
  `PickersSectionList`). `AppBar` is still open, to add where the shell needs it.
- `Card*` and `Table*` get **no override**: they are forbidden by default (decided — see below).
- One catalog page per themed primitive group, extending the existing
  `frontend/design-system-docs/src/pages/primitives/` (Buttons, Form inputs, Surfaces, Overlays, Data display, Navigation) and shared demos in `mui-primitives/`.
- Lower priority, add only when a product screen needs them: `Accordion*`, `ToggleButton*`,
  `ButtonGroup`, `ListItem`/`ListSubheader`, `Slider`, `Rating`, `Fab`, `SpeedDial`,
  `BottomNavigation`, and `PickersDay` / `DateCalendar` — the day grid, which no mounted view
  renders (`DateSelect` opens `views={['month', 'year']}`). `PickersDay` carries a known 3.73:1
  selected-day label, so it ships with a `grey[900]` label in the same change; see
  `docs/guidelines/web-ui/accessibility.md` → F12.

### Phase 4 — Missing product patterns

Candidates, each promoted only when the design-principles rule is satisfied — **extract on the
third stable case, not before**. Duplication in two feature pages is not a reason to promote.

**Reviewed August 2026. Nothing was promoted.** Every candidate was counted against the SPA as it
actually stands, and each verdict is labelled *demand-driven* — real, stable, repeated usages that a
pattern would de-duplicate — or *list-driven* — it would exist only because this list named it. The
labels are here so the list can be pruned on review without re-deriving the counts.

The controlling fact is the size of the product surface. `frontend/main` has three pages
(`Dashboard`, `Signin`, `Error404`); the dashboard is the DashdarkX template's own sections,
rendering hardcoded sample data from `src/data/`. No domain PRD has produced a screen yet. So for
most of this list the call-site count is not "below three", it is **zero** — the pattern would ship
with no caller at all, and its API would be a guess about screens nobody has specified.

| Candidate | Call sites today | Verdict | Label |
|---|---|---|---|
| Toast / notification provider | 0 — `Snackbar` is themed and demonstrated in the catalog, imported by no product code | Do not build | *list-driven* |
| Accordion section | 0 — and no `MuiAccordion` override exists either | Do not build | *list-driven* |
| Page-level Tabs | 0 in the SPA; the only `Tabs` render is the catalog's primitives showcase | Do not build | *list-driven* |
| Breadcrumbs + `PageHeader` | 0 — the router is three flat routes, so there is no trail to render | Do not build | *list-driven* |
| FilterBar | 1 — `orders-status/OrdersStatus.tsx`, where two `SearchField`s are responsive twins of one filter, with no selects | Do not build | *list-driven* |
| StatCard | 1 whole card (`kpi/KPI.tsx`); the value + `RateChip` fragment inside it recurs 3× | Do not build | *list-driven* |

Notes on the two that came closest:

- **FilterBar** is one call site rendered twice — the same filter shown at `xs` and hidden at `sm`,
  and vice versa. Two renders of one filter is not two cases. Its shape would also have to be
  invented: the roadmap describes "`SearchField` + selects + actions", and the single real instance
  has no select at all.
- **StatCard** is the interesting one, because a fragment does repeat three times: the `h3` value
  with a `RateChip` beside it, in `kpi/`, `completed-task/` and `revenue-by-customer/`. But the
  *card* around it differs completely each time — a fixed-height grid tile with an icon and an
  overflow menu; a centred caption above a sparkline; a title with chart legends and a date picker.
  A "StatCard" that covered all three would be a props bag for three unrelated layouts, which is
  the wrong abstraction the rule is written to prevent. The fragment that genuinely repeats is
  small enough that the duplication is the cheaper side of the trade, and all three instances print
  literals (`257`, `$240.8K`, `14.8%`) from the template — none is an API-fed metric, so none is
  yet a *stable* case in the sense the rule means.

Revisit when a domain PRD lands its first real screens. The trigger to look again is a third
product screen wanting the same thing, not the reappearance of a name on this list.

`RateChip` and `DateSelect` were settled in the same pass — see Phase 5 → Known debt.

### Phase 5 — Governance

- **Accessibility** — the audit is **done** and lives in `docs/guidelines/web-ui/accessibility.md`:
  48 pairings measured in each scheme, twelve fixes applied, four written waivers (W1–W4), a
  keyboard and focus pass, and ARIA labels on the icon-only controls. **Still open:** the
  Accessibility **catalog page**. The non-functional requirement asks for waivers to be recorded in
  the canonical catalog, and today they are only in the guideline. Two of the four waivers are
  product decisions rather than engineering ones (W3's brand purple, W4's chart series colours), so
  the page is where a non-engineer would look for them.
- **Tests**: the runner is installed (Vitest + RTL over MSW) at **97 tests across 19 files**. The
  pattern components are covered except `SectionCard`, and `src/services/api.test.ts` covers the
  client end to end. Pages and route guards are next.
- **Versioning**: semantic version plus `CHANGELOG.md` for `packages/design-tokens` — done, at
  `1.2.0`; the About → Changelog catalog page is still open.
- **Contribution guide**: `docs/guidelines/web-ui/contributing.md` — done.
- **i18n of pattern strings** — **done**. Every user-facing string a pattern renders is a prop with
  an English default: `SearchField` (`placeholder`, `ariaLabel`) and `ConfirmDialog`
  (`confirmLabel`, `cancelLabel`) already were; `ErrorBanner.retryLabel`, `ThemeToggle`'s two
  tooltip labels, `DataTable.rangeLabel` for the footer row range and `EmptyState.icon` for the
  decorative glyph closed the rest. Defaults stayed English — that is what the codebase shipped,
  and the SPA has no i18n layer to hold pt-BR keys — so this decides nothing about the **choice of
  i18n library**, which stays open in `docs/open-questions.md`. Inventory in
  `docs/guidelines/web-ui/components.md` → Strings and in the catalog under Components → Strings.
- **Known debt**:
  - Charts reading `theme.palette` directly — **done**. The three dashboard charts took colours
    `ChartTheme` did not expose straight off `theme.palette`, which under `cssVariables` is the
    default scheme's: `VisitorsChart`'s centre label painted `text.primary` `#171923` on the dark
    card, and `VisitorsChart` and `RevenueChart` each took a light-scheme `secondary.lighter`
    series. `ChartTheme` gained `strongTextColor` and `mutedSeriesColors`, every call site now goes
    through the hook, and `no-restricted-syntax` in `eslint.config.js` makes `theme.palette` and
    `theme.colorSchemes` errors under `src/components/**` and `src/layouts/**` so the shortcut
    cannot come back. Pinned by per-scheme option-capture specs
    (`VisitorsChart.test.tsx`, `RevenueChart.test.tsx`, `CompletedTaskChart.test.tsx`).
  - `DataTable` forwards `DataGridProps` untouched, so the server-pagination contract above lives
    entirely in each call site and nothing fails loudly when one forgets. Decide whether the
    component should default `paginationMode` to `'server'`, or require `rowCount` +
    `paginationModel` in its own props type, once there is a second real caller to design against.
  - `@mui/utils` — **done**. It is an explicit dependency of `frontend/main` and of
    `frontend/design-system-docs` (both at 7.3.11), `layouts/main-layout/SkipLink.tsx` imports
    `visuallyHidden` from it, and Utilities → Visually hidden now documents the import and points
    at that usage instead of restating the nine declarations.
  - `components/common/DataGridFooter.tsx` duplicates the footer now internal to `DataTable`
    (`OrdersStatusTable` still uses the legacy one) — remove after migrating the last caller.
  - `ThemeToggle` — **done**. It now takes `switchToLightLabel`, `switchToDarkLabel`, `size` and
    `sx`, and `ThemeToggleProps` is exported from `design-system/index.ts`.
  - `components/common/RateChip.tsx` — **decided: stays feature-local.** The count is met (three
    call sites, same `{ rate, isUp }` API in all three) and the count is not the test. All three
    are DashdarkX dashboard sections printing literals from `src/data/`, so they are template
    leftovers rather than stable product cases, and they disappear together the day the dashboard
    is replaced by a real one. Promotion would also put a second chip API in `design-system/`
    beside `SemanticChip`, which already renders a semantic-coloured chip with an icon —
    `RateChip` is that, narrowed to a direction arrow and a fixed 62px width. Two sanctioned routes
    to one surface is how a design system drifts, which is the same reasoning that banned `Card*`
    and `Table*`. When a screen shows an API-fed metric with a delta, the move to design is a
    `trend` on `SemanticChip`, not a promoted `RateChip`.
  - `components/common/DateSelect.tsx` — **decided: stays feature-local, and the theming gap is
    closed.** Two call sites is below the promotion bar on its own, but the real problem was the one
    the first acceptance criterion named: a 40-line local `sx` styling `DatePicker` with no override
    and no written decision. That `sx` is now `MuiPickersOutlinedInput` and `MuiPickersSectionList`,
    and the wrapper is down to the picker's behaviour plus one `flexShrink`. Two things came out of
    doing it: the local `sx` had been reading `theme.palette.surface.alt`, so the field painted the
    *light* surface on the dark dashboard card, and the popper's selected month and year turned out
    to be a live 3.73:1 AA failure the accessibility audit had excluded as unreachable
    (`accessibility.md` → F12). Deleting the wrapper is now a judgement call about the remaining
    three props, not a blocked one.
  - `components/common/StatusChip.tsx` is a deprecated wrapper over `SemanticChip` — retire it.

## Pending decisions

Recorded in `docs/open-questions.md` (Web stack).

| Question | Position |
|----------|----------|
| Does i18n enter this PRD's scope? | **Partially — settled and applied.** Pattern components are free of hardcoded user-facing strings: each is a prop with an English default, which was testable without a library and is covered by specs. The **choice of i18n library** stays the existing open question in `docs/open-questions.md`. |
| Is WCAG 2.1 AA the accessibility target, given it may force dark-theme token adjustments? | **Yes, AA — ratified 2026-08-04** by the product owner, in the same decision that waived the gradient button (`accessibility.md` → W3). Any token that cannot reach AA without breaking the DashdarkX identity gets a written waiver naming the token, the measured ratio and the reason. Four exist (W1–W4). The waivers are in `accessibility.md`; putting them on the catalog's Accessibility page is the Phase 5 item still open. |

Still open for a human, arising from the audit rather than from this table:

- **Dark and light `secondary.lighter`, and light `secondary.light`** — the chart series colours and
  the DOM legend swatches keyed to them, at 2.69:1, 2.21:1 and 2.04:1 against the card they sit on.
  No AA threshold applies (`accessibility.md` → W4 accepts them, with reasoning), but dark
  `#0E43FB` is a deep blue at 226° on a `#0B1739` card at 224°, which is a legibility question the
  standard does not answer. Moving any of them is a **minor** token bump and a repaint of the
  DashdarkX charts, so it is a product decision. Not changed.

Already decided (see `docs/open-questions.md` → Web stack):

- **The static site is the canonical catalog** and Ladle is a development sandbox only.
- **The SPA test runner is Vitest + React Testing Library** on jsdom.
- **MUI `Card*` and `Table*` are forbidden by default**, documented as such, with **no override
  created**. `SectionCard` is the card surface and `DataTable` the tabular one. The ban formalises
  what the codebase already does — neither primitive is imported anywhere in `frontend/main` — and
  keeps one sanctioned route to each result; an override would be a second route to the same
  surface, which is how a design system drifts. Revisit only if a screen needs genuinely static,
  non-paginated tabular content that `DataTable` is the wrong tool for (a printable report, a fixed
  reference matrix) — that reopens the decision in `docs/open-questions.md` rather than authorising
  a local import. Written up in `docs/guidelines/web-ui/theming.md` and the catalog
  (Foundations → Theming, Content → Tables).

## Out of scope

- Sass, utility classes, RTL support, Carousel and Scrollspy — Bootstrap features with no place in
  an MUI-based system.
- Publishing the design system as an external npm package. `@school-lab/design-tokens` stays a
  private workspace dependency.
- Redesigning the DashdarkX visual identity.
- The mobile design system (`app/`), which shares tokens but not components.
- Business rules, API contracts and data modeling — Domain PRDs, `docs/api/` and `docs/modeling/`.
- Resolving whether guardians get a web surface in the MVP — tracked in `docs/open-questions.md`.
