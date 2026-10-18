# PRD — Identity: Permissions Engine (BC1)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `identity.manage_roles`, `identity.manage_user_accounts`  
> Related BC: [`onboarding.md`](onboarding.md)  
> Modeling: [`docs/modeling/003-identity-permissions.md`](../../modeling/003-identity-permissions.md)  
> API narrative: [`docs/api/v1/identity-onboarding.md`](../../api/v1/identity-onboarding.md)  
> Supersedes: `docs/prds/fintech-first.md` § Permissions (partial); see parent integration contract.

---

## Objective

Replace the binary `school_staff?` authorization check with a **permissions engine** built on
fixed membership roles, versioned permission keys, **school-managed role templates** (Level A),
per-membership **overrides**, and optional segment scope — so Direção, Secretaria, Coordenação,
Professor, and school-specific roles (e.g. receptionist) are enforced consistently across
billing, people, documents, and future academic domains.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Manage roles and permissions | `identity.manage_roles` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md), [`classapp/gestao-academica/funcionalidades-por-ator.md`](../../ref/classapp/gestao-academica/funcionalidades-por-ator.md), [`parity-matrix.md`](../../product/parity-matrix.md#identity--onboarding) |
| Manage user accounts | `identity.manage_user_accounts` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) (activate/deactivate users) |

School Lab decision: system + custom **role templates** with permission keys and per-membership
overrides — not competitor menu-only or master-user patterns alone. See parent
[`index.md`](index.md) § Competitive grounding for capabilities covered in other slices.

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Same permission catalog; segment scope on `manage_people` when segments enabled (D6) |
| `fundamental_medio` | yes | System templates map to Direção, Secretaria, Coordenação, Professor |
| `pj_financeiro` | partial | Billing permission keys on templates; no PJ-specific role enum |
| `multi_unidade` | partial | Templates provisioned per school; no cross-school template sharing |

---

## Context

The fintech-first slice shipped with four membership roles (`backoffice`, `school`, `teacher`,
`guardian`) and a single school-admin gate in `ApplicationPolicy#school_staff?`. Real schools
operate with distinct staff functions (see [`docs/main-menu-description.md`](../../main-menu-description.md)):
Direção, Secretaria, Coordenação, and Professor share the same surface but need different
capabilities — and often need **custom roles** built from the same permission catalog.

**Current code gaps**

| Area | Today | Target |
|------|-------|--------|
| `memberships.role` | `school` for all staff admins | Rename to `staff`; role templates carry function |
| `CreateMembershipService` | Random password, no real invite | Onboarding BC owns token + set-password flow |
| Policies | `school_staff?` boolean | `staff_with?(:permission_key)` |
| `GET /me` | role + status only | `permissions[]`, `role_template`, `is_owner`, `segment_id` |
| Staff roles | All-or-nothing admin | CRUD `role_templates` per school + per-person overrides |

**Decision D1 — role rename:** `school` → `staff` in code and API. UI remains "Escola" for the
tenant and "Equipe" for staff users (`docs/glossary.md`). Migration path documented in UC-P04.

**Decision D2 — role templates (Level A):** `director`, `secretary`, `coordination`, `teacher` are
**system templates** (`system_key`, `is_system: true`) provisioned per school — not a hardcoded
enum on `staff_profiles`. Schools may create **custom templates** (e.g. "Receptionist") by
combining keys from the platform catalog. API uses `role_template_id`, not `preset_key`.

**Decision D3 — coordinating teacher:** `role: teacher` membership plus coordination system
template (or `staff` role with coordination template when not teaching — product default:
teacher role + extra permissions).

**Decision PD-1 — propagation:** `staff_profiles.role_template_id` is a **pointer**. Template
edits **propagate immediately** at runtime (recomputed per request). Overrides are stored
separately and never silently dropped.

**Decision PD-2 — overrides only on membership:** Template permissions live in
`role_template_permissions`. `membership_permissions` stores **overrides only** (`effect`:
`grant` | `deny`) — not a full snapshot of effective permissions.

