# Data Model — Identity & Permissions (003)

> PRD: [`docs/prds/identity-and-onboarding/permissions.md`](../prds/identity-and-onboarding/permissions.md)  
> Parent: [`docs/prds/identity-and-onboarding/index.md`](../prds/identity-and-onboarding/index.md)  
> Executable schema: [`docs/database/schema.dbml`](../database/schema.dbml) · DER: `der_003.png` (TBD)

Narrative DSL for the permissions engine. Authoritative columns for migrations are in DBML.

## Entity groups

### Identity (extended)

| Table | Role |
|-------|------|
| `memberships` | User ↔ school; `role` enum includes `staff` (migrated from `school`) |
| `school_role_templates` | Per-school role templates (system + custom) |
| `role_template_permissions` | Permission keys per template with `scope_kind` |
| `staff_profiles` | One-to-one with staff/teacher memberships — template link, owner flag, segment, title |
| `membership_permissions` | Per-membership overrides only (`effect`: grant \| deny) |
| `segments` | Optional school education segment (MVP: id + name; stub allowed — D6) |

### Unchanged from 001

`users`, `refresh_tokens`, `device_tokens`, `guardians`, `students` — see
[`001-fintech-first.md`](001-fintech-first.md).

### Permission catalog (code registry — MVP)

Not a database table. `SchoolLab::Permissions::CATALOG` and `SYSTEM_TEMPLATES` in code feed:

- `GET permission_definitions` API
- `ProvisionSystemRoleTemplatesService` (new schools)
- UC-P04 data migration (existing schools)

## school_role_templates

| Column | Type | Notes |
|--------|------|-------|
| `school_id` | FK | Tenant scope |
| `name` | varchar | UI label (pt-BR in product) |
| `system_key` | varchar nullable | `director` \| `secretary` \| `coordination` \| `teacher` for system templates |
| `is_system` | boolean | `true` for provisioned defaults; not deletable |

Unique `(school_id, system_key)` among kept rows where `system_key` is not null.

## role_template_permissions

| Column | Type | Notes |
|--------|------|-------|
| `role_template_id` | FK | |
| `school_id` | FK | Denormalized for tenant queries |
| `permission_key` | varchar | Fixed enum in code |
| `scope_kind` | varchar | `full` \| `segment` \| `partial` |

Unique `(role_template_id, permission_key)` among kept rows.

## staff_profiles

| Column | Type | Notes |
|--------|------|-------|
| `membership_id` | FK | Unique among kept rows — one profile per membership |
| `role_template_id` | FK | Assigned template — pointer; edits propagate at runtime |
| `is_owner` | boolean | At most one `true` per school (app validation + partial unique index TBD) |
| `segment_id` | FK nullable | Scope for partial/segment permissions |
| `display_title` | varchar | Cosmetic UI label (pt-BR) |
| `also_teaches` | boolean | Coordination-style template: enables `teach` when true |

Partial unique: one kept `is_owner = true` per `school_id` (denormalized `school_id` on profile).

## membership_permissions

Overrides only — not a snapshot of effective permissions.

| Column | Type | Notes |
|--------|------|-------|
| `membership_id` | FK | |
| `permission_key` | varchar | Fixed enum in code |
| `effect` | varchar | `grant` \| `deny` |
| `school_id` | FK | Denormalized for tenant queries |

Unique `(membership_id, permission_key)` among kept rows (one override row per key).

## segments (MVP minimum)

| Column | Type | Notes |
|--------|------|-------|
| `school_id` | FK | |
| `name` | varchar | E.g. "Educação Infantil", "Fundamental I" |
| `discarded_at` | timestamp | Discard |

Deferred: curriculum linkage, class assignment rules — academic PRD.

## Permission resolution

```
effective_permissions(membership) =
  if membership.role == guardian → role-based guardian rules
  if membership.role == backoffice → platform rules
  if staff_profiles.is_owner → all staff catalog keys (teach per BR-P04, BR-P17)
  else role_template_permissions(role_template_id)
         ∪ membership_permissions where effect == grant
         − membership_permissions where effect == deny
```

Computed at runtime on every policy check and `GET /me` — no snapshot on membership.

Scope:

- `partial` / `segment` on `role_template_permissions` filter queries by
  `staff_profiles.segment_id` or class assignments within segment.
- Teacher role always intersects with class assignment scope.

## System template provisioning

| Scenario | Mechanism |
|----------|-----------|
| Existing schools | `rake permissions:migrate_memberships` (UC-P04, idempotent) |
| New schools | `Identity::ProvisionSystemRoleTemplatesService` on school create (UC-P04b) |
| Local dev | Seeds call provisioning service — not inline template data |

## Role migration (D1)

1. Deploy code accepting both `school` and `staff` (read path).
2. Provision system role templates per school (UC-P04).
3. Backfill `staff_profiles` with `role_template_id` for existing `school` memberships.
4. Migrate `memberships.role` to `staff`.
5. Remove `school` from API enums and policies.

## Multi-tenancy

`school_role_templates.school_id`, `role_template_permissions.school_id`,
`staff_profiles.school_id`, `membership_permissions.school_id`, `segments.school_id` —
denormalized for policy scopes.

## LGPD

- `display_title` and template `name` may contain personal names — treat as personal data.
- Permission audit rows may log actor email in `audits` — retention TBD.
- No new sensitive health fields in this domain.

## Auth model

JWT payload unchanged — no permission list in token. `GET /me` computes permissions per
request (or short-lived cache in SPA). See [`002-api-auth.md`](002-api-auth.md).

## Tables without Discard

`membership_permissions` — use Discard (`discarded_at`) on revoke; cascade discard with membership discard.

## Relationship to onboarding (004)

Onboarding provisions system templates on school create, then creates memberships with
`role_template_id` and optional `segment_id` on `staff_profiles` at invite time. Onboarding
columns on `schools` are not read by permission resolution.
