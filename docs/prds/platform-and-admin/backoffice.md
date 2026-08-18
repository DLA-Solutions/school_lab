# PRD — Platform: Backoffice Operations (BC2)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Evolution PRD: [`backoffice-evolution.md`](backoffice-evolution.md) *(draft — E1–E3 gaps)*  
> Capability IDs: `platform.manage_backoffice_ops`  
> Related: [`identity-and-onboarding/onboarding.md`](../identity-and-onboarding/onboarding.md), [`staff-users.md`](staff-users.md)  
> Surface: `frontend/backoffice/` at `/backoffice`  
> Modeling: [`009-platform-admin.md`](../../modeling/009-platform-admin.md)  
> API narrative: [`platform-and-admin.md`](../../api/v1/platform-and-admin.md) *(draft contract)*

**Implementation note (Aug 2026):** W3 is **partially implemented** in staging — school register,
provisioning wizard, and `PATCH /api/v1/schools/:id/modules` exist; module flags UI, tenant detail,
school-year wizard step, and operational dashboard alerts are tracked in
[`backoffice-evolution.md`](backoffice-evolution.md) wave **E1**.

---

## Objective

Define **DLA platform operator** capabilities in the backoffice SPA — school registration, tenant
lifecycle support, and **module enablement** — without duplicating identity provisioning rules or
school-staff day-to-day admin.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Backoffice tenant and module operations | `platform.manage_backoffice_ops` | `[product decision]` — DLA operator surface; competitors sell via sales-led implantação ([`DIV-integration-001`](../../ref/divergencias.md)) |

White-glove provisioning patterns: Proesc implantação, Sophia consultoria — evidence for
**optional** tier, not feature parity target.

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| All segments | yes | Backoffice is operator-facing, not segment-specific |
| `multi_unidade` | partial | MVP: register each campus as separate tenant |

---

## Context

[`actors-and-surfaces.md`](../../actors-and-surfaces.md) defines backoffice as DLA-only. Identity
owns `provision_school`, onboarding status, and white-glove checklists. This BC owns the **UI and
API routes** under `/backoffice` and **module flags** that gate SPA menu sections.

**Open question:** platform SaaS billing in backoffice — MVP limits to school register and module
ops ([`open-questions.md`](../../open-questions.md)).

---

## Business Rules

BR-BO01 — `capability_id`: `platform.manage_backoffice_ops`

Only users with `memberships.role = backoffice` access `/backoffice/*` routes and backoffice API
namespace.

BR-BO02

Backoffice **creates schools** via `POST /api/v1/schools` — wraps identity
`CreateSchoolService` + sets `onboarding_mode` (`self_serve` | `white_glove`).

BR-BO03

While `school.onboarding_status == provisioning`, backoffice actors with platform permission
`provision_school` may execute configuration on behalf of tenant (identity BR-O03, BR-O04).

BR-BO04

**Module flags** (`school_modules`): boolean enablement per module key — e.g. `communication`,
`academic`, `billing`, `documents`. Disabled modules hide SPA routes and return `403 module_disabled`
on domain APIs `[product decision]`.

BR-BO05

Default module set on create: all MVP modules **enabled** for partner schools; backoffice may
disable for staged rollouts.

BR-BO06

Module changes audited with `actor_type: backoffice` and `school_id`.

BR-BO07

Backoffice **does not** receive staff membership on tenant for provisioning (identity D4) —
actions use `provision_school` platform permission only.

BR-BO08

Backoffice user list/search across tenants is read-only in MVP — no cross-tenant data edit except
via explicit `on_behalf_of: school_id` provisioning actions.

---

## Use Cases

### UC-BO01 — Register new school

Input: school profile, onboarding_mode, optional owner email.

Flow

1. Create school tenant (identity).
2. Provision system role templates.
3. Create owner invite (white_glove or self_serve).
4. Set initial module flags (BR-BO05).
5. Return school id + onboarding status.

### UC-BO02 — White-glove provisioning dashboard

Input: `school_id` where `onboarding_status == provisioning`.

Flow