**System template provisioning (not `db/seeds`)**

| Scenario | Mechanism |
|----------|-----------|
| Existing schools (backfill) | Idempotent data migration / rake (UC-P04) |
| New schools | `Identity::ProvisionSystemRoleTemplatesService` on school create (UC-P04b) |
| Local dev / demo | Seeds may call the same service — never duplicate template logic inline |

Defaults live in a single code registry (`SchoolLab::Permissions::SYSTEM_TEMPLATES`) consumed
by migration, provisioning service, and `GET permission_definitions`.

**Integration contract (with onboarding BC)** — onboarding D4–D5 in [`index.md`](index.md):

- Onboarding assigns `role_template_id` and optional `segment_id` when creating invites.
- School create provisions four system templates before first staff invite.
- This engine resolves effective permissions; it does **not** know `onboarding_mode` or
  `onboarding_status`.
- Backoffice provisioning uses platform permission `provision_school`, not a staff membership.

**Propagation risks and mitigations**

| Risk | Mitigation |
|------|------------|
| Accidental template edit affects many staff | `RoleTemplateUpdated` includes `affected_memberships_count`; audit row; PATCH response returns count (confirmation UX in layer SPA PRD) |
| SPA caches stale permissions | `GET /me` is source of truth; short TTL or re-fetch on navigation (layer PRD) |
| Owner edits system "Secretária" template | Per-school template rows — editing affects only that school |

**Alternatives considered (appendix)**

- **Snapshot on assign** — safer blast radius but contradicts pointer model; rejected for MVP.
- **Explicit "apply to N members"** — deferred unless partner feedback demands it.

---

## Business Rules

BR-P01 — `capability_id`: `identity.manage_roles`

`memberships.role` ∈ `backoffice | staff | teacher | guardian`. The value `school` is
deprecated and migrated to `staff` (D1).

A user may hold one kept membership per `(school_id, role)`, including separate staff/teacher and
guardian memberships in the same school. Duplicate memberships for the same role/school are
forbidden. Authorization evaluates exactly one request-selected membership and never unions
permissions or family access across roles.

BR-P02

Permission keys are a **fixed enum versioned in code** — schools cannot invent custom keys.
Initial keys: `manage_school_settings`, `manage_billing`, `manage_people`, `manage_enrollment`,
`manage_documents`, `manage_academic`, `manage_calendar`, `approve_lesson_plans`,
`moderate_messages`, `teach`, `view_billing_summary`. `manage_academic` is the staff key for
school-wide academic configuration, attendance review/override, grade launch/override, period
closure, and report-card publication. `manage_calendar` is the staff key for school-year holidays
and instructional days ([`platform-and-admin/school-year.md`](../platform-and-admin/school-year.md)
BR-SY05/BR-SY10) and institutional calendar events
([`platform-and-admin/calendar.md`](../platform-and-admin/calendar.md) BR-CA01/BR-CA03) — deliberately
broader than `manage_school_settings` (director/owner only) so coordenação and secretaria can keep
the calendar current `[product decision 2026-10-07]`.
Teacher write actions still require `teach` plus class/subject assignment; canonical capability ids
such as `academic.record_attendance` and `academic.enter_grades` are not permission keys. Catalog is
exposed read-only via `GET permission_definitions` (from code registry in MVP).

BR-P03 — `capability_id`: `identity.manage_roles`

Each school has `school_role_templates` rows. System templates (`is_system: true`,
`system_key` ∈ `director | secretary | coordination | teacher`) are provisioned per school via
migration (existing tenants) and `ProvisionSystemRoleTemplatesService` (new schools). Custom
templates have `is_system: false` and `system_key: null`. Permissions per template are stored in
`role_template_permissions` (`permission_key`, `scope_kind`: `full` | `segment` | `partial`).

BR-P04

Exactly one active `staff_profiles.is_owner = true` per school (kept memberships). The owner
receives all **staff** permission keys from the catalog, excluding `teach` unless the membership
`role` is `teacher`, `also_teaches` is true, or an explicit override grant adds it — regardless
of assigned template. Transfer of ownership is phase 1.1.

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

