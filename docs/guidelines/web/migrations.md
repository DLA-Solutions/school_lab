# Migrations (ActiveRecord)

Conventions for `web/db/migrate/`. Executable schema source of truth: `docs/database/schema.dbml`
(DBML). Narrative context: `docs/modeling/`.

Rule: `.cursor/rules/web/migrations.mdc`. Related: [`models.md`](models.md), [`auditing.md`](auditing.md). Publish: skill `publish-dbdocs`, rule `dbdocs`.

## Workflow

1. Update DBML when a PRD adds or changes entities.
2. Generate migration: `bin/rails generate migration ...` (or hand-write for clarity).
3. Mirror DBML types, nullability, defaults, indexes, and `Ref:` relationships.
4. Run `bin/rails db:migrate` locally; commit migration + `schema.rb`.
5. Publish dbdocs: `.cursor/scripts/publish-dbdocs.sh` (skill `publish-dbdocs`).
6. Generate the model: `bin/rails generate model ... --skip-migration` (see [`models.md`](models.md)).

Never modify a migration that has already run — create a new migration instead.

## Primary keys and columns

| Convention | Detail |
|------------|--------|
| Primary key | Integer `bigint` (Rails default) — matches current DBML |
| Timestamps | `t.timestamps` on every domain table |
| Status / enums | `t.string` — values match API and AASM (`active`, `pending`, …) |
| Required fields | `null: false` in migration + presence validation in model |
| Defaults | Set at DB level when DBML specifies (`default: 'active'`) |

## Multi-tenancy (`school_id`)

- Every table belonging to a school carries `school_id` directly, with `null: false` unless
  documented otherwise (e.g. `memberships.school_id` nullable for platform backoffice) — even
  when the row is also reachable via a parent FK (e.g. `contracts.school_id` alongside
  `contracts.student_id`). Do not rely on joining through the parent chain for tenant scoping.
- Polymorphic records that belong to a school still carry `school_id` for isolation
  (`documents`).
- Add composite indexes for list/filter patterns: `[:school_id, :status]`, `[:school_id, :due_date]`.
- Exceptions (no `school_id` column): `users`, `refresh_tokens`, `webhook_events`, `audits`
  (see `docs/guidelines/web/multi-tenancy.md`).

```ruby
t.references :school, null: false, foreign_key: true
add_index :guardians, [:school_id, :discarded_at]
```

## Foreign keys

School Lab **uses** database foreign keys — unlike stacks that omit them for flexibility.

```ruby
t.references :student, null: false, foreign_key: true
t.references :discarded_by, foreign_key: { to_table: :users }
```

- Every `belongs_to` in the model should have a matching FK in the migration (or be documented
  as intentionally optional).
- Index FK columns even when `references` adds one by default if you rely on composite indexes.

## Soft delete (Discard)

Add `discarded_at` (nullable `datetime`) on domain tables per DBML. Optional actor tracking:

```ruby
t.references :discarded_by, foreign_key: { to_table: :users }
```

**Partial unique indexes** — uniqueness applies only to kept rows:

```ruby
add_index :memberships, [:user_id, :school_id],
  unique: true,
  where: "discarded_at IS NULL",
  name: "index_memberships_on_user_id_and_school_id_kept"
```

Model validations must use matching `conditions: -> { kept }`.

**Do not** add Discard columns to:

- `refresh_tokens` (use `revoked_at`)
- `payments`, `webhook_events` (immutable / ingress logs — hard delete after retention)

## Indexes

- FK columns and columns used in `where` / `order` / `joins`.
- Unique indexes for `validates :x, uniqueness:` — partial when Discard is involved.
- Name long or partial indexes explicitly (`name: "..."`).
- Audit table indexes follow the `audited` gem migration pattern.

## Reversibility

- Prefer `def change` with reversible DSL (`create_table`, `add_reference`, `add_index`).
- Use `up`/`down` when data backfills or irreversible steps are required.
- One concern per migration (create table, add column, backfill, add constraint).

## Zero-downtime (production)

When a column must become `NOT NULL` or gain a unique constraint on live data:

1. Add column nullable (or without unique index).
2. Backfill in a migration or background job.
3. New migration: `change_column_null`, `add_index ... unique: true`.

## Auditing table

The `audits` table is managed by the **audited** gem — follow `docs/guidelines/web/auditing.md`.
Do not treat it as a domain entity.

## Checklist

- [ ] DBML updated before migration
- [ ] `school_id` on tenant tables (with correct nullability)
- [ ] `foreign_key: true` on references
- [ ] `null: false` / defaults match DBML
- [ ] String status columns (not integer enums)
- [ ] `discarded_at` (+ partial uniques) where DBML uses Discard
- [ ] Indexes for FKs and common query paths
- [ ] Migration is reversible or documents why not
