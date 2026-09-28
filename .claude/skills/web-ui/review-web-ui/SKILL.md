---
name: review-web-ui
description: Reviews React SPA changes in frontend/app against School Lab conventions, API contract, and official library documentation via Context7. Use when reviewing web SPA pages, components, MUI theming, API client, auth, routing, or session state.
---

# Review Web UI

School Lab–specific code review for the React SPA (`frontend/app`). Complements `review-api`
(contract on the server), `review-bugbot`, and `review-security` — use this skill when the
change touches browser UI, client auth, or API consumption patterns.

## Scope

| Area | Paths |
|------|-------|
| Entry point | `frontend/app/src/main.tsx`, `frontend/app/src/App.tsx` |
| Pages | `frontend/app/src/pages/**` (`Dashboard.tsx`, `Error404.tsx`, `authentication/Signin.tsx`) |
| Components | `frontend/app/src/components/**` (`base/`, `common/`, `icons/`, `loader/`, `sections/`) |
| Layouts | `frontend/app/src/layouts/**` — `auth-layout/`, `main-layout/` (sidebar, topbar) |
| Routing | `frontend/app/src/routes/**` (`router.tsx`, `guards.tsx`, `paths.ts`, `sitemap.ts`) |
| API client, auth transport, token storage | `frontend/app/src/services/**` (`api.ts`, `authApi.ts`, `tokenStore.ts`) |
| Auth state | `frontend/app/src/providers/**` (`AuthProvider.tsx`, `AuthContext.ts`, `I18nProvider.tsx`) |
| i18n | `frontend/app/src/locales/**` — custom catalogues (`pt-BR`, `en-US`); `useI18n()` via `I18nProvider` |
| Tests | `frontend/app/src/**/*.test.ts(x)`, `src/test/**` — Vitest + RTL + MSW |
| Types | `frontend/app/src/types/**` — hand-written (`auth.ts`, `custom.d.ts`) |
| Theme / styling | `frontend/app/src/theme/**`, `frontend/app/src/design-system/**`, `packages/design-tokens/**` |
| Template data | `frontend/app/src/data/**` — hardcoded dashboard placeholders, **not** API data |
| Helpers | `frontend/app/src/utils/**` |
| Config | `frontend/app/vite.config.ts`, `frontend/app/tsconfig*.json`, `frontend/app/.env.example` when affecting API/auth |

`frontend/app` is React 19 + Vite 7 + TypeScript with **MUI v7 on Emotion** (plus MUI X
DataGrid and Date Pickers) and **React Router v7**. Data reaches the UI through the
hand-written `fetch` wrapper in `src/services/api.ts` — there is no axios and no generated
client. Full picture: `docs/web-stack.md` §3.

Some conventions below describe surfaces that **do not exist in `frontend/app` yet**. Treat
them as targets for new code, not as paths to review today:

| Not present yet | Applies when |
|-----------------|--------------|
| Feature folders (`src/features/**`) | The SPA outgrows the template's `pages/` + `components/sections/` layout |
| Split API/auth folders (`src/api/**`, `src/lib/api/**`, `src/auth/**`) | Someone splits `src/services/`, where the fetch client, auth calls, and token store live today |
| Store folder (`src/stores/**`) | A state library is adopted — only React Context exists |
| Generated API types | `openapi-typescript` or orval is added — `src/types/` is hand-written |
| TanStack Query / SWR | A data-fetching library is adopted — components call `src/services/` directly today |

`frontend/base` is the upstream template the SPA started from — out of scope for review.

Skip unrelated tooling unless it changes runtime behavior (auth, API base URL, CORS assumptions).

## Workflow

### 1. Establish the diff

Default: **branch changes** against the repo default base branch (committed + staged + unstaged).

| User intent | Diff scope |
|-------------|------------|
| PR / branch review | branch changes |
| Local WIP only | uncommitted changes |
| Specific files | read those files directly |

If the user points at a PR or branch, check it out first (stash only after user confirms).

### 2. Load project context

Read **before** judging the code:

1. `docs/web-stack.md` §3 — installed SPA stack (React 19, Vite 7, TypeScript, MUI v7, auth)
   and its "Not in the SPA yet" table.
