# PRD — Platform: Staff Users (BC4)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `platform.manage_staff_users`, `platform.manage_platform_operations`  
> Related: [`identity-and-onboarding/permissions.md`](../identity-and-onboarding/permissions.md), [`identity-and-onboarding/onboarding.md`](../identity-and-onboarding/onboarding.md)  
> Modeling: [`009-platform-admin.md`](../../modeling/009-platform-admin.md) *(reuses identity entities)*  
> API narrative: [`platform-and-admin.md`](../../api/v1/platform-and-admin.md) *(draft contract)*

---

## Objective

Define **staff roster administration** and **menu visibility** in the school SPA — listing staff
and teachers, assignment overview, and navigation gating from permission payload — while identity
owns authentication, invites, role templates, and permission keys.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Manage staff users and role menus | `platform.manage_staff_users` | Proesc staff/user admin (15 aliases in parity matrix), [`parity-matrix.md`](../../product/parity-matrix.md#platform--admin) |
| General platform operations | `platform.manage_platform_operations` | Catch-all — miscatalogued ERP admin tasks |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| All segments | yes | Same roster model |

---

## Context

Identity BC1 defines **who can do what** (`staff_with?`, role templates). Platform BC4 defines
**school admin UX** for roster management and **SPA menu composition** from `GET /me` permission
payload — not duplicate authorization logic.

Invites and set-password remain identity onboarding ([`onboarding.md`](../identity-and-onboarding/onboarding.md)).

---

## Business Rules

BR-SU01 — `capability_id`: `platform.manage_staff_users`

Staff roster lists `memberships` where `role` ∈ `staff | teacher` for current `school_id`.

BR-SU02

Roster row displays: name, email, `role`, `role_template` name, membership status
(`invited | active | deactivated`), optional `segment_id`.

BR-SU03

**Deactivate** preferred over hard delete (identity `manage_user_accounts`); platform UI calls
identity API.

BR-SU04

**Menu visibility** derives from effective permission keys on `GET /me` — SPA never hardcodes
role names for route guards (identity integration contract).

BR-SU05

Secretary/director with `manage_users` may invite via identity `POST /memberships/invite` — platform
UI wraps same API.

BR-SU06

Menu sections map to module flags ([`backoffice.md`](backoffice.md) BR-BO04) **and** permission
keys — both must pass for route visibility.

BR-SU07

`platform.manage_platform_operations` catch-all: edge admin tasks not yet split into dedicated
slices document here until taxonomy refines.

BR-SU08

Guardians and students are **not** in staff roster — separate people/guardian admin in students
and identity flows.

---

## Use Cases

### UC-SU01 — List staff roster

Input: filters (role, status, search).

Flow

1. Query memberships + profiles.
2. Return paginated roster.

### UC-SU02 — Invite staff member

Input: email, role_template_id, segment_id.

Flow

1. Delegate to identity invite service.
2. Show pending invite in roster.

### UC-SU03 — Deactivate staff

Input: membership_id.

Flow

1. Call identity deactivate.
2. Revoke active sessions on next request `[product decision]`.

### UC-SU04 — Resolve SPA menu

Input: `GET /me` permissions + school modules.

Flow

1. Build menu tree from permission keys (BR-SU04, BR-SU06).
2. Hide disabled modules.

---

## API

Platform routes are **facades** over identity where noted:

| Method | Path | Delegates to |
|--------|------|--------------|
| `GET` | `/staff_users` | memberships query |
| `POST` | `/staff_users/invites` | identity invite |
| `PATCH` | `/staff_users/:id/deactivate` | identity account |
| `GET` | `/me/menu` | optional convenience; or pure client from `/me` |

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `forbidden` | Missing manage_users |
| 409 | `owner_deactivate` | Cannot deactivate sole owner without transfer |

---

## Database

No new tables required MVP — uses identity `memberships`, `staff_profiles`, `role_templates`.

Optional: `menu_configurations` per school P2 for custom ordering `[product decision]`.

---

## Permissions

| Action | Key |
|--------|-----|
| Roster read | `view_staff` or `manage_users` |
| Invite/deactivate | `manage_users` |

---

## Non-functional requirements

- [NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy) — roster lists staff PII; school-scoped only.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — deactivate audited via identity.

---

## Acceptance Criteria

AC-SU01

- [ ] Given secretary with manage_users, when listing roster, then only current school staff/teachers appear.
- Source: Proesc user admin pattern

AC-SU02

- [ ] Given teacher without manage_users, when POST invite, then 403.
- Source: `[invented]`

AC-SU03

- [ ] Given billing module disabled, when GET /me menu, then billing routes absent even if user has manage_billing key.
- Source: [`backoffice.md`](backoffice.md) BR-BO04

---

## Open items

- [ ] Custom menu ordering per school — P2.
- [ ] Visual permission editor — layer SPA PRD deferred.

---

## Out of Scope

- Role template CRUD — identity [`permissions.md`](../identity-and-onboarding/permissions.md).
- Guardian roster — students [`records.md`](../students-and-enrollments/records.md).
- Backoffice cross-tenant user admin — [`backoffice.md`](backoffice.md).
