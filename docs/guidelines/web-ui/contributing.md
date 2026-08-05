# Contributing to the design system

How to add a token, a theme override, a pattern component or a catalog page. Required by
`docs/prds/layer-web-spa.md` (Acceptance criteria).

This is the procedure only. The reasoning behind each rule lives in the document linked from the
step — [tokens.md](./tokens.md), [theming.md](./theming.md), [versioning.md](./versioning.md),
[accessibility.md](./accessibility.md), [testing.md](./testing.md),
[components.md](./components.md), [page-patterns.md](./page-patterns.md) — and this guide does not
restate it.

## Two things to settle first

**The static catalog is canonical.** `frontend/design-system-docs/` builds into
`docs/design-system/`, which is committed and opens without a dev server. That is the surface a
reviewer checks, and the change is not done until it is rebuilt.

**Ladle is a development sandbox, not a documentation surface.** Stories are for working on a
component in isolation. No component or page may exist only in Ladle, and the catalog never links
to it.

Which layer you are touching decides which workflow below applies:

| Change | Layer | Workflow |
|--------|-------|----------|
| A colour value or a new colour key | `packages/design-tokens/` | [Token](#1-adding-or-changing-a-token) |
| How a MUI primitive renders | `frontend/main/src/theme/` | [Override](#2-adding-a-theme-override) |
| A reusable composition with a product API | `frontend/main/src/design-system/` | [Pattern](#3-adding-a-pattern-component) |
| Documenting any of the above | `frontend/design-system-docs/` | [Catalog page](#4-adding-a-catalog-page) |

A styling decision that belongs to one screen is not a design-system change. Use `sx` at the call
site.

## 1. Adding or changing a token

Worked example: **tokens 1.1.0**, which gave the `light` scheme its own semantic status colours
(`accessibility.md` → F5, `packages/design-tokens/CHANGELOG.md`).

1. **Edit `packages/design-tokens/colors.json`.** Every key exists in both the `light` and the
   `dark` block. One `SemanticTokens` type describes both schemes and `index.ts` asserts the JSON
   onto it, so a key added to only one scheme still typechecks and arrives `undefined` at runtime —
   the compiler will not catch this for you. A value tuned for one scheme is rarely right in the
   other: 1.1.0 changed four values in `light` only and left `dark` byte-identical, because
   DashdarkX *is* the dark scheme.
2. **Extend `SemanticTokens` in `packages/design-tokens/index.ts`** if the key is new.
3. **Map it in `frontend/main/src/theme/mapTokensToPalette.ts`.** `createAppTheme()` calls that
   mapper once per scheme, and nothing reads a token it does not map — that is why `purple.*`,
   `cyan.*` and `blue.*` exist in `colors.json` and reach no component.
4. **Verify contrast in both schemes.** Measure every pairing the token participates in against the
   thresholds in [accessibility.md](./accessibility.md), and update the rows it moves. A failure is
   fixed or waived in writing; there is no third option. Note that a token can be both a foreground
   and a background — making `error.main` readable as text on white is what pushed the destructive
   confirm button's label below AA (F1).
5. **Bump the version and add a `CHANGELOG.md` entry, in the same pull request.** A change that
   alters a rendered value is a minor bump at minimum, never a patch. Rules and format:
   [versioning.md](./versioning.md).
6. **Update the token table in [tokens.md](./tokens.md)** and rebuild the catalog.

`app/` consumes the dark scheme from the same package, so a change inside the `dark` block is a
mobile change too. Say so in the changelog entry.

## 2. Adding a theme override

1. **Create `frontend/main/src/theme/components/<category>/<Component>.tsx`**, default-exporting a
   `Components<Omit<Theme, 'components'>>['MuiX']` object. `theme/components/surface/Popover.tsx` is
   a compact reference.
2. **Keep it `cssVariables`-safe.** Read the palette through `(theme.vars || theme).palette`, and
   use `theme.applyStyles('light', {...})` when the two schemes need different literals. Never a
   hardcoded hex.
3. **Register it in `componentOverrides` in `createAppTheme.ts`.** An unregistered file is dead
   code that typechecks.
4. **Check existing usages before adopting a default that changes rendering.** Search the SPA for
   the primitive first, and for the primitives that compose it. `MuiStack` defaults to
   `direction: 'row'` and `MuiFormControl` to `variant: 'filled'`; both are deliberate and both are
   traps for a caller who does not know. `Popover` scopes its paper rule with `:not(.MuiMenu-paper)`
   precisely because `Menu` composes `Popover` and had already settled that surface.
5. **Update the inventory table in [theming.md](./theming.md)** — the component list, the category
   count and the total. That table must match `componentOverrides` exactly; the PRD makes it a
   standing invariant, re-verified on every override added.
6. **Re-check contrast if the override introduces a new foreground/background pair**
   ([accessibility.md](./accessibility.md) → *Re-running this audit*). Most theme fixes need no
   token bump at all, which makes them the cheap way to fix a contrast failure.
7. **Document it in the catalog** — a Primitives page, or the MUI primitives showcase.

## 3. Adding a pattern component

**Justify it before you write it.** `.cursor/rules/core/design-principles.mdc` governs here: better
duplicated code than a wrong abstraction, and *extract on the third stable case, not before*.
Duplication in two feature pages is not a reason to promote.

The two stranded candidates in `frontend/main/src/components/common/` show the judgement in
practice. Both were settled in August 2026, and **both stay where they are**
(`docs/prds/layer-web-spa.md` → Phase 5 → Known debt):

- **`RateChip`** has three call sites (`kpi/KPI.tsx`, `completed-task/CompletedTask.tsx`,
  `revenue-by-customer/RevenueByCustomer.tsx`) with the same `{ rate, isUp }` API — and still was
  not promoted. All three are DashdarkX sections printing literals from `src/data/`, so they are
  template leftovers that vanish together rather than three stable product cases. Promotion would
  also add a second chip API next to `SemanticChip`, which already covers the general shape.
- **`DateSelect`** has two (`revenue-by-customer/`, `completed-task/`). The rule says wait — and
  its real problem is a missing `DatePicker` override, which promoting the wrapper would hide
  rather than fix.

Three call sites is necessary, not sufficient. The API has to be the same in all three, not merely
the markup; the cases have to be *stable*, which template code inherited from DashdarkX is not; and
the design system must not end up with two sanctioned routes to the same surface.

The same review turned down every Phase 4 candidate — Toast, Accordion, Tabs, Breadcrumbs,
FilterBar and StatCard — for the same reasons, with the counts recorded per candidate in the PRD.
Read that table before proposing one of them again.

Once it is justified:

1. **Place it in `frontend/main/src/design-system/`** — `patterns/` for compositions, `data/` for
   data-surface wrappers, `hooks/` for hooks.
2. **Export it from `design-system/index.ts`, with its props type.** Both lines, together:
   `export { default as X }` and `export type { XProps }`. Composition guidance for the page level
   goes in [page-patterns.md](./page-patterns.md).
3. **No hardcoded user-facing strings.** Every word the component can render is a prop. Give it an
   English default so the common call site stays short — the defaults are what the codebase ships
   and they prejudge no i18n library — and list it in the Strings table in
   [components.md](./components.md). A label that is also an accessible name (`SearchField`'s
   `ariaLabel`, `ThemeToggle`'s tooltips) carries an extra obligation: a screen that leaves the
   default in place where a more specific name is needed has an accessibility defect, not just a
   wording one.
4. **Add a Ladle story** next to the component as `Component.stories.tsx`, exporting one named
   function per state.
5. **Add a spec** as `Component.test.tsx`, rendering through `src/test/renderWithTheme.tsx` and
   querying by role and visible text. Conventions: [testing.md](./testing.md).
6. **Add the catalog page** (below) and list it in
   `frontend/design-system-docs/src/pages/ComponentsIndex.tsx`. Every export of
   `design-system/index.ts` has a page — that is an acceptance criterion, not a nicety.
7. **Document the API in [components.md](./components.md).**

## 4. Adding a catalog page

1. **Create the page** under `frontend/design-system-docs/src/pages/<axis>/`, default-exporting a
   component in the house format:

   `DocSection` (`id`, `title`, `description`) → prose in `Typography` → the evidence, using
   `SpecTable` for value tables, `PropsTable` for component APIs, `LivePreview` for a rendered
   example and `CodeBlock` for the copyable snippet → a **Do** list and a **Don't** list.
   `pages/utilities/Truncation.tsx` is a good model. A pattern-component page skips all of this and
   passes its content to `ComponentDocPage`, which lays the same structure out for you.

   Examples use synthetic data only — no real student, guardian, CPF or school data (LGPD).
2. **Register it in `navSections` in `src/components/DocLayout.tsx`** under the right axis. Adding
   an axis means adding a nav section, not a second site.
3. **Register the route in `src/App.tsx`.** The path in nav and the path in the router must be the
   same string.
4. **Rebuild:** `make design-system-docs` from the repository root. The output in
   `docs/design-system/` is committed; a page that is not rebuilt does not exist for a reviewer.
5. **Run both verification scripts** from `frontend/design-system-docs/`:

   ```bash
   node scripts/check-nav-routes.mjs   # nav ↔ router: dead links, orphan routes, duplicates
   node scripts/smoke-pages.mjs        # renders every route in jsdom against the built bundle
   ```

   These are the gate, and they exist because a catalog page was silently broken in the published
   build. The catalog's `npm run build` is `vite build` alone — it does not typecheck — and a page
   that throws at render still produces a successful build, so neither the compiler nor the
   bundler would have caught it. `smoke-pages.mjs` reads the built output, so run it *after*
   `make design-system-docs`.

To typecheck the catalog: `npm run typecheck` (or plain `npx tsc -b`) in
`frontend/design-system-docs/`. It covers both the source and `vite.config.ts`, and emits nothing —
`tsconfig.json` is a solution-style root over `tsconfig.app.json` and `tsconfig.node.json`, the
same shape `frontend/main` uses. This used to need `tsc -p tsconfig.json --noEmit` to dodge a
config project that had no `@types/node` and emitted a `vite.config.js` shadowing the real config.

## Pre-merge checklist

Run from `frontend/main/`:

- [ ] `npm run build` — `tsc -b` then the production build
- [ ] `npm run lint`
- [ ] `npm run test:run`

Run from `frontend/design-system-docs/`:

- [ ] `npm run typecheck` (`tsc -b`)
- [ ] `make design-system-docs` (from the repository root) and the rebuilt `docs/design-system/`
      committed
- [ ] `node scripts/check-nav-routes.mjs`
- [ ] `node scripts/smoke-pages.mjs`

And, where the change touches them:

- [ ] Token change → version bump **and** `CHANGELOG.md` entry in this pull request
      ([versioning.md](./versioning.md))
- [ ] Override added or removed → the inventory table and counts in [theming.md](./theming.md)
      match `componentOverrides`
- [ ] Token value or new colour pairing → the affected rows in
      [accessibility.md](./accessibility.md) re-measured
- [ ] New token → the table in [tokens.md](./tokens.md); new pattern → the API in
      [components.md](./components.md)
- [ ] New user-facing string in a pattern → it is a prop, and it is in the Strings table in
      [components.md](./components.md) and on the catalog's Components page

The guidelines in this folder and the catalog must not contradict each other. When they disagree,
the catalog is canonical and the guideline is the one to fix.
