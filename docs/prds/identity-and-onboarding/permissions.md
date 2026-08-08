# PRD — Identity: Permissions Engine (BC1)

> Status: draft  
> Parent PRD: [`index.md`](index.md)  
> Related BC: [`onboarding.md`](onboarding.md)  
> Modeling: [`docs/modeling/003-identity-permissions.md`](../../modeling/003-identity-permissions.md)  
> API narrative: [`docs/api/v1/identity-onboarding.md`](../../api/v1/identity-onboarding.md)  
> Supersedes: `docs/prds/fintech-first.md` § Permissions (partial); see parent integration contract.

---

## Objective

Replace the binary `school_staff?` authorization check with a **permissions engine** built on
fixed membership roles, versioned permission keys, staff presets, and optional segment scope —
so Direção, Secretaria, Coordenação, and Professor capabilities are enforced consistently
across billing, people, documents, and future academic domains.

---

## Context

The fintech-first slice shipped with four membership roles (`backoffice`, `school`, `teacher`,
`guardian`) and a single school-admin gate in `ApplicationPolicy#school_staff?`. Real schools
operate with distinct staff functions (see [`docs/main-menu-description.md`](../../main-menu-description.md)):
Direção, Secretaria, Coordenação, and Professor share the same surface but need different
capabilities.

**Current code gaps**

| Area | Today | Target |
|------|-------|--------|
| `memberships.role` | `school` for all staff admins | Rename to `staff`; presets carry function |
| `CreateMembershipService` | Random password, no real invite | Onboarding BC owns token + set-password flow |
| Policies | `school_staff?` boolean | `staff_with?(:permission_key)` |
| `GET /me` | role + status only | `permissions[]`, `preset_key`, `is_owner`, `segment_id` |

**Decision D1 — role rename:** `school` → `staff` in code and API. UI remains "Escola" for the
tenant and "Equipe" for staff users (`docs/glossary.md`). Migration path documented in UC-P04.

**Decision D2 — presets:** `director`, `secretary`, `coordination`, `teacher` (not separate
membership roles).

**Decision D3 — coordinating teacher:** `role: teacher` membership plus coordination preset
permissions (or `staff` role with coordination preset when not teaching — product default:
teacher role + extra permissions).

**Integration contract (with onboarding BC)**

- Onboarding assigns `preset_key` and optional `segment_id` when creating invites.
- This engine resolves effective permissions; it does **not** know `onboarding_mode` or
  `onboarding_status`.
- Backoffice provisioning uses platform permission `provision_school`, not a staff membership.

---

## Business Rules

BR-P01

`memberships.role` ∈ `backoffice | staff | teacher | guardian`. The value `school` is
deprecated and migrated to `staff` (D1).

BR-P02

Permission keys are a **fixed enum versioned in code** — schools cannot invent custom keys.
Initial keys: `manage_school_settings`, `manage_billing`, `manage_people`, `manage_enrollment`,
`manage_documents`, `approve_lesson_plans`, `moderate_messages`, `teach`, `view_billing_summary`.

BR-P03

A **preset** (`preset_key`) expands to a default list of permission keys plus default scope
rules. Presets: `director`, `secretary`, `coordination`, `teacher`.

BR-P04

Exactly one active `staff_profiles.is_owner = true` per school (kept memberships). The owner
receives all **staff** preset permission keys (see preset matrix), excluding `teach` unless the
membership `role` is `teacher` or an explicit grant adds it — regardless of preset overrides.
Transfer of ownership is phase 1.1.

BR-P05

Policies for school-scoped resources call `staff_with?(:permission_key)` (or equivalent helper)
instead of `school_staff?`. Guardian and teacher class-scoped policies are unchanged in
principle but may consult permission lists where staff and teacher overlap.

BR-P06

Teacher membership policies remain **class/subject scoped**. Extra coordination permissions on
a `teacher` membership do not expand data access beyond assigned classes unless
`segment_id` or explicit class assignment grants broader scope.

BR-P07

Guardian authorization is unchanged — family scope via `student_guardians` and
`guardians.user_id`. Permission keys do not apply to guardian memberships.

BR-P08

Backoffice users do not receive staff memberships for provisioning. Platform action
`provision_school` is granted only while `school.onboarding_status == provisioning` (see
onboarding PRD). Outside provisioning, backoffice uses tenant CRUD only.

BR-P09

Changes to individual permission grants (`membership_permissions` rows or JSONB overrides) are
audited via the `audited` gem with `associated_with: :school`.

BR-P10

`GET /api/v1/me` returns, for each active or invited membership: `role`, `status`,
`preset_key`, `permissions[]`, `is_owner`, `segment_id`, `display_title`.

BR-P11

Preset assignment is required when creating a `staff` or `teacher` membership (except
backoffice and guardian). Missing `preset_key` returns `422 validation_error`.

BR-P12