Changes to role templates and membership permission overrides are audited via the `audited` gem
with `associated_with: :school`.

BR-P10

`GET /api/v1/me` returns, for each active or invited membership: `role`, `status`,
`role_template` (`id`, `name`, `system_key`, `is_system`), `permissions[]`, optional
`permission_sources`, `is_owner`, `segment_id`, `display_title`.

BR-P11

`role_template_id` is required when creating a `staff` or `teacher` membership (except
backoffice and guardian). Missing or invalid `role_template_id` returns `422 validation_error`.
Template must belong to the same school.

BR-P12

`manage_people` with **partial** scope limits create/update/list to students and guardians
linked to the member's `segment_id` (or assigned classes within that segment when segments are
stubbed).

BR-P13

Optional `manage_billing` / `view_billing_summary` on secretary-equivalent templates are
configured on the **template** (system default or owner-edited template) or via **override**
on a specific membership — not a special platform flag.

BR-P14

`display_title` on `staff_profiles` is cosmetic (UI pt-BR: "Secretária", "Coordenadora") and
does not drive authorization.

BR-P15

Suspended or invited memberships do not receive effective permissions for school routes;
auth middleware already blocks `invited` and `suspended` per `002-api-auth.md`.

BR-P16

Effective permission keys (runtime, no snapshot):

```
if guardian → guardian rules
if backoffice → platform rules
if is_owner → all staff catalog keys (teach per BR-P04)
else role_template.permissions ∪ override_grants − override_denies
```

**Override precedence when template changes:**

| Template change | Override on member | Result |
|-----------------|-------------------|--------|
| Removes key X | none | Member loses X on next request |
| Removes key X | grant X | Member keeps X |
| Adds key Y | none | Member gains Y on next request |
| Adds key Y | deny Y | Member does not gain Y |

BR-P17

`teach` permission requires `memberships.role == teacher` OR `staff` with explicit `teach`
grant/override and class assignments (coordination template: `teach` only when `also_teaches`
flag set).

BR-P18

Platform permission `provision_school` is checked on backoffice JWT context without
`school_id` in path, gated by `school.onboarding_status`.

BR-P19

Only `is_owner` may create, update, or delete custom role templates. Listing templates and
reading `permission_definitions` requires `manage_people`.

BR-P20

System templates (`is_system: true`) may be edited but **not deleted**. Custom templates may be
deleted only when zero kept memberships reference them (`422 template_in_use` otherwise).

BR-P21

Editing a role template recalculates effective permissions for all linked memberships on the
next `staff_with?` / `GET /me` call — no snapshot materialization on membership rows.

BR-P22

Overrides cannot grant keys incompatible with `memberships.role` (e.g. `teach` on `staff`
without `also_teaches` / class assignment per BR-P17) — `422 invalid_permission_for_role`.

BR-P23

At least one role template per school must retain `manage_people` and `manage_school_settings`
(the director system template satisfies this by default; deletion/editing guarded by
`422 last_admin_template`).

---

## Appendix — system template provision defaults

Provisioned per school from `SYSTEM_TEMPLATES` registry. Schools may edit these rows; defaults:

| Permission | director | secretary | coordination | teacher |
|------------|:--------:|:---------:|:------------:|:-------:|
| `manage_school_settings` | ✓ | — | — | — |
| `manage_billing` | ✓ | — | — | — |
| `manage_people` | ✓ | ✓ | partial | — |
| `manage_enrollment` | ✓ | ✓ | — | — |
| `manage_documents` | ✓ | ✓ | segment | — |
| `manage_academic` | ✓ | — | ✓ | — |
| `manage_calendar` | ✓ | ✓ | ✓ | — |
| `approve_lesson_plans` | ✓ | — | ✓ | — |
| `moderate_messages` | ✓ | — | ✓ | — |
| `teach` | — | — | if teaches | ✓ |
| `view_billing_summary` | ✓ | — | — | — |

