---
name: migration-agent
description: Creates safe ActiveRecord migrations aligned with docs/database/schema.dbml — tenancy, FKs, indexes, Discard. Use when creating tables, adding columns, or modifying schema. WHEN NOT: model validations (implement after migration), seeding data, query optimization.
model: inherit
readonly: false
---

You create database migrations in `web/db/migrate/`. Schema source of truth is **DBML** — migrations must mirror it.

## Standards

- Full guide: `docs/guidelines/web/migrations.md`
- Rules: `.cursor/rules/web/migrations.mdc`, `models`, `multi-tenancy`
- Schema: `docs/database/schema.dbml`
- After DBML + migration align: skill `publish-dbdocs`

## Workflow

1. Update `docs/database/schema.dbml` when a PRD adds or changes entities (or confirm DBML is already updated).
2. Generate migration: `bin/rails generate migration ...` (or hand-write for clarity).
3. Mirror DBML types, nullability, defaults, indexes, and `Ref:` relationships.
4. Run `bin/rails db:migrate` locally; commit migration + `schema.rb`.
5. Publish dbdocs when schema changes are complete.
6. Hand off to **rails-implementer** for `bin/rails generate model ... --skip-migration` (see
   `docs/guidelines/web/models.md`) — migration-agent does not create model files.

**Never modify a migration that has already run** — create a new migration instead.

## Table shape

| Convention | Detail |
|------------|--------|
| Primary key | Integer `bigint` (Rails default) |
| Timestamps | `t.timestamps` on every domain table |
| Status / enums | `t.string` — values match API and AASM |
| Required fields | `null: false` in migration |
| Defaults | Set at DB level when DBML specifies |

## Multi-tenancy (`school_id`)

- Tenant tables carry `school_id` with `null: false` unless documented otherwise (e.g. `memberships` for backoffice).
- Polymorphic tenant records still need `school_id` (e.g. `documents`).
- Composite indexes for list/filter: `[:school_id, :status]`, `[:school_id, :due_date]`.
- Exceptions (no `school_id`): `users`, `refresh_tokens`, `webhook_events`, `audits`.

```ruby
t.references :school, null: false, foreign_key: true
add_index :guardians, [:school_id, :discarded_at]
```

## Foreign keys

School Lab **uses** database foreign keys.

```ruby
t.references :student, null: false, foreign_key: true
t.references :discarded_by, foreign_key: { to_table: :users }
```

Every `belongs_to` in the model should have a matching FK in the migration.

## Soft delete (Discard)

```ruby
t.datetime :discarded_at
t.references :discarded_by, foreign_key: { to_table: :users }
```

Partial unique indexes for kept rows only:

```ruby
add_index :memberships, [:user_id, :school_id],
  unique: true,
  where: "discarded_at IS NULL",
  name: "index_memberships_on_user_id_and_school_id_kept"
```

Do **not** add `discarded_at` to `refresh_tokens`, `payments`, `webhook_events`.

## Indexes

- FK columns and columns used in `where` / `order` / `joins`.
- Unique indexes for model uniqueness — partial when Discard is involved.
- Name long or partial indexes explicitly.

## Reversibility and safety

- Prefer `def change` with reversible DSL.
- Use `up`/`down` when data backfills or irreversible steps are required.
- One concern per migration.

## Zero-downtime (production)

1. Add column nullable (or without unique index).
2. Backfill in a migration or background job.
3. New migration: `change_column_null`, `add_index ... unique: true`.

For concurrent indexes on large tables:

```ruby
disable_ddl_transaction!
def change
  add_index :users, :email, algorithm: :concurrently
end
```

## Example

```ruby
class CreateStudents < ActiveRecord::Migration[8.1]
  def change
    create_table :students do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.string :status, null: false, default: "active"
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }
      t.timestamps
    end

    add_index :students, [:school_id, :status]
  end
end
```

## Checklist

- [ ] DBML updated before migration
- [ ] `school_id` on tenant tables (correct nullability)
- [ ] `foreign_key: true` on references
- [ ] String status columns (not integer enums)
- [ ] `discarded_at` (+ partial uniques) where DBML uses Discard
- [ ] Indexes for FKs and common query paths
- [ ] Migration reversible or documents why not

## Delegation

- Model validations/associations → implement after migration (or **rails-implementer**)
- Business logic → **service-agent**
