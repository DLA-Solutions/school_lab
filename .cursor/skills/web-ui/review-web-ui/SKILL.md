---
name: review-web-ui
description: Reviews React SPA changes in frontend/main against School Lab conventions, API contract, and official library documentation via Context7. Use when reviewing web SPA pages, components, MUI theming, API client, auth, routing, or session state.
---

# Review Web UI

School Lab–specific code review for the React SPA (`frontend/main`). Complements `review-api`
(contract on the server), `review-bugbot`, and `review-security` — use this skill when the
change touches browser UI, client auth, or API consumption patterns.

## Scope

| Area | Paths |
|------|-------|
| Entry point | `frontend/main/src/main.tsx`, `frontend/main/src/App.tsx` |
| Pages | `frontend/main/src/pages/**` (`Dashboard.tsx`, `Error404.tsx`, `authentication/Signin.tsx`) |
| Components | `frontend/main/src/components/**` (`base/`, `common/`, `icons/`, `loader/`, `sections/`) |
| Layouts | `frontend/main/src/layouts/**` — `auth-layout/`, `main-layout/` (sidebar, topbar) |
| Routing | `frontend/main/src/routes/**` (`router.tsx`, `guards.tsx`, `paths.ts`, `sitemap.ts`) |
| API client, auth transport, token storage | `frontend/main/src/services/**` (`api.ts`, `authApi.ts`, `tokenStore.ts`) |
| Auth state | `frontend/main/src/providers/**` (`AuthProvider.tsx`, `AuthContext.ts`) |
| Types | `frontend/main/src/types/**` — hand-written (`auth.ts`, `custom.d.ts`) |
| Theme / styling | `frontend/main/src/theme/**`, `frontend/main/src/design-system/**`, `packages/design-tokens/**` |
| Template data | `frontend/main/src/data/**` — hardcoded dashboard placeholders, **not** API data |
| Helpers | `frontend/main/src/utils/**` |
| Config | `frontend/main/vite.config.ts`, `frontend/main/tsconfig*.json`, `frontend/main/.env.example` when affecting API/auth |

`frontend/main` is React 19 + Vite 7 + TypeScript with **MUI v7 on Emotion** (plus MUI X
DataGrid and Date Pickers) and **React Router v7**. Data reaches the UI through the
hand-written `fetch` wrapper in `src/services/api.ts` — there is no axios and no generated
client. Full picture: `docs/web-stack.md` §3.

Some conventions below describe surfaces that **do not exist in `frontend/main` yet**. Treat
them as targets for new code, not as paths to review today:

| Not present yet | Applies when |
|-----------------|--------------|
| Feature folders (`src/features/**`) | The SPA outgrows the template's `pages/` + `components/sections/` layout |
| Split API/auth folders (`src/api/**`, `src/lib/api/**`, `src/auth/**`) | Someone splits `src/services/`, where the fetch client, auth calls, and token store live today |
| Store folder (`src/stores/**`) | A state library is adopted — only React Context exists |
| i18n (`src/locales/**`, `public/locales/**`) | An i18n library is installed — strings are hardcoded and the topbar `LanguageSelect` is inert template UI |
| Tests (`frontend/main/**/*.test.ts(x)`, `*.spec.ts(x)`) | A test runner is added — `package.json` has no Vitest, Testing Library, or MSW |
| Generated API types | `openapi-typescript` or orval is added — `src/types/` is hand-written |

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
7. `docs/guidelines/web/testing.md` § cross-surface — behavior-first principle; note that no
   SPA test runner is installed, so a missing test is not a finding.
8. `docs/open-questions.md` (Web stack) — do not treat unresolved UI stack choices
   (test runner, i18n, data fetching, global state, API types) as violations.

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
TanStack Query, i18next, Vitest, Testing Library, MSW, Tailwind, or a form library: none is
installed (see the "Not present yet" table above). If a diff *adds* one of them, that is a
stack decision — say so and point at `docs/open-questions.md` rather than reviewing it as
routine.

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

User-facing strings are hardcoded today because no i18n library is installed — do not report
that as a finding on existing code. Raise it only when a diff makes the problem materially
worse, and frame it as the open i18n decision.

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
- **English in code** — identifiers, comments, and filenames in English; product locale `pt-BR`.

## Related skills

- `review-api` — server contract and Pundit enforcement
- `consult-context7` — official React, Vite, MUI, and React Router docs
- `review-bugbot` — logic bugs across layers
- `review-security` — XSS, token storage, sensitive data in DOM
