# Web Guidelines (Rails 8.1)

Granular coding standards for `web/`. **Complements** `docs/web-stack.md` (the locked stack
and architecture) — it does not repeat it.

> Status: seed. `web/` has no code yet. Expand this as the Rails app lands; keep
> `docs/web-stack.md` as the architecture source of truth and the `rules/web/web-rails` rule
> as the terse agent-facing summary.

## Source of truth

- Stack & architecture: `docs/web-stack.md`.
- Agent-facing rule: `.cursor/rules/web/web-rails.mdc`.
- Implementer agent: `rails-implementer`.

## Standards to document here (as code is written)

- **Service objects** — naming (`Domain::Verb`), single public entry point, return objects/results, no controller logic leaking in.
- **Controllers** — thin; API under `/api/v1`; delegate to services.
- **API docs** — rswag request specs; `rake rswag:specs:swaggerize`.
- **Policies (Pundit)** — per-school and per-family isolation; path `:school_id` + `me/` routes.
- **Testing** — RSpec layout (model/service/request), FactoryBot conventions, Cuprite system specs.
- **i18n** — keys in English, strings in `config/locales/pt-BR.yml`; no hardcoded Portuguese.
- **Migrations / multi-tenancy** — `school_id` on tenant-scoped tables, indexing, foreign keys.

## Open decisions (do not choose unilaterally)

Tracked in `docs/open-questions.md` (Web stack): email provider, boleto gateway.
Serialization (**blueprinter**), web/mobile clients, and auth TTL are decided —
see `docs/web-stack.md` and `docs/modeling/002-api-auth.md`.
