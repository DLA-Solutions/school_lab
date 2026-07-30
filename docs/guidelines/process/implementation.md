# Implementation

How to implement features in `web/` and `app/` after PRD and modeling are approved.

## Prerequisites

1. Approved PRD in `docs/prds/`.
2. Modeling artifacts when applicable: `docs/modeling/`, `docs/database/database_dml.md`.
3. API contract when applicable: `docs/api/v1/<domain>.md`.

Do not implement domains without a PRD. Do not resolve open items in `docs/open-questions.md`
unilaterally.

## Stack reference

- Architecture and locked stack: `docs/web-stack.md`.
- Web coding standards: `docs/guidelines/web/`.
- Design principles: `docs/guidelines/process/design-principles.md`.
- Testing: `docs/guidelines/web/testing.md`.

## Consult Context7 before coding

When implementing against a library or framework, **consult the Context7 MCP** for current
official documentation and best practices before writing code.

Rule: `.cursor/rules/core/use-context7.mdc`. Skill: `consult-context7`.

### Workflow

1. Identify the library and topic (e.g. Rails 8.1 callbacks, rswag request specs, Pundit scopes).
2. Query Context7 for that library + topic.
3. Cross-check with project decisions in `docs/web-stack.md` and anchor docs.
4. If Context7 and project docs diverge, **project docs win**. Flag outdated stack notes in
   `docs/open-questions.md` if needed.

Context7 complements project docs — it does not override locked decisions (e.g. Solid Queue
over Sidekiq, blueprinter, JWT auth).

## Implementation checklist

- [ ] Models and controllers generated via `bin/rails generate` (not hand-created files)
- [ ] Business logic in service objects (`app/services/`), not controllers
- [ ] Authorization via Pundit; per-school and per-family isolation enforced
- [ ] Behavior-focused specs (see `docs/guidelines/web/testing.md`)
- [ ] English identifiers; pt-BR only in locale files
- [ ] LGPD-sensitive fields handled per `rules/core/lgpd-privacy`
