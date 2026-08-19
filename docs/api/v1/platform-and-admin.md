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
| `GET` | `/schools` | `manage_backoffice_ops` | Extended filters: `q`, `saas_plan` (**legacy param name** — filter via `platform_subscriptions` / plan `key`, not `schools.saas_plan` column), `created_after`, `created_before`, `discarded`, `onboarding_status` |
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
`/platform/school_groups`, help taxonomy) are **implemented** for the E3 manual bar per
[`open-questions.md`](../../open-questions.md) § Platform & admin. **Checkout, school-scoped
subscription, invoices, and Iugu webhook** are specified in
[Platform subscription billing](#platform-subscription-billing-frozen--implementation-contract)
below — **frozen** as the implementation contract (2026-08-19). W1 freeze above is unchanged.

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
| `GET` | `/plans` | `manage_platform_billing` | List SaaS plans (`starter`, `pro`, `enterprise`); see frozen billing section for intervals |
| `GET` | `/subscriptions` | `manage_platform_billing` | Paginated subscriptions — filters `status`, `school_id` |
| `POST` | `/subscriptions` | `manage_platform_billing` | Assign plan to school — `409 subscription_exists`; body may include `provider: manual \| iugu` |
| `PATCH` | `/subscriptions/:id` | `manage_platform_billing` | Manual/local fields only (`status`, `trial_ends_at`). Iugu plan/interval change uses `POST .../change_plan` — PATCH of those fields on Iugu rows → `409 invalid_state_transition` |
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

## Platform subscription billing (frozen — implementation contract)

> **API status: frozen (platform-subscription-billing — 2026-08-19)**  
> PRD: [`platform-subscription-billing.md`](../../prds/platform-and-admin/platform-subscription-billing.md)  
> ADR: [`002-platform-billing-gateway.md`](../../adr/002-platform-billing-gateway.md)  
> Modeling: [`009-platform-admin.md`](../../modeling/009-platform-admin.md)

Engineering implements against this section. Paths not yet in `web/` return `501` /
`not_implemented` until the collection epic ships. This freeze does **not** unfreeze W1.

**Boundary:** school→guardian Cora billing stays on `POST /webhooks/:provider/:token` and
`/api/v1/schools/:school_id/billing/*`. Platform SaaS never uses that webhook or
`school_payment_providers`.

### Backoffice extensions — `/api/v1/platform`

Permission: `manage_platform_billing`. School JWTs → `403 backoffice_only`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/plans` | Catalog with intervals. Each plan includes `intervals[]` (`billing_interval`, `amount_cents`, optional `provider`). Keep `monthly_amount_cents` during dual-write; clients should prefer `amount_cents` for the selected interval. School JWT → `403 backoffice_only`; school SPA uses `GET /schools/:school_id/platform_plans`. |
| `POST` | `/subscriptions` | Assign plan. Body: `school_id`, `platform_plan_id` or `plan_key`, `billing_interval` (`month` \| `year`), `provider` (`manual` \| `iugu`). Optional `trial` (boolean; 14 days when true). `provider: manual` skips collector. |
| `POST` | `/subscriptions/:id/checkout` | Ensure vendor customer + subscription; return hosted invoice URL. |
| `GET` | `/subscriptions/:id/invoices` | Paginated platform invoices for that subscription. |
| `POST` | `/subscriptions/:id/change_plan` | Optional operator path — same semantics as school `change_plan`. |
| `POST` | `/subscriptions/:id/cancel` | Optional operator path — default `at_period_end: true`. |

Existing `GET /subscriptions` and `GET /subscriptions/:id` remain. `PATCH /subscriptions/:id`
updates **manual/local** fields only (`status`, `trial_ends_at` for `provider: manual`).
Changing `platform_plan_id` or `billing_interval` on an Iugu row via PATCH →
`409 invalid_state_transition`; use `POST .../change_plan`. Show/list may include
`provider`, `billing_interval`, `external_customer_id`, `external_subscription_id`,
`current_period_start`, `cancel_at_period_end`, `canceled_at`, `collection_method` for operators.

Iugu checkout requires `schools.cnpj` and a billing email (`users.email` of the director, or
owner/director membership email for operator checkout) — `422 validation_error` if missing.

#### POST `/subscriptions/:id/checkout` — request

```json
{
  "trial": true
}
```

#### POST `/subscriptions/:id/checkout` — response `200`

```json
{
  "data": {
    "checkout_url": "https://faturas.iugu.com/example",
    "billing_portal_url": null,
    "subscription_id": 1
  }
}
```

`billing_portal_url` is always `null` while Iugu `hosted_billing_portal` is false.
Requesting a portal session returns `501 portal_not_supported`.

### School-scoped — `/api/v1/schools/:school_id`

Permission: `manage_school_settings`. Guardian / teacher / secretary without that key → `403`.
Wrong `school_id` → `404` (no existence leak). JSON **omits** raw Iugu IDs.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/platform_plans` | School-scoped catalog for checkout. Each plan: `key`, `name`, `intervals[]` (`billing_interval` `month` \| `year`, `amount_cents`). No Iugu/external IDs. |
| `GET` | `/platform_subscription` | Current kept subscription + plan summary; `billing_portal_url: null`; open invoice `pay_url` when present |
| `POST` | `/platform_subscription/checkout` | UC-PSB01 — body `plan_key`, `billing_interval`, optional `trial` |
| `POST` | `/platform_subscription/change_plan` | UC-PSB03 — body `plan_key`, `billing_interval` |
| `POST` | `/platform_subscription/cancel` | UC-PSB04 — body `{ "at_period_end": true }` (default true) |
| `GET` | `/platform_subscription/invoices` | Paginated invoices; each open row includes `hosted_invoice_url` |

#### GET `/platform_plans` — response `200`

```json
{
  "data": [
    {
      "key": "starter",
      "name": "Starter",
      "intervals": [
        { "billing_interval": "month", "amount_cents": 19900 },
        { "billing_interval": "year", "amount_cents": 238800 }
      ]
    }
  ]
}
```

JSON does **not** include Iugu or other external IDs. Guardian / teacher / secretary without
`manage_school_settings` → `403`. Cross-school → `404`. School JWT on
`GET /api/v1/platform/plans` remains `403 backoffice_only`.

#### GET `/platform_subscription` — response `200`

```json
{
  "data": {
    "id": 1,
    "status": "active",
    "plan_key": "starter",
    "plan_name": "Starter",
    "billing_interval": "month",
    "amount_cents": 19900,
    "current_period_start": "2026-08-01T00:00:00Z",
    "current_period_end": "2026-09-01T00:00:00Z",
    "trial_ends_at": null,
    "cancel_at_period_end": false,
    "collection_method": "automatic",
    "billing_portal_url": null,
    "open_invoice": {
      "id": 10,
      "status": "open",
      "amount_cents": 19900,
      "due_at": "2026-08-10T00:00:00Z",
      "hosted_invoice_url": "https://faturas.iugu.com/example",
      "payment_method": null
    }
  }
}
```

No current subscription: **`200` with `"data": null`** so the SPA can render empty checkout.
Cross-school remains `404`. Do not use `404` for “no subscription yet” on a school the caller
may access.

#### POST `/platform_subscription/checkout` — request

```json
{
  "plan_key": "pro",
  "billing_interval": "year",
  "trial": false
}
```

#### POST `/platform_subscription/checkout` — response `201`

```json
{
  "data": {
    "checkout_url": "https://faturas.iugu.com/example",
    "billing_portal_url": null
  }
}
```

#### POST `/platform_subscription/change_plan` — request

```json
{
  "plan_key": "enterprise",
  "billing_interval": "month"
}
```

#### POST `/platform_subscription/cancel` — request

```json
{
  "at_period_end": true
}
```

#### GET `/platform_subscription/invoices` — response `200`

```json
{
  "data": [
    {
      "id": 10,
      "status": "open",
      "amount_cents": 19900,
      "due_at": "2026-08-10T00:00:00Z",
      "paid_at": null,
      "hosted_invoice_url": "https://faturas.iugu.com/example",
      "payment_method": null
    }
  ],
  "meta": { "page": 1, "per_page": 25, "count": 1 }
}
```

School invoice JSON does **not** include `external_invoice_id`. Backoffice invoice list **may**.

### Webhook — no JWT

```
POST /webhooks/platform_billing/:provider/:token
```

| Param | Meaning |
|-------|---------|
| `:provider` | `iugu` (later `stripe` / `fake` for tests) |
| `:token` | `platform_billing_settings.webhook_endpoint_token` (seeded from `PLATFORM_BILLING_WEBHOOK_TOKEN`) |

Unknown pair → `404`. **Do not** route these events to `POST /webhooks/:provider/:token`
(Cora / `SchoolPaymentProvider`).

Authenticity: secret URL token. Persist `webhook_events` (`school_id` nullable until
`external_subscription_id` matches). Idempotent on `(provider, provider_event_id)`. Enqueue
`Platform::ReconcileBillingEventJob`; parser `Webhooks::Parsers::IuguPlatformBilling` maps
vendor types to canonical `billing.*` events. Outcome is confirmed via port
`fetch_subscription` / `fetch_invoice` (polling fallback).

Response: `202` accepted (or `204`) after enqueue; duplicate provider event → `200` no-op.

### Error catalog (this freeze)

| HTTP | `error.code` | When |
|------|--------------|------|
| `403` | `backoffice_only` | School JWT on `/api/v1/platform/plans` or `/api/v1/platform/subscriptions*` |
| `403` | `forbidden` | Missing `manage_platform_billing` or `manage_school_settings` |
| `404` | `not_found` | Unknown id, unknown webhook token, or cross-school |
| `409` | `subscription_exists` | Second non-canceled kept subscription |
| `409` | `invalid_state_transition` | Checkout / change_plan / cancel not allowed in current status |
| `422` | `validation_error` | Invalid `plan_key`, `billing_interval`, missing CNPJ, or missing billing email |
| `501` | `portal_not_supported` | Port `create_billing_portal_session` (no Iugu customer portal) |
| `501` | `not_implemented` | Frozen route not yet in `web/`, or school checkout while `active_provider` is `manual` |

---

## OpenAPI tags

`Platform`, `School Years`, `Academic Periods`, `Holidays`

W2+ tags (`Calendar`, `Backoffice`) apply after Phase 4C.1b freeze. E1/E2 backoffice tags:
`Backoffice`, `Platform Audits`, `School Modules`. Collection epic: `Platform Subscriptions`,
`Platform Invoices`. Platform billing webhook stays **out of public OpenAPI** (same policy as
Cora ingress in [`docs/api/README.md`](../README.md)).

