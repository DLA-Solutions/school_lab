# Models (ActiveRecord)

Conventions for `web/app/models/`. Schema source of truth: `docs/database/schema.dbml`.
Lifecycle and Discard rules: `docs/modeling/001-fintech-first.md`.

Rule: `.cursor/rules/web/models.mdc`. Skill: `write-rspec-spec`.

## Role

Models are the **data layer** — associations, validations, scopes, and simple predicates.
Business rules and side effects live in **service objects** (`app/services/`).

## Thin models

| Belongs in model | Belongs in service |
|------------------|-------------------|
| `validates`, `belongs_to`, `has_many` | Creating a charge + issuing boleto |
| Scopes (`kept`, `overdue`, `for_school`) | Sending email, enqueueing jobs |
| `before_validation` normalization | Cross-aggregate orchestration |
| Simple predicates (`active?`, `discarded?`) | Authorization decisions |

Callbacks: only normalization (`before_validation`) and defaults (`after_initialize`).
Never enqueue jobs, call external APIs, or send mail from callbacks.

## Multi-tenancy and integrity

- Tenant-scoped tables require `school_id` (`not null` unless documented — e.g. platform `memberships`).
- **Foreign keys in migrations** — DB enforces referential integrity; models use `belongs_to`.
- Always set `dependent:` on `has_many` / `has_one` (or document why not).
- Queries must scope by `school_id` or go through `policy_scope` — never leak across schools.

## Soft delete (Discard)

Gem: [discard](https://github.com/jhawthorn/discard). Column: `discarded_at` (nullable timestamp).

```ruby
class Student < ApplicationRecord
  include Discard::Model
  belongs_to :school
end

Student.kept.where(school: school)  # prefer explicit .kept
```

| Use Discard | Do not use Discard |
|-------------|-------------------|
| `students`, `guardians`, `charges`, `documents` | `refresh_tokens`, `payments`, `webhook_events` |

Partial unique indexes (`WHERE discarded_at IS NULL`) require matching model validations
(e.g. `validates :email, uniqueness: { conditions: -> { kept } }`).

Avoid `default_scope` for Discard unless a domain doc explicitly requires it.

## State and lifecycle

**Status** (business lifecycle), **Discard** (`discarded_at`), and **AASM** serve different purposes.

### Simple status

For two-state flags or no transition graph, validate `status` as a string (matches DBML `varchar` and API JSON):

```ruby
validates :status, inclusion: { in: %w[active transferred] }
```

### State machines (AASM)

Use **AASM** when the PRD/API defines guarded transitions (`charges`, `documents`, `contracts`):

```ruby
class Charge < ApplicationRecord
  include ChargeStateMachine  # aasm column: :status
end
```

- `column: :status` — string values (`pending`, `paid`, …), not default `aasm_state`.
- `no_direct_assignment: true` — transitions only via events.
- Services call `may_*?` / `event!`; controllers never invoke bang events directly.
- Invalid transition → API `409 Conflict`.

See [`state-machines.md`](state-machines.md). Rule: `rules/web/state-machines`.

### Discard

```ruby
# discarded_at — soft delete (hidden from default queries)
```

**Discard** is orthogonal to business `status` (e.g. `cancelled` charge vs discarded duplicate).

## Queries and concerns

- Reusable filters → **scopes** on the model.
- Complex list/filter logic → services or `policy_scope`, not controllers.
- Negative state: `where.missing(:association)` (e.g. charges without a payment).
- Extract a **concern** on the third stable case — one behavior each (`SchoolScoped`).

## Validations

- Mirror DB constraints: `validates :name, presence: true` + `null: false` in migration.
- Error messages via i18n keys (`errors.messages.blank`) — no hardcoded pt-BR.

## Testing and factories

Model specs (`spec/models/`) cover validations, scopes, and callbacks with business effect.

Factories (`spec/factories/`):

- One factory per model; traits for states (`:discarded`, `:suspended`, `:overdue`).
- Always set `school` (and tenant keys) via factory default or explicit `create(:student, school:)`.

Shoulda matchers for associations/validations are acceptable; pair with behavior assertions.
See [`testing.md`](testing.md).

## Change auditing

Include `SchoolAuditable` on tenant-scoped domain models that need accountability
(students, guardians, charges, documents, …). Do **not** audit ephemeral or immutable
tables (`refresh_tokens`, `payments`, `webhook_events`).

See [`auditing.md`](auditing.md). Rule: `rules/web/auditing`.
