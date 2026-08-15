# PRD — Academic: Attendance (BC1)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `academic.record_attendance`, `academic.manage_attendance_policy`, `academic.justify_absence`, `academic.export_attendance`  
> Related BCs: [`diary.md`](diary.md), [`communication/notifications.md`](../communication/notifications.md) *(consumer)*  
> Modeling: *(pending — `docs/modeling/007-academic.md`)*  
> API narrative: *(pending — `docs/api/v1/academic.md`)*

---

## Objective

Define **attendance recording**, **counting policy**, **absence justification**, and **exports**
with **NFR-001 reliability** and the **`AbsenceRecorded`** event contract consumed by communication
for guardian push — academic owns correctness; comms owns delivery only.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Record attendance | `academic.record_attendance` | [`DIV-academic-002`](../../ref/divergencias.md), [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md), [`classapp/gestao-academica/funcionalidades-por-ator.md`](../../ref/classapp/gestao-academica/funcionalidades-por-ator.md) |
| Manage attendance policy | `academic.manage_attendance_policy` | [`DIV-academic-002`](../../ref/divergencias.md) — school-level policy with per-period override |
| Justify absence | `academic.justify_absence` | Proesc documented justification with audit |
| Export attendance | `academic.export_attendance` | Proesc blank frequency sheets and period exports |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Lesson-level or daily roll; policy may use simplified period totals |
| `fundamental_medio` | yes | Primary frequency legal use case |
| `pj_financeiro` | yes | No segment-specific attendance rules |
| `multi_unidade` | partial | Exports scoped per `school_id` |

---

## Context

Competitors disagree on **lesson-level vs period-total** counting ([`DIV-academic-002`](../../ref/divergencias.md)).
School Lab supports **school-level default policy** with optional **per-academic-period override**:
`counting_mode: lesson | period_total`.

**Dependencies**

- Diary BC: attendance attaches to `lesson_id` when `counting_mode: lesson`; period aggregates when
  `period_total`.
- Students: roster from active enrollments in class.
- Communication: subscribes to `AbsenceRecorded` — see Events §.

**Teacher surfaces:** attendance recording is **mobile-first** per Jul 2026 decision; web also supported.

---

## Business Rules

BR-AT01

An **attendance record** is scoped by `school_id`, `student_id`, and either `lesson_id`
(lesson mode) or `(class_id, academic_period_id, date)` (period mode).

BR-AT02

**Status** values: `present`, `absent`, `late`, `excused`. Transitions use explicit state machine;
`excused` requires linked justification or staff approval.

BR-AT03

**School attendance policy** (`attendance_policies`) defines default `counting_mode`, whether
`late` counts as partial absence, and **auto_confirm_absence_after_minutes** default **15**
(configurable per school attendance policy — `[product decision Aug 2026]`).

BR-AT04

**Per-period override** on `academic_periods.attendance_policy_override` may change `counting_mode`
only before period has locked attendance `[product decision]`.

BR-AT05

Teachers may record attendance only for classes where they are assigned (`teacher_subject_assignments`)
or staff with `record_attendance` on school-wide scope.

BR-AT06

**Justification** records include `reason_code`, optional attachment reference, submitter
(teacher, guardian, or staff), and `review_status: pending | approved | rejected`.

BR-AT07

Guardian-submitted justifications create `pending` requests; teacher or staff with
`manage_attendance` approves or rejects (audit on decision).

BR-AT08

**`AbsenceRecorded` event** is emitted only when attendance reaches **`confirmed` absent** state:
either (a) staff saves absent without pending justification, (b) justification approved, or
(c) auto-confirm timer elapses per policy. **Never** emit on `pending` or `excused` without
confirmed absent path.

BR-AT09

Each `AbsenceRecorded` carries stable **`event_id`** (UUID) for idempotent comms delivery
(NFR-001). Replays with same `event_id` are no-ops downstream.

BR-AT10

Editing **confirmed** attendance requires `manage_attendance` or secretary override with
**reason_code** and audit (NFR-005). If edit changes absent → present, emit
`AbsenceRevoked` (comms may send correction notification — `[product decision]`).

BR-AT11

**Client idempotence:** requests include optional `client_request_id`; duplicate within 24h
returns existing record (NFR-001).

BR-AT12

Exports include blank roster sheets (class + date columns) and period summaries; async job for
large schools with download token (NFR-001 job idempotence).

BR-AT13

Withdrawn enrollments (`EnrollmentWithdrawn`) exclude student from future attendance lists;
historical records retained.

---

## Use Cases

### UC-AT01 — Record lesson attendance (teacher)

Input: `lesson_id`, array of `{ student_id, status }`, optional `client_request_id`.

Flow

1. Validate teacher assignment and lesson not cancelled (diary BC).
2. Upsert attendance rows in transaction (BR-AT01, BR-AT11).
3. For each new **confirmed** absent, enqueue `AbsenceRecorded` via outbox (BR-AT08, BR-AT09).
4. Return roster with persisted statuses.

### UC-AT02 — Configure attendance policy (staff)

Input: `counting_mode`, `late_counts_as_absence`, optional period overrides.

Flow

1. Validate `manage_academic`.
2. Upsert school policy; audit (NFR-005).

### UC-AT03 — Submit absence justification

Input: `attendance_record_id` or `(student_id, lesson_id)`, reason, optional attachment.

Flow

1. Create justification `pending`.
2. Set attendance to `absent` + `pending_confirmation` until reviewed.
3. On approve → `confirmed` absent → emit `AbsenceRecorded` (BR-AT08).
4. On reject → notify submitter; attendance remains absent unconfirmed or staff sets manually.

### UC-AT04 — Export attendance