1. Show provisioning checklist (identity).
2. Allow people import, billing setup, year create on behalf of school.
3. Transition to `pending_handoff` when checklist complete.

### UC-BO03 — Toggle module enablement

Input: module key, enabled boolean.

Flow

1. PATCH `school_modules`.
2. Audit (BR-BO06).
3. SPA permission cache invalidation on next `GET /me`.

### UC-BO04 — Tenant overview

Input: filters (status, mode, name).

Flow

1. List schools with onboarding_status, active modules, created_at.
2. No guardian/student PII in list — aggregate counts only `[product decision]`.

---

## API

**Namespace:** `/api/v1/schools` (JWT role `backoffice` + Pundit policies — not a separate
`/api/v1/backoffice/` prefix). See [`school-module-flags.md`](school-module-flags.md) and
[`backoffice-evolution.md`](backoffice-evolution.md) for E1/E2 extensions.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/schools` | Tenant list (UC-BO04) |
| `POST` | `/api/v1/schools` | Register school (UC-BO01) |
| `GET` | `/api/v1/schools/:id` | Tenant detail + modules + onboarding *(E1: extend blueprint)* |
| `GET` | `/api/v1/schools/:id/modules` | Module map for UI *(E1 — if not embedded in show)* |
| `PATCH` | `/api/v1/schools/:id/modules` | Module flags (UC-BO03) |
| `POST` | `/api/v1/schools/:id/provisioning/*` | On-behalf-of actions during provisioning |

E2+ platform routes (`/api/v1/platform/audits`, etc.) documented in
[`backoffice-evolution.md`](backoffice-evolution.md) and
[`platform-and-admin.md`](../../api/v1/platform-and-admin.md).

School-scoped domain APIs remain under `/api/v1/schools/:school_id/` with `provision_school`
elevation during provisioning.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `backoffice_only` | Non-backoffice role |
| 403 | `module_disabled` | Domain API when module off |
| 422 | `invalid_onboarding_transition` | Checklist incomplete |

---

## Database

| Entity | Purpose |
|--------|---------|
| `school_modules` | `(school_id, module_key, enabled)` |
| Reuses `schools`, onboarding fields from identity modeling |

---

## Events

| Event | Consumers |
|-------|-----------|
| `SchoolModuleToggled` | SPA feature flags, optional analytics |

---

## Permissions

Platform permission keys (backoffice role):

| Key | Use |
|-----|-----|
| `provision_school` | On-behalf-of provisioning (identity) |
| `manage_backoffice_ops` | Module toggles, tenant list |

---

## Non-functional requirements

- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — cross-tenant reads logged; no bulk export of guardian PII in MVP.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — all on-behalf-of actions audited (identity BR-O04).

---

## Acceptance Criteria

AC-BO01

- [ ] Given backoffice user, when POST /api/v1/schools with white_glove mode, then school is provisioning and owner invite is created.
- Source: [`identity-and-onboarding/onboarding.md`](../identity-and-onboarding/onboarding.md)

AC-BO02

- [ ] Given billing module disabled, when staff calls billing API, then 403 module_disabled.
- Source: `[product decision]`

AC-BO03

- [ ] Given provisioning school, when backoffice sets school year on behalf, then audit row includes on_behalf_of school_id.
- Source: identity BR-O04

AC-BO04

- [ ] Given school staff user, when accessing /backoffice routes, then redirect to /app.
- Source: [`actors-and-surfaces.md`](../../actors-and-surfaces.md)

---

## Open items

- [ ] Backoffice platform billing (SaaS subscription) — deferred P2; see [`backoffice-evolution.md`](backoffice-evolution.md) E3 and [`open-questions.md`](../../open-questions.md).
- [ ] Impersonation / login-as-school for support — E3 P2; policy open in [`open-questions.md`](../../open-questions.md).
- [ ] W3 UI gaps — tracked in [`backoffice-evolution.md`](backoffice-evolution.md) waves E1–E2.

---

## Out of Scope

- School-staff user management — [`staff-users.md`](staff-users.md) + identity.
- Payment gateway KYC — billing [`gateway.md`](../billing/payments.md).
- Help center CMS — P2 `configure_help_taxonomy`.
