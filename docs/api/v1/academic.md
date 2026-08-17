# API v1 — Academic

> PRDs: [`docs/prds/academic/`](../../prds/academic/)  
> Modeling: [`docs/modeling/007-academic.md`](../../modeling/007-academic.md)  
> Platform: [`platform-and-admin.md`](platform-and-admin.md) — **frozen W1 (4C.1)**  
> Conventions: [`docs/api/README.md`](../README.md)

Attendance, grades, report cards, diary, curriculum, incidents — NFR-001 on absence notifications.

---

## School year context

Academic routes scope data by school year per the frozen Platform contract
([`platform-and-admin.md`](platform-and-admin.md) § Cross-domain contract):

- Pass `school_year_id` on attendance sessions, grade books, diary lists, and related queries, or
  use `X-School-Year-Id` where documented.
- Period **date boundaries** (`starts_on`, `ends_on`) are owned by Platform; responses include
  read-only `closure_status`.
- Period **closure** (`closure_status` transitions, checklist, close/reopen) is owned by this
  domain — see § Period closure below; do not PATCH closure via Platform routes.
- Attendance jobs consult `school_holidays` for the year when `applies_to_attendance` is true.

---

## Attendance (W1 — reliability critical)

Base: `/api/v1/schools/:school_id/academics`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/attendance_sessions` | By class + date |
| `POST` | `/attendance_sessions` | Open session for class/date |
| `PUT` | `/attendance_sessions/:id/records` | Bulk present/absent |
| `POST` | `/attendance_sessions/:id/confirm` | Trigger confirm + absence pipeline |
| `POST` | `/attendance_records/:id/justify` | Guardian/staff justification |

**Auto-confirm:** 15 minutes after last edit, job confirms session and emits `AbsenceRecorded` for
absent rows (idempotent notification delivery).

---

## Grades (W2)

Base: `/api/v1/schools/:school_id/academics`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/classes/:class_id/grade_book` | Grid by period |
| `PUT` | `/grade_entries` | Upsert scores |
| `POST` | `/grade_launches` | Publish period grades |

Period closed → `409 period_closed`.

When a contributing grade entry/override/template/formula changes after launch and
`lock_on_launch = false`, the current launch is marked `invalidated` with audit metadata.
Report-card readiness rejects it until `POST /grade_launches` appends a replacement launch with a
new digest and `supersedes_id`. Released report-card snapshots remain unchanged.

---

## Report cards (W2 — draft narrative; executable OpenAPI pending)

Base: `/api/v1/schools/:school_id`

Prerequisites are current, non-invalidated `grade_launches` whose digests match live contributing
inputs for every required visible class discipline, a
same-school/year academic period, and confirmed attendance that can produce a deterministic period
summary. Initial publication requires period `closure_status: closing`; after `closed`, only an
audited correction/republish is allowed. Draft validation and scheduled execution both re-check
prerequisites. Missing required grades or pending attendance can never be force-bypassed.