`manage_people` with **partial** scope (coordination preset) limits create/update/list to
students and guardians linked to the member's `segment_id` (or assigned classes within that
segment when segments are stubbed).

BR-P13

`secretary` preset may optionally include `manage_billing` and/or `view_billing_summary`
independently (owner toggles in phase 1.1; defaults in preset matrix below).

BR-P14

`display_title` on `staff_profiles` is cosmetic (UI pt-BR: "Secretária", "Coordenadora") and
does not drive authorization.

BR-P15

Suspended or invited memberships do not receive effective permissions for school routes;
auth middleware already blocks `invited` and `suspended` per `002-api-auth.md`.

BR-P16

Effective permissions = preset defaults ∪ explicit `membership_permissions` grants − explicit
denies (denies reserved for phase 1.1; MVP uses grants only).

BR-P17

`teach` permission requires `memberships.role == teacher` OR `staff` with explicit `teach`
grant and class assignments (coordination preset: `teach` only when `also_teaches` flag set).

BR-P18

Platform permission `provision_school` is checked on backoffice JWT context without
`school_id` in path, gated by `school.onboarding_status`.

---

## Preset × permission matrix

| Permission | director | secretary | coordination | teacher |
|------------|:--------:|:---------:|:------------:|:-------:|
| `manage_school_settings` | ✓ | — | — | — |
| `manage_billing` | ✓ | opt | — | — |
| `manage_people` | ✓ | ✓ | partial | — |
| `manage_enrollment` | ✓ | ✓ | — | — |
| `manage_documents` | ✓ | ✓ | segment | — |
| `approve_lesson_plans` | ✓ | — | ✓ | — |
| `moderate_messages` | ✓ | — | ✓ | — |
| `teach` | — | — | if teaches | ✓ |
| `view_billing_summary` | ✓ | opt | — | — |

**Legend:** ✓ = included by default; opt = optional grant by owner (phase 1.1); partial =
segment-scoped `manage_people`; segment = `manage_documents` limited to `segment_id`; if teaches
= coordination preset with `also_teaches: true`.

---

## Use Cases

### UC-P01 — Assign preset on membership create

Input: actor with `manage_people`, `email`, `role` (`staff` | `teacher`), `preset_key`,
optional `segment_id`, `display_title`.

Flow:

1. Validate preset is allowed for role (`teacher` preset requires `role: teacher`).
2. Create `memberships` row `status: invited`.
3. Create `staff_profiles` with `preset_key`, `segment_id`, `display_title`, `is_owner: false`
   (unless onboarding marks owner — see onboarding PRD BR-O09).
4. Materialize preset permissions into `membership_permissions` (or JSONB snapshot).
5. Enqueue invite notification (onboarding BC).
6. Emit `PermissionPresetAssigned`.

### UC-P02 — Owner adjusts individual permissions (phase 1.1, wave W5)

Input: owner (`is_owner: true`), `membership_id`, `permissions[]` delta.

Flow:

1. Authorize `manage_people` + owner-only gate for permission edits.
2. Update `membership_permissions` within allowed key enum.
3. Audit change.
4. Emit `StaffPermissionsUpdated`.

### UC-P03 — Resolve effective permissions for policy check

Input: `Current.membership`, requested `permission_key`, optional resource for scope check.

Flow:

1. If guardian or backoffice (non-provisioning), use existing role rules.
2. If staff/teacher: load `staff_profile`, expand preset + grants.
3. If owner, short-circuit to full staff permission set.
4. Apply segment/class scope when permission is partial.
5. Return allow/deny to Pundit.

### UC-P04 — Migrate existing `school` memberships to `staff` + director preset

Input: deployment migration task.

Flow:

1. `UPDATE memberships SET role = 'staff' WHERE role = 'school'`.
2. For each school with migrated memberships, set `is_owner: true` on exactly one row:
   the **earliest kept** `school` membership by `memberships.created_at` (tie-break: lowest
   `memberships.id`). All other migrated memberships get `is_owner: false` with
   `preset_key: director`. Schools with no kept `school` membership are logged for manual
   review; schools where multiple memberships share the same `created_at` are logged and
   resolved by lowest `id` only (no duplicate owners).
3. Backfill `membership_permissions` from director preset.
4. Update policies from `school_staff?` to `staff_with?`.
5. Update API serializers and OpenAPI role enum.

---

## API

Auth contract: [`docs/modeling/002-api-auth.md`](../../modeling/002-api-auth.md).  
Full narrative: [`docs/api/v1/identity-onboarding.md`](../../api/v1/identity-onboarding.md).

### `POST /api/v1/schools/:school_id/people/memberships`

Extended request (wave W1/W2):

```json
{
  "email": "secretaria@escola.example",
  "role": "staff",
  "preset_key": "secretary",
  "segment_id": null,
  "display_title": "Secretária"
}
```

Response `201`: membership + `staff_profile` summary.

### `PATCH /api/v1/schools/:school_id/people/memberships/:id/permissions` (wave W5)

