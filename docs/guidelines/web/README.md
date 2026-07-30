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

## Standards

- **Testing** — behavior-focused RSpec; see [`testing.md`](testing.md). Rule: `rules/web/testing-rspec`. Skill: `write-rspec-spec`.
- **Controllers** — thin API orchestration; see [`controllers.md`](controllers.md). Rule: `rules/web/controllers`. Skill: `review-api`.
- **Models** — thin ActiveRecord layer, tenancy, Discard; see [`models.md`](models.md). Rule: `rules/web/models`.
- **Migrations** — DBML-first schema, `school_id`, FKs, Discard indexes; see [`migrations.md`](migrations.md). Rule: `rules/web/migrations`.
- **State machines** — AASM lifecycles on `status`; see [`state-machines.md`](state-machines.md). Rule: `rules/web/state-machines`.
- **Auditing** — change history with **audited**; see [`auditing.md`](auditing.md). Rule: `rules/web/auditing`.
- **Services** — business logic entry point; see [`services.md`](services.md). Rule: `rules/web/services`.
- **API docs** — rswag request specs; `rake rswag:specs:swaggerize`.
- **Policies (Pundit)** — per-school and per-family isolation; path `:school_id` + `me/` routes.
- **i18n** — keys in English, strings in `config/locales/pt-BR.yml`; no hardcoded Portuguese.

## Open decisions (do not choose unilaterally)

Tracked in `docs/open-questions.md` (Web stack): email provider, boleto gateway.
Serialization (**blueprinter**), web/mobile clients, and auth TTL are decided —
see `docs/web-stack.md` and `docs/modeling/002-api-auth.md`.
