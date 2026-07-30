# Multi-Tenancy

Data isolation conventions for `web/`. Complements `docs/web-stack.md` §5,
`docs/api/README.md` (multi-school context), and LGPD requirements in
`docs/open-questions.md`.

Rule: `.cursor/rules/web/multi-tenancy.mdc`. Related: `policies`, `controllers`, `models`.

## Tenancy model

School Lab uses **shared database, row-level isolation** via `school_id`:

| Layer | Mechanism |
|-------|-----------|
| URL | `/api/v1/schools/:school_id/...` for tenant-scoped resources |
| Request context | `Current.school`, `Current.membership` set after JWT auth |
| Queries | `policy_scope` or explicit `school_id` on scoped relations |
| Authorization | Pundit policies + services that receive `school:` keyword |
| Family (guardian) | `.../me/...` routes + policies scoped to guardian's children |

Global endpoints (no `school_id` in path): `auth/*`, `GET /me`, backoffice `schools`.

## Current attributes

Set in API base controller after authentication:

| Attribute | Source |
|-----------|--------|
| `Current.user` | JWT subject |
| `Current.school` | `:school_id` path param + membership validation |
| `Current.membership` | Active membership for user + school |

Services receive `school:` and `actor:` (user/membership) as keywords — never load tenant
data from raw IDs without scoping through school or policy.

```ruby
# Good — controller already validated membership
Billing::CreateCharge.call(school: Current.school, actor: Current.user, params:)

# Bad — ID from params without tenant scope
Charge.find(params[:id])
```

## Database rules

- Every table belonging to a school carries `school_id` **directly** (`null: false` unless
  documented), even when reachable via a parent FK (e.g. `charges.school_id` in addition to
  `charges.contract_id`) — denormalized so tenant queries never need to join through the
  parent chain.
- **Foreign keys** enforce referential integrity at DB level.
- Polymorphic rows that belong to a school still carry `school_id` (e.g. `documents`).
- Composite indexes for common filters: `[:school_id, :status]`, `[:school_id, :due_date]`.
- **Integer primary keys** (bigint) — no UUID requirement unless an anchor doc mandates it.

Intentional exceptions — do not add `school_id` here: `users`, `refresh_tokens` (cross-school
by design, see `docs/modeling/002-api-auth.md`), `webhook_events` (raw PSP ingress log, not a
domain entity), `audits` (uses polymorphic `associated_*` instead — see `auditing.md`).

See `docs/guidelines/web/migrations.md` for migration patterns.

## Query scoping

- **No `default_scope` for tenancy** — scope explicitly in policies, services, and scopes.
- Prefer `policy_scope(Model)` in controllers for lists.
- Model scopes (`for_school`, `kept`) are reusable filters; authorization still runs in Pundit.
- Negative state: `where.missing(:association)` (e.g. records not yet linked).
- Enable `strict_loading` in development where practical to catch N+1 and unscoped lazy loads.

### Query objects

School Lab does **not** use a separate `app/queries/` layer by default. Reusable filters
live in **model scopes**; complex list/filter orchestration lives in **services** or
`policy_scope`. Extract a dedicated query object only on the **third stable case** with
identical structure (same rule as other abstractions in `design-principles.md`).

## Per-family isolation (guardians)

A guardian must never see another family's messages, charges, or student records.

| Enforcement | Where |
|-------------|-------|
| Routes | `/api/v1/schools/:school_id/me/...` |
| Policies | Scope limited to guardian's `student_guardians` links |
| Services | Receive scoped records from controller; no cross-family lookups |

Treat cross-family access like cross-school: return `404`, not `403`, when existence must
not leak.

## Background jobs

Jobs do not have HTTP context. Pass **IDs** and restore tenant context at perform time:

```ruby
class Billing::IssueBoletoJob < ApplicationJob
  def perform(charge_id, school_id)
    school = School.find(school_id)
    charge = school.charges.find(charge_id)
    Billing::IssueBoleto.call(school: school, charge: charge)
  end
end
```

- Pass `school_id` (and record IDs) — not full ActiveRecord objects across serialization.
- Re-scope finds through `school.charges.find(id)` — never global `Charge.find(id)`.
- Idempotent jobs: safe to retry without duplicating side effects.

## Testing

Every tenant-scoped feature needs isolation examples:

1. **Cross-school** — user with membership in school A cannot read/update school B records.
2. **Cross-family** — guardian A cannot see guardian B's children or charges.
3. **Backoffice** — only when policy explicitly allows cross-school access.

Request specs and policy specs are the primary enforcement tests. See `testing.md`.

## What we do not adopt

From alternative Rails tenancy patterns (e.g. 37signals-style):

- No reliance on app-only integrity without FK constraints — we use `foreign_key: true`.
- No implicit tenancy via `default_scope` on `school_id`.
- No fat-model tenancy helpers that bypass Pundit.
