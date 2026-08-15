# PRD — Platform: School Year (BC1)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `platform.configure_school_year`  
> Related BCs: [`calendar.md`](calendar.md); consumers: [`academic/periods.md`](../academic/periods.md), [`billing/charges.md`](../billing/charges.md), [`students-and-enrollments/enrollments.md`](../students-and-enrollments/enrollments.md)  
> Modeling: [`009-platform-admin.md`](../../modeling/009-platform-admin.md)  
> API narrative: [`platform-and-admin.md`](../../api/v1/platform-and-admin.md)

---

## Objective

Define the **school year (ano letivo)**, **academic period boundaries**, and **institutional
holidays** that academic, billing, enrollment, and archive domains use as their shared time axis.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Configure school year and calendar periods | `platform.configure_school_year` | [`proesc/gestao-academica/modelo-de-dominio.md`](../../ref/proesc/gestao-academica/modelo-de-dominio.md) — exercício → curso → turma; [`proesc/gestao-academica/casos-de-borda.md`](../../ref/proesc/gestao-academica/casos-de-borda.md) (next year must exist before rematrícula) |
| Year rollover | *(related)* | [`proesc/README.md`](../../ref/proesc/README.md) — finalização de ano letivo category |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | May use fewer periods |
| `fundamental_medio` | yes | Bimester or trimester templates |
| `pj_financeiro` | yes | Billing references same year |
| `multi_unidade` | partial | Per-school year; group config P2 |

---

## Context

Proesc models **exercício** as the top-level academic/financial container. School Lab academic PRDs
consume `school_year_id` and `academic_period_id` but defer entity ownership here.

**Academic owns** period **closure** state and checklists ([`academic/periods.md`](../academic/periods.md)).
**Platform owns** period **existence**, date ranges, and holidays.

**Multi-unit:** MVP supports one campus per `school_id`. Multi-unit group roll-ups are P2
(`platform.manage_multi_unit`).

---

## Business Rules

BR-SY01 — `capability_id`: `platform.configure_school_year`

Exactly **one** `school_years` row per school may have `status = active` at a time.

BR-SY02

School year fields: `name` (e.g. "2026"), `starts_on`, `ends_on`, `timezone` (inherits from
`schools.timezone` by default), `status` ∈ `draft | active | archived`.

BR-SY03

**Academic periods** (`academic_periods`): `name`, `sequence`, `starts_on`, `ends_on`,
`school_year_id`. Periods must not overlap within a year; must fall within year bounds.

BR-SY04

On year create, secretary may apply a **template**: `bimester` (4 periods), `trimester` (3), or
`custom`. Default template **`trimester`** for new schools `[product decision Aug 2026]` — schools
may switch to `bimester` at year create; infantil may use fewer periods via `custom`.

BR-SY05

**Holidays** (`school_holidays`): `date`, `name`, optional `applies_to_attendance` boolean.
Holidays suppress attendance expectations in academic BC1 `[product decision]`.

BR-SY06

Transition `draft` → `active` requires at least one period. If another year is active, the same
transaction archives it before activating the target year, preserving BR-SY01 at commit.

BR-SY07

Archiving a year blocks **new** enrollments and charge generation for that year; existing closed
periods remain readable. Academic closure gates still enforced by academic BC6.

BR-SY08

Deleting a year with enrollments or charges returns `409 year_in_use`.

BR-SY09

All queries scoped by `school_id` (NFR-003).

---

## Use Cases

### UC-SY01 — Create school year with periods

Input: name, dates, period template.

Flow

1. Validate dates and template.
2. Create `school_years` in `draft`.
3. Generate `academic_periods` from template.
4. Return year + periods.

### UC-SY02 — Activate school year

Input: `school_year_id`.

Flow

1. Validate BR-SY01, BR-SY06.
2. Archive prior active year.
3. Set new year `active`.
4. Emit `SchoolYearActivated`.

### UC-SY03 — Manage holidays

Input: holiday list CRUD.

Flow

1. Upsert holidays for active or draft year.
2. Academic attendance jobs consult holiday table.

### UC-SY04 — Resolve active year (internal)

Flow

1. Services call `Platform::ActiveSchoolYearService`.
2. Returns active year or `422 no_active_school_year`.

---

## API

### GET /api/v1/school_years

List years for current school (staff).

### POST /api/v1/school_years

Create draft year with optional template.

Request

```json
{
  "name": "2026",
  "starts_on": "2026-02-01",
  "ends_on": "2026-12-15",
  "period_template": "trimester"
}
```

### POST /api/v1/school_years/:id/activate

Activate year (BR-SY06).

### GET /api/v1/school_years/active

Returns active year with embedded periods and holidays.

### PATCH /api/v1/academic_periods/:id

Adjust period dates within year bounds (secretary).

### CRUD /api/v1/school_holidays

Holiday management.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 409 | `year_in_use` | BR-SY08 |
| 422 | `invalid_period_range` | Overlap or out of bounds |
| 422 | `no_active_school_year` | Downstream guard |

---

## Database

| Entity | Purpose |
|--------|---------|
| `school_years` | Ano letivo container |
| `academic_periods` | Bimester/trimester boundaries |
| `school_holidays` | Non-school days |
| `schools.timezone` | IANA timezone inherited by year/calendar operations |

`academic_periods.closure_status` remains on the period row: Platform owns its date boundaries and
Academic BC6 owns closure transitions.

| Artifact | Location |
|----------|----------|
| Narrative DSL | [`docs/modeling/009-platform-admin.md`](../../modeling/009-platform-admin.md) |
| DBML | [`docs/database/schema.dbml`](../../database/schema.dbml) |
| DER | [`docs/database/der_009.png`](../../database/der_009.png) |

---

## Events

| Event | Consumers |
|-------|-----------|
| `SchoolYearActivated` | Students (rollover prompts), academic (diary scoping), billing (cycle anchor) |
| `SchoolYearArchived` | Read-only enforcement |

---

## Permissions

| Action | Permission key |
|--------|----------------|
| CRUD years, periods, holidays | `manage_school_settings` on director/secretary templates |
| Read active year | All staff memberships |

Backoffice may configure during `provisioning` via `provision_school` (identity BR-O03).

---

## Non-functional requirements

- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — `school_id` on all rows.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — year activation audited.

---

## Acceptance Criteria

AC-SY01

- [ ] Given no active year, when secretary creates 2026 with trimester template, then 3 periods are generated within year dates.
- Source: [`proesc/gestao-academica/modelo-de-dominio.md`](../../ref/proesc/gestao-academica/modelo-de-dominio.md)

AC-SY02

- [ ] Given active year 2025, when secretary activates 2026, then 2025 becomes archived and 2026 is sole active.
- Source: `[product decision]`

AC-SY03

- [ ] Given holiday on date D, when teacher opens attendance for D, then UI indicates non-school day.
- Source: `[product decision]` — handoff to academic attendance

AC-SY04

- [ ] Given enrollments exist for year Y, when DELETE year Y, then 409 year_in_use.
- Source: `[invented]`

---

## Open items

- [x] Default period template — `trimester` for new schools; `bimester` and `custom` remain
      selectable at year create (BR-SY04).
- [ ] Whether financial year can diverge from academic year — MVP: same container.

---

## Out of Scope

- Period **closure** checklists — [`academic/periods.md`](../academic/periods.md).
- Class/turma import between years — students enrollment flows.
- Multi-unit consolidated year view — P2.
