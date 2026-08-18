# PRD — Platform: Backoffice Evolution

> Status: draft (E1 slices near-ready; E2 blocked on audit PII OQ; E3 P2 blocked on commercial/policy OQs)  
> Relation to School Lab: Platform & admin BC2 extension — core MVP domain #9 per [`product-map.md`](../../product-map.md) §5  
> Parent PRDs: [`backoffice.md`](backoffice.md), [`index.md`](index.md)  
> Capability IDs: `platform.manage_backoffice_ops`, `platform.configure_school_year`; P2: `platform.view_analytics_dashboard`, `platform.manage_multi_unit`, `platform.configure_help_taxonomy`  
> Surface: `frontend/backoffice/` at `/backoffice`  
> Modeling: [`009-platform-admin.md`](../../modeling/009-platform-admin.md)  
> API narrative: [`platform-and-admin.md`](../../api/v1/platform-and-admin.md) *(E1/E2 draft sections)*

---

## Objective

Complete **DLA platform operator** capabilities in the backoffice SPA — close BC2/W3 gaps (module
flags UI, tenant detail, school-year provisioning in the wizard, operational dashboard), add
**platform ops tooling** (audit viewer, advanced search, discarded-school restore, bulk invite
resend, operator-permissions read-only), and document the **P2 roadmap** (platform SaaS billing,
impersonation, cross-tenant analytics, multi-unit groups, help taxonomy CMS).

Business rules remain in `web/` services; this PRD defines operator UI, API contracts, and
acceptance criteria without duplicating identity provisioning logic.

---

## Context

[`backoffice.md`](backoffice.md) (BC2) is **validated** and defines UC-BO01–04. Staging
implementation (Aug 2026) covers only part of W3:

| Capability (parent UC) | Backend (`/api/v1/schools`) | Backoffice UI |
|------------------------|----------------------------|---------------|
| UC-BO01 Register school | `POST /schools` | Schools list + create |
| UC-BO02 Provisioning wizard | Handoff, import, bank creds | ProvisioningWizard |
| UC-BO03 Module flags | `PATCH /schools/:id/modules` | **Missing** |
| UC-BO04 Tenant overview | `GET /schools` (no modules in list blueprint) | **Missing** (grid only) |

**API namespace decision:** Implementation uses `/api/v1/schools` with Pundit backoffice policies —
not `/api/v1/backoffice/`. See [`school-module-flags.md`](school-module-flags.md) and parent
[`backoffice.md`](backoffice.md) API table (corrected in this evolution cycle).

School year API (W1) is frozen; backoffice may create the first year during provisioning via
`provision_school` ([`school-year.md`](school-year.md) BR-SY01, actors table).

