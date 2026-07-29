---
name: review-api
description: Reviews API changes in web/ against School Lab conventions, project docs, and official library documentation via Context7. Use when reviewing API controllers, services, policies, serializers, routes, rswag request specs, or OpenAPI output under /api/v1.
---

# Review API

School Lab–specific code review for the versioned REST API (`/api/v1`). Complements generic
`review-bugbot` and `review-security` — use this skill when the change touches API surface,
contract, auth, or tenant isolation.

## Scope

Review files that affect the API contract or its enforcement:

| Area | Paths |
|------|-------|
| Controllers | `web/app/controllers/api/**` |
| Services | `web/app/services/**` |
| Policies | `web/app/policies/**` |
| Serializers | `web/app/serializers/**`, `web/app/blueprints/**` |
| Routes | `web/config/routes.rb` (API namespaces) |
| Contract tests | `web/spec/requests/api/**` |
| OpenAPI | `web/swagger/v1/swagger.yaml` |

Skip unrelated `web/` changes unless they leak into API behavior.

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

Read the docs that govern the changed domain — **before** judging the code:

1. `docs/api/README.md` — global API conventions (errors, pagination, auth, versioning).
2. Domain narrative: `docs/api/v1/<domain>.md` when the change maps to a namespace.
3. Modeling when auth/identity/tenant scope is involved: `docs/modeling/002-api-auth.md`, relevant `docs/modeling/NNN-*.md`.
4. PRD section (API, Errors, Permissions) when a PRD exists for the domain.
5. Rules: `rules/web/web-rails`, `rules/web/testing-rspec`, `rules/core/lgpd-privacy`, `rules/core/language-conventions`.
6. `docs/open-questions.md` — do not treat unresolved decisions as violations.

### 3. Consult Context7 (required)

For every library pattern present in the diff, query Context7 **before** flagging framework misuse.
Skill: `consult-context7`. Rule: `rules/core/use-context7`.

| Change involves | Context7 topics (examples) |
|-----------------|----------------------------|
| Request specs / OpenAPI | rswag request spec DSL, `swaggerize` workflow |
| Authorization | Pundit policy scopes, `authorize` in controllers |
| Serialization | blueprinter views, conditional fields |
| Auth / tokens | JWT gem, Devise API mode, refresh rotation |
| Jobs triggered by API | Solid Queue enqueue patterns |
| Pagination | Pagy JSON metadata |
| Soft delete | Discard gem, `kept` / `discarded` scopes |
| CORS | rack-cors configuration |

**Project docs win** when Context7 contradicts locked stack (`docs/web-stack.md`). Note the
conflict in findings only if the code follows generic docs but violates project decisions.

### 4. Review against checklist

Work through [checklist.md](checklist.md). Focus on items relevant to the diff — do not
report passing checks.

### 5. Report findings

Do **not** fix code unless the user asks.

**No issues:**

> API review found no issues.

**With issues** — markdown table, one row per finding, sorted by severity (highest first):

| Severity | Location | Finding |
|----------|----------|---------|
| Critical | `path:line` | Concrete problem + expected convention |
| Warning | `path:line` | … |
| Suggestion | `path:line` | … |

Severity guide:

| Level | Examples |
|-------|----------|
| **Critical** | Cross-tenant data leak; missing Pundit on scoped read; business logic in controller; wrong HTTP status for documented error envelope; hardcoded pt-BR in JSON; refresh token in response body for web client |
| **Warning** | Missing request-spec scenario (auth, 422, isolation); OpenAPI/rswag drift; service bypasses policy; pagination meta missing; LGPD-sensitive field exposed without justification |
| **Suggestion** | Naming inconsistency; duplicate logic that could move to service; rswag tag mismatch; minor Context7 best-practice gap with no security impact |

After the table, add a short **Context7 notes** section listing libraries queried and any
project-vs-official-doc conflicts found.

## What good API code looks like here

- **Thin controllers** — parse params, `authorize`, call one service, render result.
- **Services own business rules** — shared by web-ui and mobile; return result objects.
- **Pundit everywhere** — tenant (`school_id`) and family (`.../me/...`) isolation.
- **Contract in request specs** — rswag metadata + behavior examples; run `rake rswag:specs:swaggerize`.
- **Error envelope** — `{ error: { code, message, details } }` with documented HTTP codes.
- **English in code**, pt-BR only via i18n (`Accept-Language`).

## Related skills

- `consult-context7` — official library docs during review
- `write-rspec-spec` — expected request-spec coverage
- `review-bugbot` — logic bugs across all layers
- `review-security` — security-focused pass (auth, injection, data exposure)