2. `docs/api/README.md` — error envelope, pagination, versioning, `Accept-Language`.
3. `docs/modeling/002-api-auth.md` — web refresh via httpOnly cookie; access in memory.
4. Domain narrative: `docs/api/v1/<domain>.md` when the UI maps to an API namespace.
5. PRD (UI flows, permissions) when a PRD exists for the feature.
6. Rules: `rules/core/lgpd-privacy`, `rules/core/language-conventions`.
7. `docs/guidelines/web-ui/testing.md` — Vitest + RTL + MSW conventions; behavior-first principle.
8. `docs/open-questions.md` (Web stack) — do not treat unresolved UI stack choices
   (data fetching library, global state, generated API types) as violations.

### 3. Consult Context7 (required)

Query Context7 **before** flagging framework misuse. Skill: `consult-context7`. Rule:
`rules/core/use-context7`.

| Change involves | Context7 topics (examples) |
|-----------------|----------------------------|
| Components / hooks | React 19 hooks rules, composition patterns |
| Styling / UI kit | MUI v7 (`sx`, theme overrides, `slotProps`), Emotion |
| Tables / date inputs | MUI X DataGrid v8, MUI X Date Pickers v8 (dayjs adapter) |
| Routing | React Router v7 data router (`createBrowserRouter`, loaders, `Outlet`) |
| Data fetching | Native `fetch` + `AbortController`; request/error handling in `src/services/` |
| Charts | ECharts / `echarts-for-react` |
| Build | Vite 7 env variables, `import.meta.env` |

Query **only** the libraries the diff touches. Do not query — or grade the code against —
TanStack Query, i18next, Tailwind, or a form library: none is installed (see the "Not present
yet" table above). Vitest, Testing Library, and MSW **are** installed — consult Context7 when
reviewing test patterns. If a diff *adds* an unapproved stack dependency, that is a stack
decision — say so and point at `docs/open-questions.md` rather than reviewing it as routine.

**Project docs win** over generic docs (`docs/web-stack.md`). Note conflicts only when
relevant.

### 4. Review against checklist

Work through [checklist.md](checklist.md). Report only failing or risky items.

### 5. Report findings

Do **not** fix code unless the user asks.

**No issues:**

> Web UI review found no issues.

**With issues** — markdown table, sorted by severity (highest first):

| Severity | Location | Finding |
|----------|----------|---------|
| Critical | `path:line` | Concrete problem + expected convention |
| Warning | `path:line` | … |
| Suggestion | `path:line` | … |

| Level | Examples |
|-------|----------|
| **Critical** | Business rules duplicated client-side; refresh token in `localStorage`/sessionStorage; access token persisted to disk; cross-school data shown without `school_id` in API path; guardian sees another family's data |
| **Warning** | Missing 401 retry-after-refresh; API errors not mapped to the `{ error: { code, message, details } }` envelope; missing loading/error/empty states; school switcher ignores `GET /me` memberships; template placeholders from `src/data/**` shipped as if they were API data |
| **Suggestion** | Component too large; fetch logic duplicated instead of going through `src/services/`; one-off `sx` styling that belongs in the `src/theme/` overrides; minor Context7 pattern gap; inconsistent route naming |

User-facing strings in **new or changed** code should use i18n keys via `useI18n().t()` — both
`pt-BR.ts` and `en-US.ts`. Report hardcoded Portuguese in new diffs as a **Warning**. Legacy
pages still migrating may retain hardcoded strings; do not mass-flag untouched files.

After the table, add **Context7 notes** — libraries queried and any project-vs-official-doc conflicts.

## What good web UI code looks like here

- **Thin client** — display, navigation, and input; rules live in `/api/v1`.
- **Auth** — access JWT in memory (`tokenStore.ts`); refresh only via httpOnly cookie
  (`client: web` on login), with `credentials: 'include'` on every request.
- **One transport** — new API calls go through `request()` in `src/services/api.ts`, which
  already unwraps the error envelope and replays once after a refresh.
- **School context** — selected from `GET /me` memberships; API calls use `/schools/:school_id/...`.
- **Styling through the theme** — MUI components with `sx` for local tweaks; recurring
  appearance belongs in `src/theme/components/**`, not copy-pasted per component.
- **English in code** — identifiers, comments, and filenames in English; product strings via i18n keys.

## Related skills

- `review-api` — server contract and Pundit enforcement
- `consult-context7` — official React, Vite, MUI, and React Router docs
- `review-bugbot` — logic bugs across layers
- `review-security` — XSS, token storage, sensitive data in DOM

Orchestration agent for new features: `frontend-implementer`.
