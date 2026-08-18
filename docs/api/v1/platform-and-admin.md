# API v1 — Platform & Admin

> **API status: frozen (Phase 4C.1 — 2026-08-15)**  
> Capability: `platform.configure_school_year`  
> PRDs: [`docs/prds/platform-and-admin/`](../../prds/platform-and-admin/)  
> Modeling: [`docs/modeling/009-platform-admin.md`](../../modeling/009-platform-admin.md)  
> Permissions: [`docs/prds/identity-and-onboarding/permissions.md`](../../prds/identity-and-onboarding/permissions.md)  
> Conventions: [`docs/api/README.md`](../README.md)

School year, academic period boundaries, and institutional holidays (Platform BC1 — Wave W1).
Routes not yet in `web/` return `501` with `not_implemented` until engineering ships.

---

## Phase 4C.1 gate

| Item | Status |
|------|--------|
| **Scope** | W1 only — `school_years`, `academic_periods`, `school_holidays` |
| **PRD** | [`school-year.md`](../../prds/platform-and-admin/school-year.md) — validated |
| **Modeling** | [`009-platform-admin.md`](../../modeling/009-platform-admin.md) — Wave 1 validated |
| **DBML** | `school_years`, `academic_periods`, `school_holidays` in [`schema.dbml`](../../database/schema.dbml) |
| **Permissions** | `manage_school_settings` for mutations; any active staff for reads |
| **Cross-domain** | `school_year_id` contract patched in enrollments, academic, communication, billing, archive narratives |
| **Deferred** | W2–W5 — calendar, backoffice modules, staff roster, product access (Phase **4C.1b**) |

Engineering may implement against this contract; OpenAPI stubs optional via rswag request specs.

---

## Gap matrix (PRD UC-SY01–04 vs prior draft)

| PRD / rule | Prior draft gap | Frozen resolution |
|------------|-----------------|-------------------|
| UC-SY01 create + template | Permissions used `manage_academic` | Mutations require `manage_school_settings` |
| UC-SY02 activate | Missing archive prior year error detail | Document transactional activate + `SchoolYearActivated` |
| UC-SY03 holidays | Missing `PATCH /holidays/:id` | Full holiday CRUD under year |
| UC-SY04 active year | Read permission unclear | Any active staff membership |
| BR-SY04 custom template | No period create path | `POST …/academic_periods` on draft year |
| BR-SY08 delete | No `DELETE /school_years/:id` route | Soft delete with `409 year_in_use` |
| Show year | No `GET /school_years/:id` | Added with embedded periods optional |
| BR-SY03 periods | No permission column | Reads: staff; PATCH dates: `manage_school_settings`, draft year only |
| Flat member paths | Ambiguous `/academic_periods/:id` | Documented under `/schools/:school_id` base |
| `closure_status` | Not documented | **Read-only** in Platform responses; mutations in [`academic.md`](academic.md) |
| W2–W5 routes | Mixed with W1 in same table | Moved to **Deferred (P2)** section |
| Error catalog | Two codes only | Full catalog below |

---

## Cross-domain contract: `school_year_id`

All year-scoped domains require explicit year context. See also consumer narratives:
[`students-and-enrollments.md`](students-and-enrollments.md),
[`academic.md`](academic.md),
[`communication.md`](communication.md),
[`billing.md`](billing.md),
[`documents-and-archive.md`](documents-and-archive.md).

| Mechanism | Usage |
|-----------|--------|
| Query param | `?school_year_id=123` on enrollments, classes, attendance, archive search, etc. |
| Header | `X-School-Year-Id: 123` — optional alternative where documented |
| Active year default | `GET /schools/:school_id/school_years/active` — clients use when no explicit year selected |
| Tenancy | Services validate `school_year_id` belongs to route `school_id`; header never establishes tenancy |
| Archived year | Readable; **blocks new enrollments and charge generation** (BR-SY07) |
| Missing active year | Downstream services return `422 no_active_school_year` (UC-SY04) |

