# PRD — Academic: Grades (BC2)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `academic.configure_evaluation_template`, `academic.manage_grade_scale`, `academic.enter_grades`, `academic.manage_recovery_grades`  
> Related BCs: [`diary.md`](diary.md), [`report-cards.md`](report-cards.md), [`curriculum.md`](curriculum.md)  
> Modeling: [`docs/modeling/007-academic.md`](../../modeling/007-academic.md)
> API narrative: [`docs/api/v1/academic.md`](../../api/v1/academic.md)

---

## Objective

Define **evaluation templates**, **grade scales**, **grade entry** (teacher diary and activities),
**recovery/reassessment**, and **launch to report card** with NFR-001 stability — self-service
setup per [`DIV-academic-001`](../../ref/divergencias.md).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Configure evaluation template | `academic.configure_evaluation_template` | [`DIV-academic-001`](../../ref/divergencias.md), [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) |
| Manage grade scale | `academic.manage_grade_scale` | [`DIV-academic-001`](../../ref/divergencias.md), Proesc grading criteria and formulas |
| Enter grades | `academic.enter_grades` | Proesc diary grade entry — **differentiator** |
| Manage recovery grades | `academic.manage_recovery_grades` | Proesc parallel recovery flows |

---

## Actors and surfaces

| Actor | Surfaces | Actions |
|-------|----------|---------|
| teacher | Web SPA/API | Enter regular/recovery grades for assigned classes |
| staff with `manage_academic` | Web SPA/API | Configure scales/templates, launch, override with audit |
| guardian (UI: **Responsável**) | Web first through report cards | No direct draft-grade access; consumes released snapshots |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | partial | Descriptive/concept scales; numeric boletim optional per school |
| `fundamental_medio` | yes | Primary numeric/concept grade flows |
| `pj_financeiro` | yes | No billing linkage from grades in MVP |
| `multi_unidade` | partial | Templates school-scoped |

---

## Context

School Lab adopts **self-service templates** with optional future **ERP import mode** (P2).
A template binds to `class_id` + `academic_period_id`; each component names one
`class_discipline_id`. This permits one versioned class/period template to compose all disciplines
without duplicating template headers.

**Dependencies**

- Curriculum: disciplines and class matrix.
- Diary: grade entry on `lesson_id` or `activity_id`.
- Periods: grades frozen when period closed.
- Report cards: publish consumes computed period grades.

Period template is selected when the school year is created; new schools default to
`trimester`, while `bimester` and `custom` remain selectable
([`open-questions.md`](../../open-questions.md) § Academic).

---

## Business Rules

BR-G01

An **evaluation template** defines per-`class_discipline` assessment components (e.g. P1, P2,
trabalho) with regular-component weights summing to 100% for each discipline (or an explicit
extra-credit rule). Templates are versioned. A replacement appends a row with `supersedes_id`,
retires the prior current row, and leaves existing entries on their original component/template
version; a partial unique constraint permits one current template per class/period.

BR-G02

**Grade scale** types: `numeric` (min/max/decimals), `concept` (A/B/C map), `rubric` (level ids).
One scale per template component or shared school scale library.

BR-G03

**Grade entry** rows store `student_id`, `component_id`, `value`, `entered_by`, optional
`lesson_id` / `activity_id`, and `entry_kind: regular | recovery`.

BR-G04

Teachers enter grades only for assigned `teacher_subject_assignments`; staff with
the fixed `manage_academic` permission may enter/override school-wide with audit (NFR-005) —
**differentiator**. `academic.enter_grades` is a capability id, not a permission key.

BR-G05

**Recovery** components are explicit template rows with `is_recovery: true`; may depend on
regular component below threshold `[product decision]` — parallel Proesc pattern.

BR-G06

**Launch grades** (coordination action) marks component `status: launched`; launched grades
appear in report card computation but remain editable until period close unless school enables
`lock_on_launch` `[product decision]`. A successful `grade_launches` row captures class,
discipline, period, actor, launch time, and an input digest. Report-card publication requires one
current successful launch for every required visible class discipline. A partial unique constraint
on `(school_id, class_discipline_id, academic_period_id)` where `status = launched` prevents two
current launches; invalidation and replacement happen transactionally.

When `lock_on_launch = false`, any post-launch create/update/delete of a contributing grade entry,
override, component, formula, scale, or template immediately marks the current launch
`invalidated`, records `invalidated_at` and the audited source-change reason, and emits
`GradesLaunchInvalidated`. The report-card readiness check then fails until coordination relaunches.
Relaunch recomputes the complete digest and appends a new `grade_launches` row whose
`supersedes_id` points to the invalidated launch; it never revalidates or mutates the old digest.
If a report card was already released, it remains immutable and a corrected family-visible result
requires both relaunch and report-card republish with reason.

BR-G07

Computed **period grade** per discipline uses template formula; rounding rule school-configurable
(half-up default).

BR-G08

Secretary **override** of one computed student/discipline/period result requires `reason_code` and
stores both `computed_value` and `override_value` in an append-only `grade_overrides` row. A
correction supersedes the prior row; a partial unique constraint permits one current override for
that result. Report-card publication copies the effective override into its immutable snapshot
(NFR-001).

BR-G09

Invalid scale values return `422 invalid_grade_value` with allowed range in error detail.

BR-G10

Deleting a grade entry soft-deletes with audit; hard delete forbidden after period close.

BR-G11

**ERP mode** (P2) — read-only grade mirror from external id; not in MVP.

---

## Use Cases

