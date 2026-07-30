# Web Guidelines (Rails 8.1)

Granular coding standards for `web/`. **Complements** `docs/web-stack.md` (the locked stack
and architecture) — it does not repeat it.

> Status: expanding as `web/` lands. Keep `docs/web-stack.md` as the architecture source of
> truth and the `rules/web/web-rails` rule as the terse agent-facing summary.

## Source of truth

- Stack & architecture: `docs/web-stack.md`.
- Agent-facing rule: `.cursor/rules/web/web-rails.mdc`.
- Implementer agent: `rails-implementer`.

## Standards

| Topic | Guideline | Rule | Skill |
|-------|-----------|------|-------|
| **Testing** | [`testing.md`](testing.md) | `testing-rspec` | `write-rspec-spec` |
| **Controllers** | [`controllers.md`](controllers.md) | `controllers` | `review-api` |
| **Models** | [`models.md`](models.md) | `models` | `write-rspec-spec` |
| **Services** | [`services.md`](services.md) | `services` | `write-rspec-spec` |
| **Policies (Pundit)** | [`policies.md`](policies.md) | `policies` | `review-api` |
| **Multi-tenancy** | [`multi-tenancy.md`](multi-tenancy.md) | `multi-tenancy` | `review-api` |
| **Migrations** | [`migrations.md`](migrations.md) | `migrations` | `publish-dbdocs` |
| **State machines** | [`state-machines.md`](state-machines.md) | `state-machines` | — |
| **Auditing** | [`auditing.md`](auditing.md) | `auditing` | — |
| **Jobs** | [`jobs.md`](jobs.md) | `jobs` | — |
| **Serializers** | [`serializers.md`](serializers.md) | `serializers` | `review-api` |
| **Mailers** | [`mailers.md`](mailers.md) | `mailers` | — |
| **Gateways** | [`gateways.md`](gateways.md) | `gateways` | — |
| **Anti-patterns** | [`anti-patterns.md`](anti-patterns.md) | `anti-patterns` | — |

## Cross-cutting

- **API docs** — rswag request specs; `rake rswag:specs:swaggerize`.
- **i18n** — keys in English, strings in `config/locales/pt-BR.yml`; no hardcoded Portuguese.
- **Design principles** — `docs/guidelines/process/design-principles.md`; rule `design-principles`.

## Open decisions (do not choose unilaterally)

Tracked in `docs/open-questions.md` (Web stack): email provider, boleto gateway.
Serialization (**blueprinter**), web/mobile clients, and auth TTL are decided —
see `docs/web-stack.md` and `docs/modeling/002-api-auth.md`.
