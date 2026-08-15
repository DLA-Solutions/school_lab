# API v1 — Platform & Admin

> PRDs: [`docs/prds/platform-and-admin/`](../../prds/platform-and-admin/)  
> Modeling: [`docs/modeling/009-platform-admin.md`](../../modeling/009-platform-admin.md)  
> Conventions: [`docs/api/README.md`](../README.md)

Routes for school year, calendar, backoffice tenant ops, and staff menu configuration.

## Cross-domain contract: `school_year_id`

All year-scoped domains require explicit year context:

| Mechanism | Usage |
|-----------|--------|
| Query param | `?school_year_id=123` on enrollments, attendance, grades, archive |
| Header | `X-School-Year-Id: 123` optional alternative |
| Active year | `GET /schools/:school_id/school_years/active` — default for clients |

Academic period closure mutates `academic_periods.closure_status` — owned by academic API with
platform period definitions as read-only boundaries.

---

## School years (W1)

Base: `/api/v1/schools/:school_id`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/school_years` | `manage_academic` or `manage_enrollments` | List years |
| `POST` | `/school_years` | owner or `manage_academic` | Create with period template |
| `GET` | `/school_years/active` | any staff | Current active year |
| `PATCH` | `/school_years/:id` | owner or `manage_academic` | Update draft year |
| `POST` | `/school_years/:id/activate` | owner | draft → active (BR-SY06) |
| `POST` | `/school_years/:id/archive` | owner | active → archived |

### `POST /school_years`

```json
{
  "name": "2026",
  "starts_on": "2026-02-01",
  "ends_on": "2026-12-15",
  "period_template": "trimester"
}
```

Response `201`: year + generated `academic_periods[]`.

---

## Academic periods

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school_years/:year_id/academic_periods` | List periods |
| `PATCH` | `/academic_periods/:id` | Adjust dates (draft year only) |

---

## Holidays

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school_years/:year_id/holidays` | List |
| `POST` | `/school_years/:year_id/holidays` | Create |
| `DELETE` | `/holidays/:id` | Soft delete |

---

## Calendar events (W2)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/calendar_events` | Institutional + my events (`from`, `to`) |
| `POST` | `/calendar_events` | Create institutional (staff) or personal |

---

## Backoffice (global)

Base: `/api/v1/backoffice`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/schools` | Tenant list — `provision_school` |
| `POST` | `/schools` | Create tenant — extends identity onboarding |
| `PATCH` | `/schools/:id/module_flags` | Enable comms/academic modules |

**MVP scope:** school registration, module flags, provisioning dashboard — **not** platform SaaS
billing to schools (phase 2).

---

## Errors

| HTTP | `error.code` | When |
|------|--------------|------|
| `409` | `active_year_exists` | Second active year (BR-SY01) |
| `422` | `period_overlap` | Invalid period dates (BR-SY03) |

---

## OpenAPI tags

`Platform`, `School Years`, `Calendar`, `Backoffice`