### UC-G01 — Configure evaluation template (coordination)

Input: class, period, and components[] carrying `class_discipline_id`, weights, and scale refs.

Flow

1. Validate `manage_academic`.
2. Create template version (BR-G01).
3. Audit template change.

### UC-G02 — Enter grades (teacher)

Input: `lesson_id` or `activity_id`, component_id, grade rows[].

Flow

1. Validate assignment (BR-G04).
2. Validate values against scale (BR-G09).
3. Upsert entries; emit `GradeEntered` for dashboard.

### UC-G03 — Enter recovery grades

Input: recovery component_id, eligible students, values.

Flow

1. Validate recovery component flag (BR-G05).
2. Save with `entry_kind: recovery`.

### UC-G04 — Launch grades to report card pipeline

Input: `class_id`, `discipline_id`, `academic_period_id`, component_ids[].

Flow

1. Validate all required entries present or staff confirms partial launch `[product decision]`.
2. Compute the complete input digest and append a launched row; when relaunching, link
   `supersedes_id` to the invalidated prior row (BR-G06).
3. Emit `GradesLaunched` for report card BC.

### UC-G05 — Secretary override computed grade

Input: student, discipline, period, override_value, reason_code.

Flow

1. Validate `manage_academic`.
2. Write override row (BR-G08); audit.

---

## API

All grade resources use the academic namespace; there is no parallel root-level
`/grade_launches`, `/grade_entries`, or `/evaluation_templates` contract.

### POST /api/v1/schools/:school_id/academics/evaluation_templates

Create template version.

### PUT /api/v1/schools/:school_id/academics/grade_entries/bulk

Bulk upsert for lesson/activity context.

### POST /api/v1/schools/:school_id/academics/grade_launches

Launch components to report card pipeline.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `forbidden` | Not assigned to discipline/class |
| 409 | `period_closed` | Period frozen |
| 409 | `template_version_conflict` | Stale template version on entry |
| 422 | `invalid_grade_value` | Outside scale |

---

## Database

Expected entity groups: `grade_scales`, `evaluation_templates`, `evaluation_components`,
`grade_entries`, `grade_overrides`, `grade_launches`. See
[`schema.dbml`](../../database/schema.dbml); `grade_launches.input_digest` is the immutable
prerequisite handoff to report-card snapshots.

---

## Events

| Event | When | Consumers |
|-------|------|-----------|
| `GradeEntered` | Grade save | Coordination dashboard |
| `GradesLaunched` | Launch action | Report cards BC |
| `GradesLaunchInvalidated` | A contributing source changes after launch | Report-card readiness/audit |
| `GradeOverrideApplied` | Secretary override | Audit, report card recompute |

---

## Permissions

| Key | template | enter | recovery | launch | override |
|-----|----------|-------|----------|--------|----------|
| teacher (assigned) | — | yes | yes* | — | — |
| `manage_academic` | yes | yes | yes | yes | yes |

*Recovery when template allows.

---

## Non-functional requirements

- **[NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains)** — bulk entry idempotent on `(component_id, student_id, lesson_id)`; launched grades traceable; publish snapshot immutable (handoff to report cards).
- **[NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit)** — overrides and post-launch edits audited.

---

## Acceptance Criteria

AC-G01 *(NFR-001 bulk idempotence)*

- [ ] Given a teacher bulk-saves the same grade grid twice with identical payload, When the second request completes, Then one entry per student-component exists and values match the last save.
- Source: NFR-001 `[product decision]`

AC-G02 *(scale validation)*

- [ ] Given numeric scale 0–10 with one decimal, When teacher enters 10.25, Then API returns `422 invalid_grade_value` with allowed range.
- Source: [`proesc/gestao-academica/casos-de-borda.md`](../../ref/proesc/gestao-academica/casos-de-borda.md) pattern

AC-G03 *(recovery)*

- [ ] Given recovery component configured, When teacher enters recovery grade, Then entry is stored with `entry_kind: recovery` and included in period formula per template weights.
- Source: [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md)

AC-G04 *(launch)*

- [ ] Given coordination launches P1 grades, When launch succeeds, Then report card BC can compute discipline period grade including launched components only.
- Source: `[product decision]`

AC-G05 *(override audit)*

- [ ] Given secretary overrides computed grade with reason, When saved, Then audit row contains computed_value, override_value, actor, reason_code.
- Source: NFR-005

AC-G06 *(self-service)*

- [ ] Given coordination creates an evaluation template without vendor support, when it is saved,
      then its per-discipline components apply to the selected class/period without ERP import.
- Source: [`DIV-academic-001`](../../ref/divergencias.md)

AC-G07 *(post-launch invalidation and relaunch)*

- [ ] Given a current successful launch and `lock_on_launch = false`, when a contributing grade is
      edited, then the launch becomes `invalidated`, report-card readiness fails, and no existing
      report-card snapshot changes. When coordination relaunches, a new launch with a new digest
      and `supersedes_id` is appended and readiness may succeed.
- Source: NFR-001 `[product decision]`

---

## Open items / pending decisions

- [x] Default period template — `trimester`; `bimester` and `custom` remain selectable at
      school-year creation.
- [ ] Concept vs numeric default for infantil.
- [ ] `lock_on_launch` default false vs true.
- [ ] Partial launch allowed with warning banner.

---

## Out of Scope

- Report card PDF layout — report cards BC.
- Billing discounts tied to grades — not MVP.
- ERP grade import — P2 `academic.sync_academic_with_erp`.
