# PRD — Academic: Class Diary (BC4)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `academic.manage_class_diary`, `academic.log_lesson_content`, `academic.manage_teacher_diary`, `academic.assign_teacher_to_subject`, `academic.manage_academic_operations`  
> Related BCs: [`curriculum.md`](curriculum.md), [`attendance.md`](attendance.md), [`grades.md`](grades.md)  
> Modeling: *(pending — `docs/modeling/007-academic.md`)*  
> API narrative: *(pending — `docs/api/v1/academic.md`)*

---

## Objective

Define **class diary** — lessons, content logging, teacher–discipline assignment, submission workflow —
as the hub linking attendance and grade entry ([`DIV-academic-005`](../../ref/divergencias.md) MVP
inline lessons; full cancel/makeup lifecycle P2).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Manage class diary | `academic.manage_class_diary` | [`DIV-academic-005`](../../ref/divergencias.md), [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) |
| Log lesson content | `academic.log_lesson_content` | Proesc copy-from-prior term content |
| Manage teacher diary | `academic.manage_teacher_diary` | Proesc diary delivery monitoring |
| Assign teacher to subject | `academic.assign_teacher_to_subject` | Proesc bulk teacher–discipline links |
| General operations | `academic.manage_academic_operations` | Catch-all for edge diary flows |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Simpler lesson content; attendance roll still applies |
| `fundamental_medio` | yes | Primary diary volume |
| `pj_financeiro` | yes | — |
| `multi_unidade` | partial | Per-school diaries |

---

## Context

Proesc and peers tie **diário de classe** to disciplines, lessons, and coordination monitoring.
School Lab MVP creates **lessons inline** (date + discipline + class) without separate scheduling
module — P2 adds `academic.schedule_lesson` and `academic.manage_lesson_lifecycle`.

**Dependencies**

- Curriculum: `discipline_id`, class matrix.
- Platform: school calendar / academic periods.
- Students: class roster via enrollments.

---

## Business Rules

BR-D01

A **diary** is scoped by `school_id`, `class_id`, `discipline_id`, and `academic_period_id`.

BR-D02

A **lesson** has `date`, `sequence_number`, `status: planned | taught | cancelled`, optional
`content` (rich text), and links to attendance and grade activities.

BR-D03

Teachers create/edit lessons only when assigned via `teacher_subject_assignments` (BR-D10).

BR-D04

**Batch lesson generation** creates N lessons from date range + weekday pattern `[product decision]`.

BR-D05

**Copy content from prior term** duplicates lesson content skeleton without grades/attendance
(Proesc pattern).

BR-D06

**Teacher diary submission** workflow: `draft` → `submitted` → `returned` | `accepted`.
Coordination returns with comment; resubmit required before period close.

BR-D07

Period close (periods BC) blocks new lessons when diary incomplete unless force flag.

BR-D08

**Activities** (evaluations tied to lesson) reference evaluation template components for grade entry.

BR-D09

Cancelled lessons (`status: cancelled`) cannot receive attendance (attendance BR-AT errors);
makeup lesson is new row — full lifecycle rules P2.

BR-D10

**Teacher assignment** rows: `staff_membership_id`, `discipline_id`, `class_id`, optional date range.
Bulk import supported for start-of-year setup.

BR-D11

Staff with `manage_academic` may reassign teacher links with audit.

BR-D12

**MVP cancel:** lesson `cancelled` with `cancel_reason`; no automatic reschedule. P2 adds
`academic.manage_lesson_lifecycle` makeup pairing.

BR-D13

Diary changes after `submitted` require unlock by coordination or auto-revert to `returned`.

---

## Use Cases

### UC-D01 — Create lesson (teacher)

Input: diary context, date, optional content.

Flow

1. Validate assignment (BR-D03).
2. Create lesson `planned` or `taught`.
3. Optionally attach activity for grade component.

### UC-D02 — Batch generate lessons (teacher/coordination)

Input: date range, weekdays, count.

