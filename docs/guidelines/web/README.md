# Web Guidelines (Rails 8)

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
- **Controllers** — thin; HTML and API both delegate to the same service. API under `/api/v1`.
- **Policies (Pundit)** — per-school and per-family isolation patterns; how `school_id` scoping is enforced.
- **Testing** — RSpec layout (model/service/request), FactoryBot conventions, Cuprite system specs.
- **i18n** — keys in English, strings in `config/locales/pt-BR.yml`; no hardcoded Portuguese.
- **Migrations / multi-tenancy** — `school_id` on tenant-scoped tables, indexing, foreign keys.

## Open decisions (do not choose unilaterally)

Tracked in `docs/open-questions.md` (Web stack): serialization (`jsonapi-serializer` vs
`blueprinter`), web auth (Rails 8 generator vs Devise), JSON key casing, email provider,
boleto gateway. Flag these rather than assuming.