Input: `class_id`, date range or period, format (`pdf` | `csv`).

Flow

1. Validate read permission.
2. Generate export job (BR-AT12).

---

## API

### POST /api/v1/schools/:school_id/lessons/:lesson_id/attendance

Request

```json
{
  "client_request_id": "uuid",
  "records": [
    { "student_id": "uuid", "status": "present" },
    { "student_id": "uuid", "status": "absent" }
  ]
}
```

Response 200

```json
{
  "lesson_id": "uuid",
  "records": [
    {
      "student_id": "uuid",
      "status": "absent",
      "confirmation_state": "confirmed",
      "absence_event_id": "uuid"
    }
  ]
}
```

### GET /api/v1/schools/:school_id/me/students/:student_id/attendance

Guardian family-scoped summary (justified absences and counts).

### POST /api/v1/schools/:school_id/attendance/exports

Async export enqueue.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `forbidden` | Teacher not assigned to class/lesson |
| 404 | `not_found` | Student not in roster / cross-family guardian |
| 409 | `lesson_cancelled` | Cannot record on cancelled lesson |
| 422 | `invalid_transition` | Invalid status change on confirmed record without override |

---

## Database

| Artifact | Location |
|----------|----------|
| Narrative DSL | `docs/modeling/007-academic.md` *(pending)* |
| DBML | `docs/database/database_dml.md` |

Expected entity groups: `attendance_policies`, `attendance_records`, `absence_justifications`,
`attendance_exports`, `domain_outbox_events`.

---

## Events

| Event | When | Consumers |
|-------|------|-----------|
| **`AbsenceRecorded`** | Confirmed absent (BR-AT08) | Communication notifications BC (`attendance` channel) |
| `AbsenceRevoked` | Confirmed absent corrected to present | Communication *(optional correction notify)* |
| `AttendancePolicyChanged` | Policy update | Coordination dashboard cache |

### `AbsenceRecorded` payload contract

```json
{
  "event_id": "uuid",
  "school_id": "uuid",
  "student_id": "uuid",
  "guardian_user_ids": ["uuid"],
  "lesson_id": "uuid",
  "class_id": "uuid",
  "date": "2026-08-15",
  "occurred_at": "2026-08-15T14:30:00Z",
  "summary": {
    "student_name": "string",
    "class_name": "string",
    "lesson_label": "string"
  }
}
```

Communication maps payload to notification intent (BR-N01 in notifications BC). Academic **must not**
call FCM directly.

---

## Permissions

| Role / key | record | justify | policy | export | override confirmed |
|------------|--------|---------|--------|--------|-------------------|
| teacher (assigned) | yes | yes | — | own classes | — |
| staff `manage_attendance` | yes | approve | — | yes | yes |
| staff `manage_academic` | yes | approve | yes | yes | yes |
| guardian | — | submit | — | — | — |
| guardian `/me` | read linked students | — | — | — | — |

---

## Non-functional requirements

Cross-cutting: [`non-functional-requirements.md`](../../product/non-functional-requirements.md).

- **[NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains)** — idempotent saves (BR-AT11), outbox for `AbsenceRecorded`, no silent loss, audit on override (BR-AT10).
- **[NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy)** — guardian routes family-scoped.
- **[NFR-004](../../product/non-functional-requirements.md#nfr-004--push-notifications)** — push only after event emission; policy in comms.

---

## Acceptance Criteria

AC-AT01 *(NFR-001 idempotence)*

- [ ] Given a teacher submits attendance with the same `client_request_id` twice, When the second POST completes, Then exactly one attendance row exists per student and at most one `AbsenceRecorded` per confirmed absent student.
- Source: [`non-functional-requirements.md`](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains) `[product decision]`

AC-AT02 *(NFR-001 validated absence)*

- [ ] Given a student is marked absent with `confirmation_state: pending`, When **15 minutes** elapse without edit, Then session auto-confirms and `AbsenceRecorded` emits once per absent student.
- Source: [`open-questions.md`](../../open-questions.md) § Academic `[product decision]`

AC-AT03 *(NFR-001 notify timing)*

- [ ] Given justification is approved for a pending absent, When approval completes, Then exactly one `AbsenceRecorded` is emitted with stable `event_id` and comms enqueues one push per guardian policy.
- Source: [`communication/notifications.md`](../communication/notifications.md) AC-N03 pattern

AC-AT04 *(policy)*

- [ ] Given school policy `counting_mode: period_total`, When teacher opens attendance for a date without lesson, Then period roll UI is shown and lesson_id is null on records.
- Source: [`DIV-academic-002`](../../ref/divergencias.md)

AC-AT05 *(audit)*

- [ ] Given confirmed absent is overridden to present by secretary with reason, When save succeeds, Then audited change exists and `AbsenceRevoked` event is emitted.
- Source: `[product decision]`

AC-AT06 *(roster)*

- [ ] Given enrollment is withdrawn, When teacher opens lesson attendance, Then student no longer appears in roster.
- Source: [`students-and-enrollments/enrollments.md`](../students-and-enrollments/enrollments.md) BR-E11

---

## Open items / pending decisions

- [x] Auto-confirm delay default — **15 minutes** after last attendance edit on session; configurable per school policy ([`open-questions.md`](../../open-questions.md) § Academic).
- [ ] Same-day edit window for teachers before lock.
- [ ] Whether `AbsenceRevoked` triggers guardian notification.
- [ ] Attachment storage for justification (documents domain handoff).

---

## Out of Scope

- Push/email delivery — communication BC.
- Period-total aggregation formulas for boletim — report cards BC (read-only consume).
- Cheguei / check-in hardware integrations — P2.
- Infantil daily routine attendance — P2 `academic.log_daily_routine`.
