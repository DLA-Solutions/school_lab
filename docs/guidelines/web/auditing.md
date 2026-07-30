# Auditing (change history)

Conventions for tracking **who changed what** on domain records. Uses the
[audited](https://github.com/collectiveidea/audited) gem.

Rule: `.cursor/rules/web/auditing.mdc`.

> **Not the same as** `bundler-audit` (CVE scanning in CI) or **access auditing**
> (who *viewed* a record — still open in `docs/open-questions.md` LGPD section).

## Role

Audited stores an append-only change log in the `audits` table (`audited_changes` as
**jsonb** on PostgreSQL). It complements **Discard** (soft delete hides records;
audits preserve the change trail).

Use for school-domain records where accountability matters: students, guardians,
charges, documents, billing plans, etc.

## Setup

| Piece | Location |
|-------|----------|
| Gem | `Gemfile` → `audited` |
| Migration | `db/migrate/*_create_audits.rb` |
| Global config | `config/initializers/audited.rb` |
| Tenant concern | `app/models/concerns/school_auditable.rb` |
| Request context | `app/controllers/concerns/audit_context.rb` |

After pulling: `bundle install` and `bin/rails db:migrate`.

## Enabling on a model

Tenant-scoped models with `belongs_to :school`:

```ruby
class Student < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :school
end
```

`SchoolAuditable` sets `audited associated_with: :school` so audits can be queried
per school. Override per model when needed:

```ruby
audited associated_with: :school,
        only: %i[status name birth_date],
        redacted: :internal_notes
```

## Do not audit

| Table / model | Reason |
|---------------|--------|
| `refresh_tokens` | Ephemeral credentials |
| `webhook_events` | Immutable ingress log |
| `payments` | Immutable financial fact |
| `audits` | Meta-table |

Never store secrets in audit diffs — use `redacted:` or `except:` for tokens, passwords,
`encrypted_password`, `token_digest`, etc.

## API request context

Audited records `user_id` / `user_type` from the current user. API controllers must
set the store on each request:

```ruby
class Api::V1::BaseController < ApplicationController
  include AuditContext
end
```

`AuditContext` assigns `Audited.store[:audited_user] = Current.user` (set from JWT).

System/background work with no user: use `without_auditing` or accept `user` as nil
and document the actor in a service comment when required.

## Bulk and maintenance

Disable auditing for mass updates:

```ruby
Student.without_auditing do
  Student.where(school: school).update_all(imported_at: Time.current)
end
```

Prefer services for bulk imports; wrap with `without_auditing` when no per-row actor exists.

## LGPD and retention

- Audits may contain PII copied from changed fields — treat `audits` as sensitive data.
- Retention windows are **pending legal validation** (`docs/open-questions.md`).
- Do not expose raw audit history to guardians unless a PRD defines it; backoffice/school
  roles only, via Pundit.
- Access auditing (read/view events) is a separate concern — not covered by `audited`.

## Testing

- Assert audit rows in **service specs** when change tracking is a business rule.
- Prefer checking `audits.last.audited_changes` over matcher-only specs.
- Bulk paths: verify `without_auditing` prevents audit row explosion.

See [`testing.md`](testing.md).
