# PRD — Academic: Period Closure (BC6)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `academic.manage_period_closure`  
> Related BCs: [`diary.md`](diary.md), [`grades.md`](grades.md), [`report-cards.md`](report-cards.md)  
> Modeling: [`docs/modeling/007-academic.md`](../../modeling/007-academic.md)
> API narrative: [`docs/api/v1/academic.md`](../../api/v1/academic.md)

---

## Objective

Define **academic period and year closure** — checklist-driven gates blocking incomplete diaries
and mutating grades after close — coordinated with platform school-year configuration.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Manage period closure | `academic.manage_period_closure` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) (fechamento) |

---

## Actors and surfaces

| Actor | Surfaces | Actions |
|-------|----------|---------|
| staff with `manage_academic` | Web SPA/API | Run checklist, move to closing, close/reopen with audit |
| teacher | Web SPA/API | Resolve linked diary/grade blockers; no closure transition |
| guardian | — | No direct period-management access |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Same period model |
| `fundamental_medio` | yes | Primary use |
| `pj_financeiro` | yes | — |
| `multi_unidade` | partial | Per-school periods |

---

## Context

**Platform** owns `school_year` calendar boundaries (`platform.configure_school_year` — pending).
Academic owns **period closure state** and checklist validation within that year.

---

## Business Rules

BR-PC01

**Academic period** states: `open` → `closing` → `closed`. Year-end adds `year_closed` terminal
state on school year aggregate.

BR-PC02

Closure has two checklist stages `[product decision]`. The **pre-closing checklist** requires
submitted/accepted diaries, launched grade components, and no pending attendance confirmations;
passing it moves `open` → `closing` and freezes the readiness input set while allowing initial
report-card publication. The **final-close checklist** additionally requires all expected report
cards released before `closing` → `closed`.

BR-PC03

Transition to `closed` fails with structured checklist errors unless `force_close` with reason
(audit).

BR-PC04

When period `closed`, grade entry and new lessons return `409 period_closed` (grades BR-G10,
diary BR-D07).

BR-PC05

Reopen period requires `manage_academic` + reason; audit and notify coordination `[product decision]`.

BR-PC06

Attendance policy override locked after period close (attendance BR-AT04).

BR-PC07

Initial report-card publication is allowed only while the period is `closing`, after grade and
attendance readiness passes. A `closed` period permits only an audited report-card correction
(republish), never an initial publication. This prevents a circular gate: checklist/readiness moves
`open` → `closing`, publication completes, and final close verifies released report cards.

---

## Use Cases

### UC-PC01 — Run closure checklist

Input: `academic_period_id`.

Flow

1. Compute checklist status (BR-PC02).
2. Return blocking items with deep links.

### UC-PC02 — Start academic period closure

Input: period_id.

Flow

1. `AcademicPeriods::StartClosureService` receives the school-scoped period and actor from the
   controller; it never resolves either from an unscoped raw id.
2. Require `closure_status: open` and validate the pre-closing checklist (BR-PC02).
3. Atomically set `closure_status: closing`.
4. Emit `AcademicPeriodClosingStarted` after commit.

### UC-PC03 — Close academic period

Input: period_id, force flag, reason.

Flow

1. Require `closure_status: closing`; validate the final-close checklist or force (BR-PC03).
2. Set `closure_status: closed` (BR-PC01).
3. Emit `AcademicPeriodClosed`.

---

## API

All period-closure routes live under the academic namespace. Platform's frozen
`/academic_periods/:id` PATCH remains calendar metadata only and never accepts `closure_status`.

### GET /api/v1/schools/:school_id/academics/academic_periods/:id/closure_checklist

### POST /api/v1/schools/:school_id/academics/academic_periods/:id/start_closure

Delegates to `AcademicPeriods::StartClosureService`.

### POST /api/v1/schools/:school_id/academics/academic_periods/:id/close

Delegates to `AcademicPeriods::CloseService`.

### POST /api/v1/schools/:school_id/academics/academic_periods/:id/reopen

Delegates to `AcademicPeriods::ReopenService`.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 422 | `checklist_incomplete` | Blockers listed in body |
| 409 | `invalid_closure_transition` | State is not valid for `start_closure`, `close`, or `reopen` |
| 409 | `period_closed` | Mutation on closed period |

---

## Database

`academic_periods.closure_status` is the persisted report-card readiness boundary. Checklist
results are computed responses, not a `period_closure_checklists` table. Closure/reopen change
history is recorded by the existing `audits` table, not a parallel `period_closure_audits` table.
See [`schema.dbml`](../../database/schema.dbml).

---

## Events

| Event | When | Consumers |
|-------|------|-----------|
| `AcademicPeriodClosingStarted` | Pre-closing checklist passes | Report-card publication |
| `AcademicPeriodClosed` | Period close | Grades, diary, report cards enforcement |
| `AcademicPeriodReopened` | Reopen | Coordination alert |

---

## Permissions

| Key | checklist | start closure | close | reopen |
|-----|-----------|---------------|-------|--------|
| `manage_academic` | yes | yes | yes | yes |

---

## Non-functional requirements

- **[NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains)** — closure is transactional; partial close forbidden.
- **[NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit)** — force close and reopen audited.

---

## Acceptance Criteria

AC-PC01

- [ ] Given diary still in draft for class C, When close period without force, Then API returns `422 checklist_incomplete` listing class C diary.
- Source: [`proesc/gestao-academica/fluxos.md`](../../ref/proesc/gestao-academica/fluxos.md) pattern

AC-PC02

- [ ] Given period closed, When teacher POSTs grade entry, Then `409 period_closed`.
- Source: BR-PC04

AC-PC03 *(NFR-001)*

- [ ] Given close operation fails mid-transaction, When retried, Then period state is not partially closed and checklist idempotent.
- Source: NFR-001 `[product decision]`

AC-PC04

- [ ] Given the pre-closing checklist passes for an open period, when staff starts closure, then
      status becomes `closing` and initial report-card publication becomes reachable.
- Source: BR-PC02/BR-PC07 `[product decision]`

---

## Open items / pending decisions

- [ ] Default checklist items per segment (infantil vs fundamental).
- [ ] Platform PRD split for `school_year` vs academic period entity ownership.

---

## Out of Scope

- Billing period lock — billing increment 5 may subscribe to `AcademicPeriodClosed` later.
- Fiscal year — finance separate.