**Feature slices:** Each shippable unit has a child slice file (Requirements, Bar, GWT ACs,
Non-goals, harness notes) linked from [Delivery waves](#delivery-waves-e1-e2-e3).

---

## Gap analysis (baseline)

| Item | PRD reference | Backend | UI | Wave |
|------|---------------|---------|-----|------|
| School register | UC-BO01 | Implemented | Implemented | W3 (partial) |
| Provisioning wizard | UC-BO02 | Partial | Implemented | W3 (partial) |
| Module flags PATCH | UC-BO03 | Implemented | **Missing** | **E1** |
| Module flags GET / show embed | UC-BO03, BR-BOE01 | **Missing GET** | **Missing** | **E1** |
| Tenant detail page | UC-BO04 | Partial (`GET /schools/:id`) | **Missing** | **E1** |
| First school year in wizard | BR-BOE02, UC-SY01 | W1 frozen | **Missing step** | **E1** |
| Operational dashboard alerts | BR-BOE04 | Partial (list + creds) | Partial (KPIs only) | **E1** |
| Advanced school search | UC-BO04 extension | **Missing filters** | **Missing** | **E2** |
| Audit viewer | BR-BOE05 | **Net-new** | **Net-new** | **E2** |
| Discarded schools restore | BR-BOE06 | **Net-new** | **Net-new** | **E2** |
| Bulk invite resend | UC-BOE08 | Optional endpoint | **Missing** | **E2** |
| Operator permissions (read-only) | UC-BOE09 | Exists in identity | **Missing UI** | **E2** |
| Platform SaaS billing | BR-BOE08 | **Net-new** | **Net-new** | **E3 P2** |
| Impersonation | BR-BOE07 | **Net-new** | **Net-new** | **E3 P2** |
| Cross-tenant analytics | BR-BOE10 | **Net-new** | **Net-new** | **E3 P2** |
| Multi-unit groups | BR-BOE09 | **Net-new** | **Net-new** | **E3 P2** |
| Help taxonomy CMS | P2 capability | **Net-new** | **Net-new** | **E3 P2** |

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Backoffice tenant and module ops | `platform.manage_backoffice_ops` | `[product decision]` — DLA operator surface; Proesc/Sophia sales-led implantação ([`DIV-integration-001`](../../ref/divergencias.md)) |
| Configure school year (provisioning) | `platform.configure_school_year` | Proesc exercício setup during implantação — [`proesc/gestao-academica/modelo-de-dominio.md`](../../ref/proesc/gestao-academica/modelo-de-dominio.md) |
| Multi-unit roll-ups | `platform.manage_multi_unit` | [`DIV-academic-008`](../../ref/divergencias.md) — P2 |
| Help taxonomy | `platform.configure_help_taxonomy` | [`DIV-integration-003`](../../ref/divergencias.md) — P2 |
| Analytics dashboard | `platform.view_analytics_dashboard` | vision §6 — P2 |

White-glove provisioning patterns (Proesc implantação, Sophia consultoria) inform **optional**
tier UX, not feature-parity target.

---

## Actors and surfaces

| Actor | Surfaces | Notes |
|-------|----------|-------|
| backoffice (DLA operator) | `frontend/backoffice` SPA, `/api/v1/schools` + future `/api/v1/platform/*` | Register tenants, provisioning, module ops, platform ops |
| school staff | `frontend/app` | No backoffice access — redirect to `/app` (AC-BO04) |
| guardian / teacher | `frontend/app`, mobile | No backoffice access |

Detail: [`docs/actors-and-surfaces.md`](../../actors-and-surfaces.md).

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| All segments | yes | Backoffice is operator-facing |
| `multi_unidade` | partial | MVP: one tenant per campus; group CRUD in E3 P2 |

---

## Business Rules

BR-BOE01 — `capability_id`: `platform.manage_backoffice_ops`

Module toggle UI requires platform permission `manage_backoffice_ops`. The UI must reflect
current module state from `GET /api/v1/schools/:id/modules` or an equivalent embed on
`GET /api/v1/schools/:id` (`include=modules`). PATCH remains the mutation path
([`school-module-flags.md`](school-module-flags.md)).

BR-BOE02 — `capability_id`: `platform.configure_school_year`

During white-glove provisioning, backoffice with `provision_school` creates the **first school
year** (draft + activate) on behalf of the tenant, following [`school-year.md`](school-year.md)
BR-SY01 and BR-SY06. Actions are audited with `on_behalf_of: school_id`.

BR-BOE03

Tenant detail and list views **must not** expose guardian or student PII — aggregate counts
only (extends parent BR-BO04). No cross-tenant user edit except explicit provisioning actions.

BR-BOE04

Operational dashboard surfaces **credential health**: schools whose Cora mTLS certificate expires
within 30 days (`certificate_expires_at` on payment provider), schools with one or more modules
disabled, and links to tenant detail.

BR-BOE05 — E2

Audit viewer reads cross-tenant audit rows (Audited gem) with filters (`school_id`, action, date
range). No bulk CSV export of PII ([NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy),
[NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit)).

BR-BOE06 — E2

Discarded schools (`discarded_at` set) are listable via `GET /schools?discarded=true` and
restorable by backoffice via `POST /schools/:id/restore` (inverse of discard service).

BR-BOE07 — E3 P2

**Impersonation** (staff-as-school support) issues a short-lived scoped JWT, requires explicit
operator action, displays a persistent banner in the school SPA, and writes a mandatory audit
trail. Policy details blocked on open questions — see [Open items](#open-items--pending-decisions).

BR-BOE08 — E3 P2

**Platform SaaS billing** — DLA subscription plans, per-school subscription state, and platform
invoicing to schools. Commercial model not finalized — see [`open-questions.md`](../../open-questions.md).

BR-BOE09 — E3 P2

**Multi-unit groups** — `school_groups` entity, optional `school.school_group_id`, backoffice CRUD
for group operators. MVP remains one tenant per campus until E3 ships
([`DIV-academic-008`](../../ref/divergencias.md)).

BR-BOE10 — E3 P2

**Cross-tenant analytics** — KPIs (active schools, module adoption, onboarding funnel, MRR when
billing exists) via `GET /platform/analytics/overview`. No row-level guardian/student export.

---

## Use Cases

Parent UCs UC-BO01–04 remain in [`backoffice.md`](backoffice.md). Evolution adds:

### UC-BOE01 — Toggle modules in backoffice UI

Slice: [`backoffice-module-flags-ui.md`](backoffice-module-flags-ui.md)

Input: `school_id`, module key, enabled boolean.

Flow

1. Operator opens tenant detail or module dialog.
2. Client loads current modules (GET).
3. Operator toggles; client PATCHes `/schools/:id/modules`.
4. Audit row persisted (BR-BO06 parent).

### UC-BOE02 — Create first school year in provisioning wizard

Slice: [`backoffice-school-year-provisioning.md`](backoffice-school-year-provisioning.md)

Input: `school_id` in provisioning, year name, dates, period template.

Flow

1. Wizard step "Ano letivo" collects year parameters.
2. `POST /schools/:id/school_years` (draft + template periods).
3. `POST /schools/:id/school_years/:year_id/activate`.
4. Checklist marks school year complete; audit on behalf of school.

### UC-BOE03 — View tenant detail

Slice: [`backoffice-tenant-detail.md`](backoffice-tenant-detail.md)

Input: `school_id`.

Flow

1. Operator navigates to `/schools/:id`.
2. Client loads detail with modules, active year summary, onboarding status, aggregate counts.
3. Quick links to wizard, bank credentials, activation checklist.

### UC-BOE04 — Operational dashboard

Slice: [`backoffice-operational-dashboard.md`](backoffice-operational-dashboard.md)

Flow

1. Dashboard loads cross-tenant summary cards.
2. Surfaces expiring credentials, module-off schools, provisioning backlog.
3. Cards link to filtered lists or tenant detail.

### UC-BOE05 — Browse platform audit log

Slice: [`backoffice-audit-viewer.md`](backoffice-audit-viewer.md)

Flow

1. Operator opens `/audits`.
2. Filter by school, action, date; paginated read-only table.
3. No export in MVP of this slice.

### UC-BOE06 — Advanced school search

Slice: [`backoffice-advanced-search.md`](backoffice-advanced-search.md)

Flow

1. Operator applies filters on schools list (`q`, `saas_plan`, `created_after`, onboarding status).
2. Query string synced with URL for shareable views.

### UC-BOE07 — Restore discarded school

Slice: [`backoffice-discarded-schools.md`](backoffice-discarded-schools.md)

Flow

1. Operator opens "Arquivadas" tab on schools list.
2. Lists discarded tenants; confirm restore.
3. `POST /schools/:id/restore`; school reappears in default list.

### UC-BOE08 — Bulk invite resend (E2, no separate slice)

Input: `school_id` in provisioning, pending invites.

Flow

1. Operator triggers resend from wizard People step.
2. Optional `POST /schools/:id/provisioning/resend_invites` re-queues pending owner/staff invites.
3. Rate-limited; audited.

### UC-BOE09 — View operator permissions (E2, read-only MVP)

Flow

1. Operator opens **`/users`** with an **Operators** tab (canonical route — no separate `/operators` path).
2. Lists backoffice users and effective platform permission keys (read-only).
3. Write/edit deferred to identity PRD extension.

### UC-BOE10 — Manage platform SaaS subscriptions (P2)

Slice: [`backoffice-platform-billing-p2.md`](backoffice-platform-billing-p2.md)

### UC-BOE11 — Impersonate school staff for support (P2)

Slice: [`backoffice-impersonation-p2.md`](backoffice-impersonation-p2.md)

### UC-BOE12 — View platform analytics (P2)

Slice: [`backoffice-analytics-p2.md`](backoffice-analytics-p2.md)

### UC-BOE13 — Manage school groups (P2)

Slice: [`backoffice-multi-unit-p2.md`](backoffice-multi-unit-p2.md)

### UC-BOE14 — Configure help taxonomy (P2)

Slice: [`backoffice-help-taxonomy-p2.md`](backoffice-help-taxonomy-p2.md) — brief scope; may ship
as separate menu from core ops.

---

## API

**Namespace:** `/api/v1/schools` for tenant ops (JWT role `backoffice` + Pundit). P2 platform
routes under `/api/v1/platform/` *(draft until E3)*.

### Existing (implemented or W1 frozen)

| Method | Path | Wave | Notes |
|--------|------|------|-------|
| `GET` | `/schools` | W3 partial | Tenant list |
| `POST` | `/schools` | W3 | Register school (UC-BO01) |
| `GET` | `/schools/:id` | E1 extend | Add `include=modules,active_school_year,aggregate_counts` |
| `PATCH` | `/schools/:id/modules` | W3 | Module flags (UC-BO03) |
| `POST` | `/schools/:id/school_years` | W1 | Create draft year |
| `POST` | `/schools/:id/school_years/:year_id/activate` | W1 | Activate year |
| `POST` | `/schools/:id/provisioning/*` | W3 partial | On-behalf-of provisioning |

### E1 — net-new or extensions

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/schools/:id/modules` | Return module map for UI (if not embedded in show) |
| `GET` | `/schools/:id` | `:backoffice_detail` view — modules, active year, counts |

### E2 — net-new or extensions

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/schools` | Query params: `q`, `saas_plan`, `created_after`, `created_before`, `discarded` |
| `GET` | `/platform/audits` | Cross-tenant audit log (paginated, filtered) |
| `GET` | `/schools/discarded` | Alias or `discarded=true` on index |
| `POST` | `/schools/:id/restore` | Undiscard school |
| `POST` | `/schools/:id/provisioning/resend_invites` | Optional bulk invite resend |
| `GET` | `/platform/operators` | Read-only backoffice users + platform permissions — **extends `/users` UI**; no `/operators` route |

### E3 P2 — draft

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/platform/impersonations` | Start impersonation session |
| `DELETE` | `/platform/impersonations/:id` | End session |
| `GET` | `/platform/analytics/overview` | Cross-tenant KPIs |
| `CRUD` | `/platform/school_groups` | Multi-unit groups |
| `CRUD` | `/platform/subscriptions` | SaaS billing |
| `CRUD` | `/platform/help_taxonomy/*` | Help categories and persona links |

Detail: [`platform-and-admin.md`](../../api/v1/platform-and-admin.md) § Backoffice E1/E2.

School-scoped domain APIs remain under `/api/v1/schools/:school_id/` with `provision_school`
elevation during provisioning.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `backoffice_only` | Non-backoffice role |
| 403 | `forbidden` | Missing `manage_backoffice_ops` or `provision_school` |
| 403 | `module_disabled` | Domain API when module off |
| 404 | `not_found` | Unknown school or discarded without restore permission |
| 409 | `invalid_onboarding_transition` | Checklist incomplete |
| 422 | `validation_error` | Invalid module key, year dates, filter params |
| 422 | `no_active_school_year` | Downstream when year required |
| 429 | `rate_limited` | Bulk invite resend throttled |

P2 impersonation and billing errors documented in slice files when contracts freeze.

---

## Database

| Artifact | Location |
|----------|----------|
| Narrative DSL | [`009-platform-admin.md`](../../modeling/009-platform-admin.md) |
| DBML | [`schema.dbml`](../../database/schema.dbml) — `school_modules`, `schools`, audits |
| DER | [`der_009.png`](../../database/der_009.png) *(when published)* |

E3 P2 adds `school_groups`, `platform_subscriptions`, help taxonomy tables — modeling TBD before
implementation.

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `SchoolModuleToggled` | PATCH modules | School SPA feature flags |
| `SchoolYearActivated` | Provisioning activate | Academic, billing scoping |
| `SchoolRestored` | POST restore | Tenant list caches |
| `ImpersonationStarted` / `Ended` | P2 | Audit, session middleware |

---

## Permissions

| Key | Use |
|-----|-----|
| `manage_backoffice_ops` | Module toggles, tenant list/detail, audits, discarded restore |
| `provision_school` | On-behalf-of provisioning, first school year in wizard |

Backoffice role (`memberships.role = backoffice`, `school_id: null`) required for all routes.
Operator permissions read-only UI does not grant write in E2.

---

## Non-functional requirements

- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — cross-tenant
  reads logged; no bulk PII export in audit viewer or analytics MVP.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) —
  module toggles, provisioning on-behalf-of, restore, impersonation (P2) audited.

Domain-specific:

- Credential expiry alerts use school timezone for display; UTC for sorting.
- Impersonation sessions short TTL; banner cannot be dismissed (P2).

---

## Acceptance Criteria

AC-BOE01 — Module flags UI (E1)

- [ ] Given backoffice user with `manage_backoffice_ops`, when opening module toggles for school S,
  then current module state matches GET/PATCH API and toggling billing off persists audit row.
- Slice: [`backoffice-module-flags-ui.md`](backoffice-module-flags-ui.md)

AC-BOE02 — School year in wizard (E1)

- [ ] Given provisioning school S, when operator completes wizard school-year step, then an active
  school year exists for S and provisioning checklist reflects completion.
- Slice: [`backoffice-school-year-provisioning.md`](backoffice-school-year-provisioning.md)

AC-BOE03 — Tenant detail (E1)

- [ ] Given backoffice user, when navigating to `/schools/:id`, then page shows onboarding status,
  module chips, active year summary, aggregate counts — no guardian/student PII.
- Slice: [`backoffice-tenant-detail.md`](backoffice-tenant-detail.md)

AC-BOE04 — Operational dashboard (E1)

- [ ] Given schools with credentials expiring within 30 days, when loading dashboard, then alert
  card lists those schools with link to detail or credentials.
- Slice: [`backoffice-operational-dashboard.md`](backoffice-operational-dashboard.md)

AC-BOE05 — Audit viewer (E2)

- [ ] Given backoffice user, when filtering audits by school_id and date, then only matching rows
  appear and CSV export is not available.
- Slice: [`backoffice-audit-viewer.md`](backoffice-audit-viewer.md)

AC-BOE06 — Advanced search (E2)

- [ ] Given schools matching name query `q`, when operator searches list, then URL and results
  reflect filter and pagination.
- Slice: [`backoffice-advanced-search.md`](backoffice-advanced-search.md)

AC-BOE07 — Discarded schools (E2)

- [ ] Given discarded school S, when operator restores from Arquivadas tab, then S appears in
  default list and staff can log in again.
- Slice: [`backoffice-discarded-schools.md`](backoffice-discarded-schools.md)

AC-BOE08 — Bulk invite resend (E2)

- [ ] Given pending invites on provisioning school, when operator triggers resend, then invites
  are re-queued and action is audited (rate limit enforced).
- Slice: UC-BOE08 in this PRD; optional future slice if engineering splits from wizard.

AC-BOE09 — Operator permissions read-only (E2)

- [ ] Given backoffice user, when opening **Operators tab on `/users`**, then platform permission
  keys display read-only without edit controls.
- API: `GET /api/v1/platform/operators`; UI: `/users` tab — no `/operators` route.

AC-BOE10 — Platform billing P2 (E3)

- [ ] Deferred — blocked on commercial model. Slice:
  [`backoffice-platform-billing-p2.md`](backoffice-platform-billing-p2.md)

AC-BOE11 — Impersonation P2 (E3)

- [ ] Deferred — blocked on policy. Slice: [`backoffice-impersonation-p2.md`](backoffice-impersonation-p2.md)

AC-BOE12 — Analytics P2 (E3)

- [ ] Deferred — depends on billing + events. Slice: [`backoffice-analytics-p2.md`](backoffice-analytics-p2.md)

AC-BOE13 — Multi-unit P2 (E3)

- [ ] Deferred. Slice: [`backoffice-multi-unit-p2.md`](backoffice-multi-unit-p2.md)

AC-BOE14 — Help taxonomy CMS P2 (E3)

- [ ] Given operator with `configure_help_taxonomy`, when creating category "Financeiro" linked to
  persona `secretary`, then taxonomy persists and is readable via platform API.
- Slice: [`backoffice-help-taxonomy-p2.md`](backoffice-help-taxonomy-p2.md) — blocked on persona
  model ([`open-questions.md`](../../open-questions.md) § Platform & admin).

---

## Delivery waves (E1, E2, E3)

| Wave | Goal | Slices | Depends on |
|------|------|--------|------------|
| **E1** | Close BC2/W3 — operator completes onboarding end-to-end | module-flags-ui, school-year-provisioning, tenant-detail, operational-dashboard | W1 school year API; PATCH modules |
| **E2** | Platform ops — visibility and recovery | audit-viewer, advanced-search, discarded-schools; UC-BOE08/09 in PRD | E1 tenant detail |
| **E3** | P2 — commercial and scale | platform-billing, impersonation, analytics, multi-unit, help-taxonomy | Modeling + open questions |

E1 slices may parallelize after blueprint detail is agreed. E2 follows E1. E3 is sequential per
dependency graph in plan (multi-unit → billing → analytics; impersonation parallel after billing
policy).

---

## Open items / pending decisions

- [ ] Platform billing model (per student, per school, per plan) —
  [`open-questions.md`](../../open-questions.md) § GTM / business
- [ ] Impersonation policy: duration, roles allowed, LGPD notice, banner UX —
  [`open-questions.md`](../../open-questions.md) § Platform & admin
- [ ] Audit route prefix: `/platform/audits` vs nested under schools — prefer `/platform/audits`
- [ ] **Audit viewer PII display** — E2 sign-off blocked until redaction policy decided
  ([`open-questions.md`](../../open-questions.md) § Platform & admin; default: redact PII in
  `audited_changes` for cross-tenant viewer)
- [ ] Aggregated dashboard endpoint vs client-side batch — E1 may compose from existing list APIs
- [ ] Help taxonomy CMS: same SPA vs separate admin surface

---

## Out of Scope

- Mirroring academic, communication, or billing **domain screens** in backoffice — operators use
  provisioning handoff and module flags only.
- Help center **content authoring** (articles) — taxonomy CMS is P2; full CMS out of scope.
- Platform régua automation, NFS-e, transport module.
- Migrating tenant routes to `/api/v1/backoffice/` namespace.
- Write access for operator permission management in E2 (read-only MVP).

---

## Related documents

| Document | Role |
|----------|------|
| [`backoffice.md`](backoffice.md) | Parent BC2 — UC-BO01–04, BR-BO01–08 |
| [`school-module-flags.md`](school-module-flags.md) | PATCH modules slice (approved) |
| [`school-year.md`](school-year.md) | Year create/activate contract |
| [`layer-web-spa.md`](../layer-web-spa.md) | Backoffice route expansion |
| [`platform-and-admin.md`](../../api/v1/platform-and-admin.md) | API narrative E1/E2 |
