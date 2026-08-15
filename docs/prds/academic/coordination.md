# PRD — Academic: Coordination Dashboard (BC8)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `academic.view_academic_dashboard`  
> Related BCs: all academic BCs *(read aggregates)*  
> Modeling: *(pending — `docs/modeling/007-academic.md`)*  
> API narrative: *(pending — `docs/api/v1/academic.md`)*

---

## Objective

Provide **coordination dashboard** — diary submission status, grade launch progress, attendance
gaps, and period closure checklist — for Secretaria/Coordenação monitoring at semester scale.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| View academic dashboard | `academic.view_academic_dashboard` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) (analytics/diary delivery), [`agenda-edu/gestao-academica/funcionalidades-por-ator.md`](../../ref/agenda-edu/gestao-academica/funcionalidades-por-ator.md) |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Fewer grade widgets |
| `fundamental_medio` | yes | Full dashboard |
| `pj_financeiro` | yes | — |
| `multi_unidade` | partial | Single-school view; network roll-up P2 |

---

## Context

Read-only aggregation over diary, grades, attendance, and periods BCs. May use materialized counters
updated by domain events for performance `[product decision]`.

---

## Business Rules

BR-CD01

Dashboard scopes by `school_id` and active `school_year_id`; filters by segment, class, period.

BR-CD02

**Diary panel:** counts by status (`draft`, `submitted`, `returned`, `accepted`) per class-discipline.

BR-CD03

**Grades panel:** percent components launched vs required per class-period.

BR-CD04

**Attendance panel:** lessons without attendance recorded in date range; pending absence confirmations.

BR-CD05

**Closure panel:** embeds periods BC checklist summary (UC-PC01).

BR-CD06

Teachers see reduced dashboard for **assigned classes only** `[product decision]` — or excluded MVP.

BR-CD07

Data refreshes within minutes of domain events — not real-time (NFR-006).

---

## Use Cases

### UC-CD01 — View coordination dashboard

Input: filters (period, segment, class).

Flow

1. Validate `manage_academic` or coordination role.
2. Return aggregated panels (BR-CD02–BR-CD05).

### UC-CD02 — Drill down to blocking item

Input: panel item id.

Flow

1. Return deep link ids (diary_id, lesson_id, class_id) for SPA navigation.

---

## API

### GET /api/v1/schools/:school_id/academic/dashboard

Query params: `academic_period_id`, `class_id`, `segment`.

Response panels: `diaries`, `grades`, `attendance`, `closure`.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `forbidden` | Missing permission |

---

## Database

Expected entity groups: optional `academic_dashboard_counters` (event-maintained) or live queries MVP.

---

## Events

| Event | Consumes |
|-------|----------|
| `DiarySubmitted`, `GradesLaunched`, `LessonCreated`, `AbsenceRecorded`, `AcademicPeriodClosed` | Update counters |

---

## Permissions

| Key | full dashboard | teacher subset |
|-----|----------------|----------------|
| `manage_academic` | yes | — |
| coordination template | yes | — |
| teacher | — | optional read assigned `[product decision]` |

---

## Non-functional requirements

- **[NFR-006](../../product/non-functional-requirements.md#nfr-006--availability-and-performance-baseline)** — aggregates within minutes; acceptable stale cache.
- **[NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy)** — school-scoped queries only.

---

## Acceptance Criteria

AC-CD01

- [ ] Given diary submitted for class C discipline D, When dashboard loads, Then diary panel shows C/D as submitted.
- Source: [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md)

AC-CD02

- [ ] Given lesson yesterday without attendance, When attendance panel loads, Then lesson listed as gap.
- Source: `[product decision]`

AC-CD03

- [ ] Given grades launched 50% for period P1 class C, When grades panel loads, Then progress shows 50%.
- Source: [`grades.md`](grades.md) UC-G04

---

## Open items / pending decisions

- [ ] Teacher subset dashboard in MVP vs coordination-only.
- [ ] Materialized counters vs live SQL for MVP scale.

---

## Out of Scope

- Cross-module BI — platform P2 `platform.view_analytics_dashboard`.
- Billing delinquency widgets — billing domain.
