---
name: review-web-ui
description: Reviews React SPA changes in web-ui/ against School Lab conventions, API contract, and official library documentation via Context7. Use when reviewing web-ui components, pages, hooks, API client, auth, routing, state, i18n, or Vitest tests.
---

# Review Web UI

School Lab–specific code review for the React SPA (`web-ui/`). Complements `review-api`
(contract on the server), `review-bugbot`, and `review-security` — use this skill when the
change touches browser UI, client auth, or API consumption patterns.

## Scope

| Area | Paths |
|------|-------|
| UI | `web-ui/src/components/**`, `web-ui/src/pages/**`, `web-ui/src/features/**` |
| Routing | `web-ui/src/routes/**`, router config |
| API client | `web-ui/src/api/**`, `web-ui/src/lib/api/**` |
| Auth | `web-ui/src/auth/**`, token/refresh handling |
| State | `web-ui/src/stores/**`, feature contexts |
| i18n | `web-ui/src/locales/**`, `web-ui/public/locales/**` |
| Types | `web-ui/src/types/**` (OpenAPI-generated or hand-written) |
| Tests | `web-ui/**/*.test.ts`, `web-ui/**/*.test.tsx`, `web-ui/**/*.spec.ts(x)` |
| Config | `web-ui/vite.config.*`, `web-ui/tsconfig.*` when affecting API/auth |

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

1. `docs/web-stack.md` §3 — locked web UI stack (Vite, TypeScript, Tailwind, auth).
2. `docs/api/README.md` — error envelope, pagination, versioning, `Accept-Language`.
3. `docs/modeling/002-api-auth.md` — web refresh via httpOnly cookie; access in memory.
4. Domain narrative: `docs/api/v1/<domain>.md` when the UI maps to an API namespace.
5. PRD (UI flows, permissions) when a PRD exists for the feature.
6. Rules: `rules/core/lgpd-privacy`, `rules/core/language-conventions`.
7. `docs/guidelines/web/testing.md` § cross-surface — Vitest + RTL behavior focus.
8. `docs/open-questions.md` — do not treat unresolved UI stack choices as violations.

### 3. Consult Context7 (required)

Query Context7 **before** flagging framework misuse. Skill: `consult-context7`. Rule:
`rules/core/use-context7`.

| Change involves | Context7 topics (examples) |
|-----------------|----------------------------|
| Components / hooks | React hooks rules, composition patterns |
| Routing | React Router or TanStack Router (match project choice) |
| Data fetching | TanStack Query / SWR patterns, error/retry handling |
| Forms | React Hook Form or chosen form library validation UX |
| Styling | Tailwind CSS utilities, responsive patterns |
| API types | openapi-typescript / orval generated client usage |
| Tests | Vitest, React Testing Library (user-centric queries) |
| Build | Vite env variables, `import.meta.env` |

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
| **Critical** | Business rules duplicated client-side; refresh token in `localStorage`/sessionStorage; access token persisted to disk; cross-school data shown without `school_id` in API path; guardian sees another family's data; hardcoded pt-BR in components instead of i18n |
| **Warning** | Missing 401 retry-after-refresh; API errors not mapped to standard envelope; missing loading/error/empty states; no RTL test for primary user flow; school switcher ignores `GET /me` memberships |
| **Suggestion** | Component too large; duplicate fetch logic; minor Context7 pattern gap; inconsistent route naming |

After the table, add **Context7 notes** — libraries queried and any project-vs-official-doc conflicts.

## What good web UI code looks like here

- **Thin client** — display, navigation, and input; rules live in `/api/v1`.
- **Auth** — access JWT in memory; refresh only via httpOnly cookie (`client: web` on login).
- **School context** — selected from `GET /me` memberships; API calls use `/schools/:school_id/...`.
- **Errors** — handle `{ error: { code, message, details } }`; show i18n-friendly messages.
- **English in code** — user-visible strings via i18n keys; product locale `pt-BR`.
- **Tests** — Vitest + RTL; assert what the user sees, not implementation details.

## Related skills

- `review-api` — server contract and Pundit enforcement
- `consult-context7` — official React/Vite/Tailwind docs
- `review-bugbot` — logic bugs across layers
- `review-security` — XSS, token storage, sensitive data in DOM