**Academic period closure:** Platform owns period **date boundaries** (`starts_on`, `ends_on`).
`academic_periods.closure_status` (`open` \| `closing` \| `closed`) is returned on Platform reads
but mutated only via Academic BC6 routes in [`academic.md`](academic.md) § Period closure.

---

## School years (W1)

Base: `/api/v1/schools/:school_id`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/school_years` | active staff | Paginated list — filter `status`; Pagy `page`, `per_page` |
| `POST` | `/school_years` | `manage_school_settings` | Create draft year + period template (UC-SY01) |
| `GET` | `/school_years/active` | active staff | Active year with embedded periods and holidays (UC-SY04) |
| `GET` | `/school_years/:id` | active staff | Show year — optional `include=periods,holidays` |
| `PATCH` | `/school_years/:id` | `manage_school_settings` | Update draft year only — `name`, `starts_on`, `ends_on` (not `period_template` after create) |
| `DELETE` | `/school_years/:id` | `manage_school_settings` | Soft delete — `409 year_in_use` if referenced (BR-SY08) |
| `POST` | `/school_years/:id/activate` | `manage_school_settings` | `draft` → `active`; archives prior active year (BR-SY06) |
| `POST` | `/school_years/:id/archive` | `manage_school_settings` | `active` → `archived` |

**Staff read rule:** any membership with `status: active` and role `staff`, `teacher`, or
backoffice context with school access. **Guardian** memberships receive `403 forbidden` on all
Platform W1 routes. Mutations require effective `manage_school_settings` (director system
template or owner per permissions PRD — secretary template does not include this key by default).

**Backoffice provisioning:** during `school.onboarding_status == provisioning`, backoffice JWT
with `provision_school` may create the first school year without a staff membership.

### `POST /school_years`

Request:

```json
{
  "name": "2026",
  "starts_on": "2026-02-01",
  "ends_on": "2026-12-15",
  "period_template": "trimester"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | Display label, e.g. `"2026"` |
| `starts_on` | yes | ISO date — year lower bound |
| `ends_on` | yes | ISO date — must be ≥ `starts_on` |
| `period_template` | no | `bimester` \| `trimester` \| `custom`; default **`trimester`** (BR-SY04) |

Response `201`:

```json
{
  "data": {
    "id": 10,
    "school_id": 42,
    "name": "2026",
    "starts_on": "2026-02-01",
    "ends_on": "2026-12-15",
    "period_template": "trimester",
    "status": "draft",
    "timezone": "America/Sao_Paulo",
    "academic_periods": [
      {
        "id": 101,
        "name": "1º trimestre",
        "sequence": 1,
        "starts_on": "2026-02-01",
        "ends_on": "2026-05-15",
        "closure_status": "open"
      }
    ]
  }
}
```

### `GET /school_years/active`

Response `200` — active year with embedded collections:

```json
{
  "data": {
    "id": 10,
    "name": "2026",
    "status": "active",
    "starts_on": "2026-02-01",
    "ends_on": "2026-12-15",
    "academic_periods": [ "..." ],
    "school_holidays": [ "..." ]
  }
}
```

Response `422` when no active year exists:

```json
{
  "error": {
    "code": "no_active_school_year",
    "message": "Nenhum ano letivo ativo.",
    "details": {}
  }
}
```

### `POST /school_years/:id/activate`

No body. Response `200`:

```json
{
  "data": {
    "id": 10,
    "status": "active",
    "archived_year_id": 9
  }
}
```

`archived_year_id` present when a prior active year was archived in the same transaction (BR-SY06).

### `POST /school_years/:id/archive`

No body. Response `200`:

```json
{
  "data": {
    "id": 10,
    "status": "archived"
  }
}
```

---

## Academic periods (W1)

Platform owns period **existence** and date ranges. Closure transitions live in Academic BC6.

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/school_years/:year_id/academic_periods` | active staff | List periods for year |
| `POST` | `/school_years/:year_id/academic_periods` | `manage_school_settings` | Create period — **draft year only**; required for `period_template: custom` (BR-SY04) |
| `PATCH` | `/academic_periods/:id` | `manage_school_settings` | Adjust dates — **draft year only** |

All paths above are relative to base `/api/v1/schools/:school_id` (e.g. full PATCH path is
`/api/v1/schools/:school_id/academic_periods/:id`).

Period closure routes live under Academic BC6 at
`/schools/:school_id/academic/academic_periods/:id/close` — not under Platform paths above.

### `POST /school_years/:year_id/academic_periods`

Required when `period_template` is `custom` (infantil / fewer periods). Auto-generated templates
(`bimester`, `trimester`) do not need manual creates unless adjusting the set before activate.

```json
{
  "name": "1º bimestre",
  "sequence": 1,
  "starts_on": "2026-02-01",
  "ends_on": "2026-04-30"
}
```

### `PATCH /academic_periods/:id`

Request:

```json
{
  "starts_on": "2026-02-05",
  "ends_on": "2026-05-20",
  "name": "1º trimestre"
}
```

Response includes read-only `closure_status` (default `open`). Attempting to PATCH
`closure_status` on this route returns `422 validation_error`.

Periods must stay within parent year bounds and must not overlap siblings (BR-SY03).

---

## Holidays (W1)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/school_years/:year_id/holidays` | active staff | List holidays |
| `POST` | `/school_years/:year_id/holidays` | `manage_school_settings` | Create — draft or active year (UC-SY03) |
| `PATCH` | `/holidays/:id` | `manage_school_settings` | Update name, date, `applies_to_attendance` |
| `DELETE` | `/holidays/:id` | `manage_school_settings` | Soft delete |

Flat holiday paths are relative to base `/api/v1/schools/:school_id`.

Holiday `date` must fall within the parent school year bounds (`starts_on`–`ends_on`).

### `POST /school_years/:year_id/holidays`

```json
{
  "date": "2026-04-21",
  "name": "Tiradentes",
  "applies_to_attendance": true
}
```

`applies_to_attendance: true` suppresses attendance expectations on that date (BR-SY05).

---

## Domain events (document only)

Emitted by services; not HTTP endpoints.

| Event | Trigger | Payload (summary) | Consumers |
|-------|---------|-------------------|-----------|
| `SchoolYearActivated` | UC-SY02 — year activated | `school_id`, `school_year_id`, `archived_year_id` | Students (rollover), academic (diary scoping), billing (cycle anchor) |
| `SchoolYearArchived` | Explicit archive or superseded on activate | `school_id`, `school_year_id` | Read-only enforcement on enrollments/charges |

Activate and archive transitions are audited per NFR-005 (modeling 009).

---

## Errors

Standard envelope per [`docs/api/README.md`](../README.md).

| HTTP | `error.code` | When |
|------|--------------|------|
| `401` | `unauthorized` | Missing or invalid JWT |
| `403` | `forbidden` | Active staff without required permission; guardian on Platform routes |
| `404` | `not_found` | Unknown id or cross-school access |
| `409` | `year_in_use` | DELETE year with enrollments or charges (BR-SY08) |
| `409` | `active_year_exists` | Race: concurrent activate when another year is active |
| `409` | `invalid_state_transition` | e.g. activate archived year, PATCH draft fields on active year |
| `422` | `validation_error` | Invalid dates, unknown template, field errors in `details` |
| `422` | `period_overlap` | Overlapping period ranges within year (BR-SY03) |
| `422` | `invalid_period_range` | Period outside year bounds (BR-SY03) |
| `422` | `archived_school_year` | Mutation blocked on archived year |
| `422` | `no_active_school_year` | `GET /school_years/active` or downstream guard (UC-SY04) |
| `501` | `not_implemented` | Route frozen but not yet shipped in `web/` |

### Example — activate without periods

```json
{
  "error": {
    "code": "invalid_state_transition",
    "message": "Ano letivo não pode ser ativado sem períodos.",
    "details": { "requirement": "at_least_one_period" }
  }
}
```

### Example — delete year in use

```json
{
  "error": {
    "code": "year_in_use",
    "message": "Ano letivo possui matrículas ou cobranças vinculadas.",
    "details": { "enrollments_count": 42, "charges_count": 15 }
  }
}
```

---

## Deferred — Phase 4C.1b

The following Platform & Admin waves are **out of scope** for Phase 4C.1. Narratives remain
draft until **4C.1b** gate:

| Wave | Scope | PRD |
|------|--------|-----|
| **W2** | Calendar events (`calendar_events`) — institutional + personal | [`calendar.md`](../../prds/platform-and-admin/calendar.md) |
| **W3** | Backoffice tenant ops — module flags, provisioning dashboard | [`backoffice.md`](../../prds/platform-and-admin/backoffice.md) |
| **W4** | Staff roster, menu visibility | [`staff-users.md`](../../prds/platform-and-admin/staff-users.md) |
| **W5** | Product access, app links, getting started | [`onboarding.md`](../../prds/platform-and-admin/onboarding.md) |

Do not implement calendar CRUD or backoffice module routes as part of 4C.1 engineering.

---

## Backoffice operations — E1/E2 (draft)

> **Status: draft** — not frozen. Engineering ships after PRD validation per
> [`backoffice-evolution.md`](../../prds/platform-and-admin/backoffice-evolution.md).  
> Namespace: `/api/v1/schools` for tenant ops; `/api/v1/platform/` for cross-tenant ops.  
> JWT role `backoffice` + Pundit — **not** `/api/v1/backoffice/`.

W3 backoffice UI is **in progress** (partial staging): register, wizard, PATCH modules exist; E1
closes UI gaps.

### E1 — Tenant detail and modules

Base: `/api/v1/schools`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/:id/modules` | `manage_backoffice_ops` | Module map `{ communication, academic, billing, documents }` |
| `GET` | `/:id` | `manage_backoffice_ops` or `provision_school` | Show with `?include=modules,active_school_year,aggregate_counts` |

**Aggregate counts** (no PII): `{ students_count, staff_count }` — names excluded (BR-BOE03).

Existing routes used by E1 wizard (W1 frozen):

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/:school_id/school_years` | `provision_school` during provisioning | Create draft year (UC-BOE02) |
| `POST` | `/:school_id/school_years/:id/activate` | `provision_school` during provisioning | Activate first year |

Module PATCH (implemented):

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `PATCH` | `/:id/modules` | `manage_backoffice_ops` | Toggle module flags (UC-BO03) |

### E2 — Search, audit, discarded schools

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/schools` | `manage_backoffice_ops` | Extended filters: `q`, `saas_plan`, `created_after`, `created_before`, `discarded`, `onboarding_status` |
| `GET` | `/platform/audits` | `manage_backoffice_ops` | Cross-tenant audit log — paginated; filters `school_id`, `action`, `date_from`, `date_to` |
| `POST` | `/schools/:id/restore` | `manage_backoffice_ops` | Undiscard school (BR-BOE06) |
| `POST` | `/schools/:id/provisioning/resend_invites` | `provision_school` | Optional bulk invite resend (rate limited) |
| `GET` | `/platform/operators` | `manage_backoffice_ops` | Read-only backoffice users + platform permissions — consumed by **Operators tab on `/users`** (no `/operators` route) |

### E2 errors (additional)

| HTTP | `error.code` | When |
|------|--------------|------|
| `403` | `backoffice_only` | Non-backoffice role on platform routes |
| `409` | `not_discarded` | Restore on active school |
| `429` | `rate_limited` | Invite resend throttled |

E3 P2 routes (`/platform/subscriptions`, `/platform/impersonations`, `/platform/analytics/overview`,
`/platform/school_groups`, help taxonomy) are **implemented** per MVP decisions in
[`open-questions.md`](../../open-questions.md) § Platform & admin.

### E3 — Multi-unit, billing, analytics, impersonation, help taxonomy (P2)

Base: `/api/v1/platform`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/school_groups` | `manage_multi_unit` | Paginated list of school groups |
| `POST` | `/school_groups` | `manage_multi_unit` | Create group (`name`, `headquarters_cnpj`) |
| `GET` | `/school_groups/:id` | `manage_multi_unit` | Show group with `schools_count` |
| `PATCH` | `/school_groups/:id` | `manage_multi_unit` | Update group metadata |
| `DELETE` | `/school_groups/:id` | `manage_multi_unit` | Discard empty group — `409 group_has_schools` if members remain |
| `GET` | `/school_groups/:id/schools` | `manage_multi_unit` | List member schools (summary) |
| `POST` | `/school_groups/:id/assign_school` | `manage_multi_unit` | Body `{ school_id }` — `409 school_already_in_group` when assigned elsewhere |
| `DELETE` | `/school_groups/:id/schools/:school_id` | `manage_multi_unit` | Unassign school from group |
| `GET` | `/plans` | `manage_platform_billing` | List SaaS plans (`starter`, `pro`, `enterprise`) |
| `GET` | `/subscriptions` | `manage_platform_billing` | Paginated subscriptions — filters `status`, `school_id` |
| `POST` | `/subscriptions` | `manage_platform_billing` | Assign plan to school — `409 subscription_exists` |
| `PATCH` | `/subscriptions/:id` | `manage_platform_billing` | Update status/plan — plan change audited |
| `GET` | `/subscriptions/:id` | `manage_platform_billing` | Show subscription with plan + school summary |
| `GET` | `/analytics/overview` | `view_analytics_dashboard` or `manage_backoffice_ops` | Aggregate KPIs — optional `date_from`, `date_to` |
| `POST` | `/impersonations` | `manage_backoffice_ops` | Start impersonation — returns 15min scoped JWT |
| `DELETE` | `/impersonations/:id` | `manage_backoffice_ops` | End impersonation session |
| `GET` | `/help_taxonomy/categories` | `configure_help_taxonomy` | Paginated taxonomy categories |
| `POST` | `/help_taxonomy/categories` | `configure_help_taxonomy` | Create category |
| `GET` | `/help_taxonomy/categories/:id` | `configure_help_taxonomy` | Show category |
| `PATCH` | `/help_taxonomy/categories/:id` | `configure_help_taxonomy` | Update category |
| `DELETE` | `/help_taxonomy/categories/:id` | `configure_help_taxonomy` | Discard category |

**Impersonation JWT claims:** `sub` (target user), `impersonated_by`, `impersonation_session_id`,
`school_id`, `membership_id`; 15-minute TTL. `GET /me` includes `impersonation` block when active.
Audited actions during impersonation attribute to operator with `impersonating: true`.

**Analytics response (no PII):**

```json
{
  "data": {
    "active_schools": 10,
    "provisioning_count": 2,
    "module_adoption": {
      "communication": 0.9,
      "academic": 0.85,
      "billing": 0.8,
      "documents": 0.75
    },
    "mrr_cents": 599000,
    "onboarding_funnel": {
      "provisioning": 2,
      "pending_handoff": 1,
      "active": 10
    }
  }
}
```

### E3 errors (additional)

| HTTP | `error.code` | When |
|------|--------------|------|
| `409` | `group_has_schools` | Discard group with member schools |
| `409` | `school_already_in_group` | Assign school already linked to another group |
| `409` | `subscription_exists` | Create second subscription for same school |
| `422` | `validation_error` | Invalid params / persona tags / dates |

---

## OpenAPI tags

`Platform`, `School Years`, `Academic Periods`, `Holidays`

W2+ tags (`Calendar`, `Backoffice`) apply after Phase 4C.1b freeze. E1/E2 backoffice tags:
`Backoffice`, `Platform Audits`, `School Modules`.

