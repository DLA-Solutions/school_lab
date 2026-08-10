# Web UI Review Checklist

Use during `review-web-ui`. Check only what the diff touches.

`frontend/app` today is React 19 + Vite 7 + TypeScript with **MUI v7 and Emotion** for styling
and **React Router v7**, plus a small `src/services/` API client and `src/providers/AuthProvider`.
No test runner, i18n library, or data-fetching library is installed yet.

That means the **Testing**, **i18n**, and **State and data fetching** sections below describe the
target once those pieces land — do not report their absence as a violation on code that predates
them. `docs/web-stack.md` §3 documents the MUI-based design system; use `docs/guidelines/web-ui/` for token and pattern rules.

## Architecture — thin client

- [ ] No business rules duplicated from the API (amounts, status transitions, eligibility)
- [ ] Validation in UI is UX-only (format, required fields); authoritative validation stays server-side
- [ ] Feature logic that belongs on the server is not reimplemented to "save a round trip"
- [ ] Shared API types/generated client used instead of hand-rolled DTOs diverging from OpenAPI

## Authentication and session

- [ ] Access token kept in memory (React state/context) — not `localStorage` / `sessionStorage`
- [ ] Refresh token never stored in JS-accessible storage (httpOnly cookie only)
- [ ] Login sends `client: "web"` per `002-api-auth.md`
- [ ] Silent refresh ~2 minutes before access expiry; single 401 retry then logout
- [ ] Logout clears in-memory access and calls API revoke endpoint
- [ ] `users.status` / membership suspension surfaces forced logout with i18n message

## School and role context

- [ ] School selected from `GET /me` memberships — not hardcoded or guessed
- [ ] Tenant API calls include `/schools/:school_id/` in the path
- [ ] Role-gated routes/menus match actor (backoffice, school, teacher, guardian)
- [ ] Guardian views use `.../me/...` API routes — never another family's identifiers

## API consumption

- [ ] Requests send `Authorization: Bearer` and `Accept-Language: pt-BR`
- [ ] List endpoints handle Pagy envelope (`data` + `meta`)
- [ ] Errors parsed from standard envelope (`error.code`, `error.message`, `error.details`)
- [ ] HTTP status handled per `docs/api/README.md` (401 → refresh flow, 403 → permission UI, 422 → field errors)
- [ ] No ad-hoc API base paths bypassing `/api/v1`

## UI and UX

- [ ] Loading, error, and empty states for async data
- [ ] Destructive actions confirmed; soft-delete semantics reflected in copy (i18n)
- [ ] Pagination/filter/sort params match API conventions (`page`, `per_page`, `status`, `sort`)
- [ ] Accessible labels and focus management for forms and modals (RTL-friendly patterns)

## Design system

- [ ] No `palette.info.*` for surfaces — use `background.default`, `background.paper`, `surface.alt`
- [ ] No hardcoded hex outside tokens / theme mapping
- [ ] New pages use `PageHeader` / `SectionCard` where appropriate
- [ ] Pattern components imported from `design-system/` rather than duplicated layouts

## i18n and language

- [ ] User-visible strings use i18n keys — no hardcoded Portuguese in TSX/TS
- [ ] Code identifiers, routes, and JSON keys in English
- [ ] Error `code` mapped to localized message where appropriate

## State and data fetching

- [ ] Server state not duplicated unnecessarily in global client state
- [ ] Cache invalidation after mutations (if using TanStack Query or equivalent)
- [ ] No stale school context after school switch

## Security and LGPD

- [ ] No sensitive child/health data logged to console or analytics
- [ ] Guardian screens scoped to own family data only
- [ ] No secrets or tokens in URL query params
- [ ] XSS-safe rendering (no `dangerouslySetInnerHTML` without sanitization)

## Testing (Vitest + RTL)

- [ ] Primary user flows covered (happy path + permission denied + API error)
- [ ] Tests query by role/label — not implementation details (`data-testid` only when necessary)
- [ ] API mocked at HTTP boundary (MSW/fetch mock), not internal module stubs
- [ ] Auth context exercised realistically in integration-style tests

## Context7 cross-check

- [ ] React, router, data-fetch, and test libraries used per current official patterns
- [ ] Vite env and build config follow documented best practices
- [ ] No deprecated APIs when Context7 documents a supported replacement — unless project doc locks the old pattern