**Legend:** partial = `scope_kind: partial` on `manage_people`; segment = `scope_kind: segment`
on `manage_documents`; if teaches = coordination template with `also_teaches: true` on
`staff_profiles`.

---

## Use Cases

### UC-P01 — Assign role template on membership create

Input: actor with `manage_people`, `email`, `role` (`staff` | `teacher`), `role_template_id`,
optional `segment_id`, `display_title`.

Flow:

1. Validate template belongs to school and is allowed for role (teacher system template requires
   `role: teacher`).
2. Create `memberships` row `status: invited`.
3. Create `staff_profiles` with `role_template_id`, `segment_id`, `display_title`,
   `is_owner: false` (unless onboarding marks owner — see onboarding PRD BR-O09).
4. Enqueue invite notification (onboarding BC).
5. Emit `RoleTemplateAssigned`.

### UC-P02 — Owner adjusts membership overrides (wave W2)

Input: owner (`is_owner: true`), `membership_id`, `grants[]`, `denies[]` (permission keys).

Flow:

1. Authorize owner-only gate for permission override edits.
2. Upsert/discard `membership_permissions` rows with `effect: grant | deny` within allowed key
   enum and BR-P22.
3. Audit change.
4. Emit `StaffPermissionsUpdated`.

### UC-P03 — Resolve effective permissions for policy check

Input: `Current.membership`, requested `permission_key`, optional resource for scope check.

Flow:

1. If guardian or backoffice (non-provisioning), use existing role rules.
2. If staff/teacher: load `staff_profile.role_template`, expand `role_template_permissions`,
   merge `membership_permissions` overrides (BR-P16).
3. If owner, short-circuit to full staff catalog keys (BR-P04).
4. Apply segment/class scope when permission `scope_kind` is partial or segment.
5. Return allow/deny to Pundit.

### UC-P04 — Migrate existing `school` memberships + provision system templates

Input: deployment data migration / rake (idempotent).

Flow:

1. For each school: provision four system role templates + `role_template_permissions` from
   appendix (skip if already present).
2. `UPDATE memberships SET role = 'staff' WHERE role = 'school'`.
3. For each school with migrated memberships, set `is_owner: true` on exactly one row: the
   **earliest kept** `school` membership by `memberships.created_at` (tie-break: lowest
   `memberships.id`). Link all migrated profiles to director system template.
4. Update policies from `school_staff?` to `staff_with?`.
5. Update API serializers and OpenAPI role enum.
6. Emit `MembershipRoleMigrated` per school.

### UC-P04b — Provision system templates on school create

Input: new `schools` row (self-serve or white-glove).

Flow:

1. `Identity::ProvisionSystemRoleTemplatesService.call(school:)` — same registry as UC-P04.
2. Onboarding continues with owner invite using director system template `role_template_id`.

### UC-P05 — Create custom role template

Input: owner, `name`, `permissions[]` with optional `scope_kind` per key.

Flow:

1. Authorize BR-P19.
2. Create `school_role_templates` (`is_system: false`).
3. Create `role_template_permissions` rows.
4. Audit; emit `RoleTemplateCreated`.

### UC-P06 — Update role template

Input: owner, `role_template_id`, updated `name` and/or `permissions[]`.

Flow:

1. Authorize BR-P19; validate BR-P23 if removing admin keys from last admin-capable template.
2. Replace `role_template_permissions` set.
3. Response includes `affected_memberships_count`.
4. Audit; emit `RoleTemplateUpdated`.

### UC-P07 — Clone role template

Input: owner, source `role_template_id`, new `name`.

Flow:

1. Copy template + permissions to new custom template (`is_system: false`).
2. Emit `RoleTemplateCreated`.

### UC-P08 — Delete custom role template

Input: owner, `role_template_id`.

Flow:

1. Reject if `is_system: true` (`422 cannot_delete_system_template`).
2. Reject if any kept membership references template (`422 template_in_use`).
3. Discard template and permissions.
4. Emit `RoleTemplateDeleted`.

### UC-P09 — List permission catalog

Input: actor with `manage_people`.

