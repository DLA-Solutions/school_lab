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

## Actors and surfaces

| Actor | Surfaces | Notes |
|-------|----------|-------|
| director, owner | Web SPA (`/app`) | Create, activate, and archive school years; manage periods and holidays (`manage_school_settings`) |
| staff, teacher | Web SPA + mobile | Read active year, periods, and holidays |
| backoffice | Web SPA (`/backoffice`) | Create first school year during provisioning (`provision_school`) |
| guardian | — | No Platform W1 access — `403 forbidden` on all routes |

Detail: [`docs/actors-and-surfaces.md`](../../actors-and-surfaces.md).

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

On year create, **director or owner** may apply a **template**: `bimester` (4 periods), `trimester` (3), or
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

BR-SY10

**Instructional days** (`school_instructional_days`): `school_year_id`, `date`, `instructional`
(boolean) — one row per date the admin has explicitly decided about. Unlike `school_holidays`
(BR-SY05, an exclusion list), there is no weekday-pattern inference: a date with no row is simply
undecided, and academic BC's lesson-plan calendar ([`academic/lesson-plans.md`](../academic/lesson-plans.md)
BR-LP03) treats undecided the same as non-instructional — never guesses. `date` must fall within
the school year's bounds; unique per `(school_year_id, date)`. A date marked instructional here
while also present in `school_holidays` is a configuration conflict the admin screen should
surface, not silently resolve `[product decision]`.

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

### UC-SY05 — Mark instructional days (BR-SY10)

Input: `school_year_id`, a set of `{date, instructional}` pairs — typically one calendar month at
a time from the admin's day-by-day screen.

Flow

1. Validate `manage_school_settings`.
2. Upsert `school_instructional_days` rows for the given dates (BR-SY10); dates not included are
   left as they were (still undecided, if they always were).
3. Academic BC's lesson-plan calendar (`academic/lesson-plans.md` UC-LP01) reads this per class's
   school year.

---

## API

**Frozen contract (Phase 4C.1):** [`docs/api/v1/platform-and-admin.md`](../../api/v1/platform-and-admin.md) § School years, Academic periods, Holidays.

All routes are tenant-scoped under `/api/v1/schools/:school_id`. Mutations require
`manage_school_settings` (director system template or owner). Reads require any active staff
membership.

| Area | Summary |
|------|---------|
| School years | List, create, show, update (draft only), delete, activate, archive, `GET /school_years/active` |
| Academic periods | List/create under year; PATCH dates on draft year only — closure via Academic BC6 |
| Holidays | Nested CRUD under `/school_years/:year_id/holidays`; flat PATCH/DELETE on `/holidays/:id` |
| Instructional days *(new, BR-SY10/UC-SY05)* | `GET/PUT /school_years/:year_id/instructional_days` — bulk read/write `{date, instructional}` pairs |

Do not implement flat `/api/v1/school_years` paths — superseded by tenant-scoped routes above.

---

## Errors

Standard envelope per [`docs/api/README.md`](../../api/README.md). Full catalog in frozen API narrative.

| Status | Code | Description |
|--------|------|-------------|
| 403 | `forbidden` | Guardian or staff without required permission |
| 404 | `not_found` | Unknown id or cross-school access |
| 409 | `year_in_use` | DELETE year with enrollments or charges (BR-SY08) |
| 409 | `active_year_exists` | Concurrent activate when another year is active |
| 409 | `invalid_state_transition` | e.g. activate archived year, PATCH draft fields on active year |
| 422 | `validation_error` | Invalid dates, unknown template |
| 422 | `period_overlap` | Overlapping period ranges within year (BR-SY03) |
| 422 | `invalid_period_range` | Period outside year bounds (BR-SY03) |
| 422 | `archived_school_year` | Mutation blocked on archived year |
| 422 | `no_active_school_year` | Downstream guard (UC-SY04) |
| 501 | `not_implemented` | Route frozen but not yet shipped in `web/` |

---

## Database

| Entity | Purpose |
|--------|---------|
| `school_years` | Ano letivo container |
| `academic_periods` | Bimester/trimester boundaries |
| `school_holidays` | Non-school days |
| `school_instructional_days` *(new, BR-SY10)* | Explicit day-by-day instructional marking, consumed by `academic/lesson-plans.md` |
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
| CRUD years, periods, holidays | `manage_school_settings` — director system template or owner (see permissions PRD appendix) |
| Read active year | All active staff memberships |

Backoffice may configure during `provisioning` via `provision_school` (identity BR-O03).

---

## Non-functional requirements

- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — `school_id` on all rows.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — year activation audited.

---

## Acceptance Criteria

AC-SY01

- [ ] Given no active year, when **director or owner** creates 2026 with trimester template, then 3 periods are generated within year dates.
- Source: [`proesc/gestao-academica/modelo-de-dominio.md`](../../ref/proesc/gestao-academica/modelo-de-dominio.md)

AC-SY02

- [ ] Given active year 2025, when **director or owner** activates 2026, then 2025 becomes archived and 2026 is sole active.
- Source: `[product decision]`

AC-SY03

- [ ] Given holiday on date D, when teacher opens attendance for D, then UI indicates non-school day.
- Source: `[product decision]` — handoff to academic attendance

AC-SY04

- [ ] Given enrollments exist for year Y, when DELETE year Y, then 409 year_in_use.
- Source: `[invented]`

AC-SY05 *(BR-SY10)*

- [ ] Given a date has no `school_instructional_days` row, When a teacher opens the lesson-plan
      calendar for that date, Then it renders as non-instructional (not clickable) — undecided
      never defaults to instructional.
- Source: `[product decision]`, consumed by [`academic/lesson-plans.md`](../academic/lesson-plans.md) AC-LP02

---

## Open items

- [x] Default period template — `trimester` for new schools; `bimester` and `custom` remain
      selectable at year create (BR-SY04).
- [ ] Whether financial year can diverge from academic year — MVP: same container.
- [ ] Whether marking a date instructional that is also a `school_holidays` row should be blocked
      outright or just flagged in the admin UI (BR-SY10).

---

## Out of Scope

- Period **closure** checklists — [`academic/periods.md`](../academic/periods.md).
- Class/turma import between years — students enrollment flows.
- Multi-unit consolidated year view — P2.