Flow

1. Create lesson rows (BR-D04).
2. Idempotent on `(diary_id, date, sequence)` `[product decision]`.

### UC-D03 — Copy content from prior term

Input: source period, target diary.

Flow

1. Copy content fields only (BR-D05).

### UC-D04 — Submit teacher diary

Input: diary_id, period.

Flow

1. Validate required lessons/content per school checklist `[product decision]`.
2. Transition to `submitted` (BR-D06).

### UC-D05 — Review diary (coordination)

Input: diary_id, action `accept` | `return`, comment.

Flow

1. Update workflow state (BR-D06, BR-D13).
2. Emit `DiaryReviewUpdated` for dashboard.

### UC-D06 — Assign teachers to subjects (staff)

Input: assignments[] bulk.

Flow

1. Validate `manage_academic`.
2. Upsert assignments (BR-D10); audit.

---

## API

### POST /api/v1/schools/:school_id/diaries/:diary_id/lessons

Create lesson.

### POST /api/v1/schools/:school_id/diaries/:diary_id/submit

Submit diary for review.

### POST /api/v1/schools/:school_id/teacher_assignments/bulk

Bulk teacher–discipline–class links.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `forbidden` | Not assigned teacher |
| 409 | `lesson_cancelled` | Attendance blocked |
| 409 | `period_closed` | No new lessons |
| 422 | `diary_not_ready` | Submit validation failed |

---

## Database

Expected entity groups: `diaries`, `lessons`, `lesson_activities`, `teacher_subject_assignments`,
`diary_submissions`.

---

## Events

| Event | When | Consumers |
|-------|------|-----------|
| `LessonCreated` | New lesson | Coordination dashboard |
| `DiarySubmitted` | Teacher submit | Coordination dashboard |
| `DiaryReviewUpdated` | Accept/return | Coordination dashboard |
| `TeacherAssignmentChanged` | Bulk assign | Grade/attendance permission cache |

---

## Permissions

| Key | lesson CRUD | submit | review | assign teachers |
|-----|-------------|--------|--------|-----------------|
| teacher (assigned) | yes | yes | — | — |
| `manage_academic` | yes | yes | yes | yes |

---

## Non-functional requirements

- **[NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains)** — batch lesson idempotence; submission state machine.
- **[NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit)** — teacher reassignment audited.

---

## Acceptance Criteria

AC-D01

- [ ] Given teacher assigned to discipline D class C, When creating lesson on date, Then lesson appears in diary and attendance roster available.
- Source: [`proesc/gestao-academica/fluxos.md`](../../ref/proesc/gestao-academica/fluxos.md)

AC-D02

- [ ] Given lesson marked cancelled, When teacher POSTs attendance, Then API returns `409 lesson_cancelled`.
- Source: BR-D09, [`attendance.md`](attendance.md)

AC-D03

- [ ] Given coordination returns diary with comment, When teacher views diary, Then status is `returned` and comment visible.
- Source: [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md)

AC-D04

- [ ] Given copy-from-prior-term action, When completed, Then new lessons have content text but no grade or attendance rows.
- Source: BR-D05

AC-D05 *(P2 boundary)*

- [ ] Given MVP cancel only, When lesson cancelled, Then no automatic makeup lesson is created (documented P2 gap).
- Source: [`DIV-academic-005`](../../ref/divergencias.md), [`mvp-scope.md`](../../product/mvp-scope.md)

---

## Open items / pending decisions

- [ ] Required fields before diary submit (min lessons per period).
- [ ] Rich text vs plain content storage.
- [ ] Lesson numbering when multiple lessons same day.

---

## Out of Scope

- Standalone lesson scheduling module — P2 `academic.schedule_lesson`.
- Cancel/makeup pairing rules — P2 `academic.manage_lesson_lifecycle`.
- Live online class links — P2 `academic.manage_live_lesson`.
- Infantil daily routine — P2 `academic.log_daily_routine`.
