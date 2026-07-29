---
name: consult-context7
description: Query Context7 MCP for library documentation and best practices before implementing against a stack dependency. Use when writing Rails code, RSpec specs, or integrating a gem/framework.
---

# Consult Context7

Use when implementing code that follows official library or framework documentation.

## When to use

- Adding or changing Rails features (models, jobs, Active Storage, Solid Queue)
- Writing rswag request specs, Pundit policies, blueprinter serializers
- Integrating a gem whose API you are unsure about
- Any time `docs/web-stack.md` references a tool but not the specific pattern

## Steps

1. **Identify** the library and topic (e.g. "Rails 8 Solid Queue recurring jobs", "rswag request spec authentication").
2. **Query Context7** via MCP for that library + topic.
3. **Cross-check** with project docs:
   - `docs/web-stack.md` — locked stack wins
   - `docs/guidelines/web/` — coding standards
   - `docs/open-questions.md` — unresolved decisions
4. **Implement** following official best practices, adapted to project conventions.
5. If Context7 contradicts a project decision, follow the project doc and flag the conflict.

## Do not

- Use Context7 to override locked stack choices (e.g. switching from Solid Queue to Sidekiq).
- Skip Context7 when guessing at gem configuration — look it up first.
