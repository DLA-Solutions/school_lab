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
| `staff_profiles` | One-to-one with staff/teacher memberships — preset, owner flag, segment, title |
| `membership_permissions` | Explicit permission grants beyond preset defaults |
| `segments` | Optional school education segment (MVP: id + name; stub allowed — D6) |

### Unchanged from 001

`users`, `refresh_tokens`, `device_tokens`, `guardians`, `students` — see
[`001-fintech-first.md`](001-fintech-first.md).

## staff_profiles

| Column | Type | Notes |
|--------|------|-------|
| `membership_id` | FK | Unique among kept rows — one profile per membership |
| `preset_key` | varchar | `director` \| `secretary` \| `coordination` \| `teacher` |
| `is_owner` | boolean | At most one `true` per school (app validation + partial unique index TBD) |
| `segment_id` | FK nullable | Scope for partial permissions |
| `display_title` | varchar | Cosmetic UI label (pt-BR) |
| `also_teaches` | boolean | Coordination preset: enables `teach` permission |

Partial unique: one kept `is_owner = true` per `school_id` (via membership join or
denormalized `school_id` on profile — **prefer denormalized `school_id`** for index simplicity).

## membership_permissions

| Column | Type | Notes |
|--------|------|-------|
| `membership_id` | FK | |
| `permission_key` | varchar | Fixed enum in code |
| `school_id` | FK | Denormalized for tenant queries |

Unique `(membership_id, permission_key)` among kept rows.

Alternative: JSONB `permission_overrides` on `staff_profiles` — choose one in implementation;
DBML documents relational table for clarity.

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
  if staff_profiles.is_owner → all staff permission keys
  else preset_defaults(preset_key) ∪ membership_permissions
```

Scope:

- `partial` / `segment` permissions filter queries by `staff_profiles.segment_id` or class
  assignments within segment.
- Teacher role always intersects with class assignment scope.

## Role migration (D1)

1. Deploy code accepting both `school` and `staff` (read path).
2. Backfill `staff_profiles` for existing `school` memberships.
3. Migrate `memberships.role` to `staff`.
4. Remove `school` from API enums and policies.

## Multi-tenancy

`staff_profiles.school_id`, `membership_permissions.school_id`, `segments.school_id` —
denormalized from membership for policy scopes.

## LGPD

- `display_title` may contain personal names — treat as personal data.
- Permission audit rows may log actor email in `audits` — retention TBD.
- No new sensitive health fields in this domain.

## Auth model

JWT payload unchanged — no permission list in token. `GET /me` computes permissions per
request (or short-lived cache in SPA). See [`002-api-auth.md`](002-api-auth.md).

## Tables without Discard

`membership_permissions` — hard delete on membership discard or cascade discard with membership.

## Relationship to onboarding (004)

Onboarding creates memberships and sets `preset_key` / `segment_id` on `staff_profiles` at invite
time. Onboarding columns on `schools` are not read by permission resolution.