Attendance denominator is every kept, confirmed, non-cancelled instructional session in the period
for which the student's enrollment/class assignment was active. Every unit requires exactly one
record. `present`, `absent`, `late`, and `excused` all enter the denominator; excused never enters
the attended numerator; late enters that numerator only when `late_counts_as_absence = false`.
Percentage is
half-up to two decimals; zero/missing denominator is a readiness blocker.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/academics/report_card_config` | Staff reads current versioned template/display/signatory config |
| `PATCH` | `/academics/report_card_config` | Staff creates next config version |
| `POST` | `/academics/report_card_publication_batches/validate` | Class/period readiness; creates nothing |
| `POST` | `/academics/report_card_publication_batches` | Atomic class publish (`201`) or schedule (`202`) |
| `GET` | `/academics/report_card_publication_batches/:batch_id` | Poll atomic batch results/blockers |
| `GET` | `/academics/report_card_publish_schedules/:schedule_id` | Read scheduled execution and batch id |
| `GET` | `/academics/report_card_publications/:publication_id` | Staff aggregate + active snapshot |
| `GET` | `/academics/report_card_publications/:publication_id/snapshots/:snapshot_id` | Staff exact snapshot |
| `POST` | `/academics/report_card_publications/:publication_id/republish` | New immutable snapshot; reason required |
| `GET` | `/me/report_cards?student_id=&academic_period_id=` | Guardian released snapshots only |
| `GET` | `/me/report_cards/:publication_id` | Guardian aggregate + active released snapshot |
| `GET` | `/me/report_cards/:publication_id/snapshots/:snapshot_id` | Guardian exact released snapshot |
| `GET` | `/me/report_cards/:publication_id/snapshots/:snapshot_id/pdf` | Guardian exact stored PDF |

Class publish body is
`{"report_card_publication_batch":{"class_id":310,"academic_period_id":44,"scheduled_for":null,"force_publish_reason":null}}`.
Immediate success returns `201` with `batch_id`, null `schedule_id`, `status: completed`,
`atomic: true`, counts, and one result per roster student containing `student_id`,
`publication_id`, `snapshot_id`, display `version`, `released_at`, and exact PDF URL. Scheduled
acceptance returns `202` with stable `batch_id`, stable `schedule_id`, UTC `scheduled_for`, and
`school_timezone`; results remain empty until execution. Poll status is
`scheduled | processing | completed | failed`.

Immediate and scheduled execution are all-or-nothing: revalidate and stage every snapshot/PDF,
then activate all versions in one release transaction. Any student blocker or staging failure
releases zero new snapshots and leaves prior active snapshots unchanged. A failed batch returns
structured per-student blockers and no success results.

Snapshot rows have no draft lifecycle. Payload and PDF bytes stage before release; a persisted
snapshot always has non-null `released_at` and `pdf_storage_key`.
`report_card_publications.active_snapshot_id` is nullable only until its first successful release.

One logical publication exists per student/period. `publication_id` identifies that aggregate;
`snapshot_id` identifies an immutable child row and is never the display version number.
Snapshot versions contain stored grade rows,
formula/override provenance, effective discipline visibility, attendance totals, config version,
release time, and correction metadata. Later grade, attendance, period, or config changes do not
mutate a released JSON/PDF. Guardian routes scope to `Current.guardian` linked students; draft,
scheduled/unreleased, cross-family, cross-school, mismatched publication/snapshot ids return `404`.
Each newly active snapshot emits `ReportCardPublished` after commit, keyed by `snapshot_id`;
whether communication consumes the event remains unresolved.

Errors:

- `409 report_card_frozen` — attempted in-place snapshot mutation.
- `409 publication_in_progress` — duplicate execution for the same intended version.
- `422 report_card_not_ready` — structured grade/period/attendance blockers.
- `422 batch_release_failed` — snapshot/PDF staging failure; zero students released.
- `422 republish_reason_required` — correction lacks an audit reason.

---

## Preceptoria (implemented backfill)

Preceptoria is a teacher-authored narrative, not a grade, report card, PEI, AEE, health record, or
structured developmental scale.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/academics/preceptorship_reports?student_id=&status=&mine=` | Staff/teacher list |
| `GET` | `/academics/preceptorship_reports/roll` | Students the actor may write about |
| `POST` | `/academics/preceptorship_reports` | Create draft |
| `GET/PATCH/DELETE` | `/academics/preceptorship_reports/:id` | Draft read/edit/discard |
| `POST` | `/academics/preceptorship_reports/:id/publish` | One-way publication |
| `GET` | `/academics/preceptorship_reports/:id/pdf` | Staff/teacher PDF |
| `GET` | `/me/preceptorship_reports` | Guardian published list |
| `GET` | `/me/preceptorship_reports/:id` | Guardian published detail |
| `GET` | `/me/preceptorship_reports/:id/pdf` | Guardian PDF |

Published reports are immutable. Guardian scope includes only published rows for linked students;
draft and cross-family ids return `404`. The PDF issue date is `published_at`.
Creation requires `teach` and a teacher record matching the authenticated user's email. Only a
teacher-role membership is assignment-narrowed on create/roll; a non-teacher `teach` holder is not.
For existing reports, the shipped Pundit scope permits every `teach` holder—including a
teacher-role membership—to read and perform state-appropriate mutations across the school. This
broader-than-assignment scope is an explicit application authorization hardening blocker.

---

## Diary & curriculum (W3)

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/lessons` | Lesson plans |
| `GET` | `/disciplines` | Subject catalog |
| `GET` | `/classes/:id/disciplines` | Matrix |

---

## Incidents (W3)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/incidents` | Record occurrence |
| `GET` | `/me/students/:id/incidents` | Guardian when `visible_to_guardian` |

---

## Period closure

Mutates `academic_periods.closure_status` — **not** exposed on Platform period PATCH routes
(frozen 4C.1). Platform returns `closure_status` read-only on period list/show responses.

Base: `/api/v1/schools/:school_id/academics`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/academic_periods/:id/closure_checklist` | Return pre-closing or final-close blockers for current state |
| `POST` | `/academic_periods/:id/start_closure` | Validate readiness and transition `open` → `closing` |
| `POST` | `/academic_periods/:id/close` | Validate released report cards and transition `closing` → `closed` |
| `POST` | `/academic_periods/:id/reopen` | Audited reopen |

`POST .../start_closure` delegates to `AcademicPeriods::StartClosureService`, which receives an
already school-scoped period and atomically validates the pre-closing checklist before changing
`open` to `closing`. Close and reopen delegate to `AcademicPeriods::CloseService` and
`AcademicPeriods::ReopenService`; Platform update services never mutate `closure_status`.

---

## Events consumed

| Event | Action |
|-------|--------|
| `AbsenceRecorded` | Enqueue FCM + email via communication pipeline |

---

## OpenAPI tags

`Academic`, `Attendance`, `Grades`, `Report Cards`, `Preceptorship`, `Guardian Me`