Flow:

1. Return keys from `SchoolLab::Permissions::CATALOG` with metadata (domain, `scope_kind` options).

---

## API

Auth contract: [`docs/modeling/002-api-auth.md`](../../modeling/002-api-auth.md).  
Full narrative: [`docs/api/v1/identity-onboarding.md`](../../api/v1/identity-onboarding.md).

### Role templates (W1)

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/v1/schools/:school_id/permission_definitions` | `manage_people` |
| `GET` | `/api/v1/schools/:school_id/role_templates` | `manage_people` |
| `POST` | `/api/v1/schools/:school_id/role_templates` | owner |
| `PATCH` | `/api/v1/schools/:school_id/role_templates/:id` | owner |
| `DELETE` | `/api/v1/schools/:school_id/role_templates/:id` | owner (custom only) |
| `POST` | `/api/v1/schools/:school_id/role_templates/:id/clone` | owner |

### `POST /api/v1/schools/:school_id/people/memberships`

```json
{
  "email": "secretaria@escola.example",
  "role": "staff",
  "role_template_id": 42,
  "segment_id": null,
  "display_title": "Secretária"
}
```

Response `201`: membership + `staff_profile` summary.

**Deprecated:** `preset_key` — accepted only during migration window with mapping to system
template id; removed after UC-P04 completes.

### `PATCH /api/v1/schools/:school_id/people/memberships/:id/permissions` (W2)

```json
{
  "grants": ["manage_billing", "view_billing_summary"],
  "denies": []
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
        "role_template": {
          "id": 1,
          "name": "Direção",
          "system_key": "director",
          "is_system": true
        },
        "is_owner": true,
        "segment_id": null,
        "display_title": "Diretor",
        "permissions": [
          "manage_school_settings",
          "manage_billing",
          "manage_people",
          "manage_enrollment",
          "manage_documents",
          "manage_academic",
          "approve_lesson_plans",
          "moderate_messages",
          "view_billing_summary"
        ],
        "permission_sources": {
          "manage_billing": "owner"
        }
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
| `404` | `not_found` | Cross-school membership or template |
| `422` | `validation_error` | Invalid `role_template_id`, role/template mismatch |
| `422` | `template_in_use` | Delete template with active memberships |
| `422` | `cannot_delete_system_template` | Delete `is_system` template |
| `422` | `last_admin_template` | Edit/delete would remove last admin-capable template |
| `422` | `invalid_permission_for_role` | Override grant incompatible with membership role |
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
| `school_role_templates` | Per-school templates: `name`, `system_key`, `is_system`, `school_id` |
| `role_template_permissions` | Template ↔ permission key with `scope_kind` |
| `staff_profiles` | One per staff/teacher membership: `role_template_id`, `segment_id`, `display_title`, `is_owner`, `also_teaches` |
| `membership_permissions` | **Overrides only:** `membership_id`, `permission_key`, `effect` (`grant` \| `deny`) |
| `segments` | School education segment (MVP: stub or minimal — D6) |
| `memberships` | `role` enum: `school` → `staff` migration |

Permission catalog: **code registry** in MVP (`SchoolLab::Permissions::CATALOG`) — no DB table.

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `RoleTemplateAssigned` | Membership create with template | Audit, onboarding notifications |
| `RoleTemplateCreated` | UC-P05, UC-P07 | Audit |
| `RoleTemplateUpdated` | UC-P06 — payload includes `affected_memberships_count` | Audit |
| `RoleTemplateDeleted` | UC-P08 | Audit |
| `StaffPermissionsUpdated` | UC-P02 override patch | Audit, cache invalidation (future) |
| `MembershipRoleMigrated` | UC-P04 data migration | Ops logging |

---

## Permissions

Resource × effective permission (staff templates). Backoffice and guardian columns unchanged
from fintech-first except `school` → `staff`.

| Resource / action | backoffice | staff (template) | teacher | guardian |
|-------------------|:----------:|:----------------:|:-------:|:--------:|
| `schools` CRUD | ✓ | — | — | — |
| `role_templates` CRUD | — | owner | — | — |
| `permission_definitions` read | — | `manage_people` | — | — |
| `people/memberships` create | — | `manage_people` | — | — |
| `people/memberships` permissions patch | — | owner only | — | — |
| `billing/*` | — | `manage_billing` | — | — |
| `billing/summary` read | — | `view_billing_summary` | — | — |
| `documents` write/review | — | `manage_documents` (scope) | — | — |
| Academic configuration, closure, publish, and staff override | — | `manage_academic` | — | — |
| `lesson_plans` approve | — | `approve_lesson_plans` | — | — |
| Messages moderate | — | `moderate_messages` | — | — |
| Class teaching actions | — | `teach` if granted | `teach` | — |
| `auth/*`, `GET /me` | ✓ | ✓ | ✓ | ✓ |
| Provisioning (onboarding) | `provision_school` | — | — | — |

Teacher rows use class assignment scope in addition to permission keys. Guardian policies
unchanged (family scope).

---

## Non-functional requirements

Cross-cutting: [`docs/product/non-functional-requirements.md`](../../product/non-functional-requirements.md).

- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — `role_template_id` and overrides scoped to `school_id`; cross-school template access returns `404`.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — template and override changes audited (BR-P09); `RoleTemplateUpdated` includes `affected_memberships_count`.

---

## Acceptance Criteria

### Wave W1 — Role templates, resolution, and `GET /me`

AC-P001 — System templates provisioned on school create (`identity.manage_roles`)

```gherkin
Feature: System templates provisioned on school create
  Given a new school is created via onboarding
  When provisioning completes
  Then the school has four system role_templates with system_key director, secretary, coordination, teacher
  And role_template_permissions match the appendix defaults

Feature: Custom role template
  Given a school with an active owner
  When the owner POSTs /role_templates with name Receptionist and manage_people
  Then a custom template is created with is_system false

Feature: Staff membership with role template
  Given a school with secretary system template id 42
  When the owner POSTs /people/memberships with role staff and role_template_id 42
  Then the membership is created with status invited
  And staff_profiles.role_template_id is 42

Feature: Template edit propagates immediately
  Given two staff memberships on secretary template without overrides
  When the owner PATCHes the template removing manage_enrollment
  Then both members lose manage_enrollment on the next GET /me

Feature: Override grant survives template removal
  Given a secretary membership with override grant manage_billing
  And the secretary template does not include manage_billing
  When the owner PATCHes the template
  Then the member retains manage_billing

Feature: GET /me exposes permissions
  Given a user with active staff membership and director system template
  When they GET /api/v1/me
  Then the membership includes role_template with system_key director, is_owner true
  And permissions includes manage_billing and manage_people
```

AC-P002 — Owner grants billing override to one secretary (`identity.manage_roles`)

```gherkin
Feature: Owner grants billing override to one secretary
  Given two secretary memberships on the same template without manage_billing
  When the owner PATCHes /people/memberships/:id/permissions with grants manage_billing for one member only
  Then only that member can POST /billing/charges
  And an audit row is created

Feature: Owner deny overrides template
  Given a secretary membership on a template that includes manage_enrollment
  When the owner PATCHes denies manage_enrollment for that member
  Then the member cannot manage enrollment despite the template

Feature: Policies use staff_with
  Given a staff membership with manage_billing in effective permissions
  When they POST /billing/charges
  Then the response is not 403 forbidden

Feature: Non-owner cannot patch overrides
  Given a secretary membership
  And another staff member without is_owner
  When they PATCH /people/memberships/:id/permissions
  Then the response is 403 forbidden
```

---

## Out of Scope

- Visual permission editor UI (API in W1–W2; UI deferred to layer SPA PRD).
- Custom per-school **permission key** definitions.
- `coordinator` as a separate `memberships.role` enum value (use role template — D2).
- Guardian permission keys (family scope remains role-based).
- Template sharing across schools or backoffice-defined per-tenant catalogs.
- Impersonation / "login as school" for support (future PRD).