Request:

```json
{
  "permissions": ["manage_billing", "view_billing_summary"]
}
```

Only owner may call. Returns updated effective permission list.

### `GET /api/v1/me` (extended)

```json
{
  "data": {
    "id": 1,
    "email": "diretor@escola.example",
    "memberships": [
      {
        "id": 10,
        "school_id": 42,
        "role": "staff",
        "status": "active",
        "preset_key": "director",
        "is_owner": true,
        "segment_id": null,
        "display_title": "Diretor",
        "permissions": [
          "manage_school_settings",
          "manage_billing",
          "manage_people",
          "manage_enrollment",
          "manage_documents",
          "approve_lesson_plans",
          "moderate_messages",
          "view_billing_summary"
        ]
      }
    ]
  }
}
```

---

## Errors

Standard envelope per `docs/api/README.md`.

| HTTP | `error.code` | When |
|------|--------------|------|
| `403` | `forbidden` | Missing permission for action |
| `404` | `not_found` | Cross-school membership |
| `422` | `validation_error` | Invalid `preset_key`, role/preset mismatch |
| `409` | `invalid_state_transition` | Permission edit on suspended membership |

---

## Database

Do not duplicate full table definitions here.

| Artifact | Location |
|----------|----------|
| Narrative DSL | [`docs/modeling/003-identity-permissions.md`](../../modeling/003-identity-permissions.md) |
| Executable schema | [`docs/database/schema.dbml`](../../database/schema.dbml) |
| DER export | `docs/database/der_003.png` (TBD — export after DBML review) |

**Entity groups**

| Table | Purpose |
|-------|---------|
| `staff_profiles` | One per staff/teacher membership: `preset_key`, `segment_id`, `display_title`, `is_owner`, `also_teaches` |
| `membership_permissions` | Explicit grants (`membership_id`, `permission_key`) — optional if JSONB on profile |
| `segments` | School education segment (MVP: stub or minimal — D6) |
| `memberships` | `role` enum: `school` → `staff` migration |

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `PermissionPresetAssigned` | Membership create with preset | Audit, onboarding notifications |
| `StaffPermissionsUpdated` | UC-P02 permission patch | Audit, cache invalidation (future) |
| `MembershipRoleMigrated` | UC-P04 data migration | Ops logging |

---

## Permissions

Resource × effective permission (staff presets). Backoffice and guardian columns unchanged
from fintech-first except `school` → `staff`.

| Resource / action | backoffice | staff (preset) | teacher | guardian |
|-------------------|:----------:|:--------------:|:-------:|:--------:|
| `schools` CRUD | ✓ | — | — | — |
| `people/memberships` create | — | `manage_people` | — | — |
| `people/memberships` permissions patch | — | owner only | — | — |
| `billing/*` | — | `manage_billing` | — | — |
| `billing/summary` read | — | `view_billing_summary` | — | — |
| `documents` write/review | — | `manage_documents` (scope) | — | — |
| `lesson_plans` approve | — | `approve_lesson_plans` | — | — |
| Messages moderate | — | `moderate_messages` | — | — |
| Class teaching actions | — | `teach` if granted | `teach` | — |
| `auth/*`, `GET /me` | ✓ | ✓ | ✓ | ✓ |
| Provisioning (onboarding) | `provision_school` | — | — | — |

Teacher rows use class assignment scope in addition to permission keys. Guardian policies
unchanged (family scope).

---

## Acceptance Criteria

### Wave W1 — Permissions model and `GET /me`

```gherkin
Feature: Staff preset on membership
  Given a school with an active owner (director preset, is_owner true)
  When the owner POSTs /people/memberships with role staff and preset_key secretary
  Then the membership is created with status invited
  And staff_profiles.preset_key is secretary
  And membership_permissions match the secretary preset defaults

Feature: GET /me exposes permissions
  Given a user with active staff membership and director preset
  When they GET /api/v1/me
  Then the membership includes preset_key director, is_owner true
  And permissions includes manage_billing and manage_people
```

### Wave W5 — Individual permission adjustment (phase 1.1)

```gherkin
Feature: Owner grants optional billing to secretary
  Given a secretary membership without manage_billing
  And an owner on the same school
  When the owner PATCHes /people/memberships/:id/permissions with manage_billing
  Then the secretary can POST /billing/charges
  And an audit row is created for the permission change

Feature: Non-owner cannot patch permissions
  Given a secretary membership
  And another staff member without is_owner
  When they PATCH /people/memberships/:id/permissions
  Then the response is 403 forbidden
```

---

## Out of Scope

- Visual permission editor UI (phase 1.1 / wave W5 — API in W5, UI deferred).
- Custom per-school permission key definitions.
- `coordinator` as a separate `memberships.role` enum value (use preset — D2).
- Guardian permission keys (family scope remains role-based).
- Impersonation / "login as school" for support (future PRD).
