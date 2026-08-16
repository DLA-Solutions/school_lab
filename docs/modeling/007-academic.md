# Data Model — Academic (007)

> PRD: [`docs/prds/academic/`](../prds/academic/)  
> Depends on: [`009-platform-admin.md`](009-platform-admin.md), [`005-students-enrollments.md`](005-students-enrollments.md), [`006-communication.md`](006-communication.md)  
> Executable schema: [`docs/database/schema.dbml`](../database/schema.dbml) · Local DER unavailable:
> no repository renderer is installed; `der_007.png` was not fabricated

## Product decisions (embedded)

- **Assessment periods:** default template **trimester** (3 periods) for `fundamental_medio`;
  **bimester** (4) available per school template — configured on `school_years.period_template`.
- **Auto-confirm absence delay:** **15 minutes** after teacher marks absent before push fires —
  allows correction window ([`attendance.md`](../prds/academic/attendance.md) BR-AT06).
- **Report-card prerequisite freeze:** publication consumes successful `grade_launches`, confirmed
  attendance within the academic period, and the Platform-owned period/year boundaries. It stores
  immutable versions; later source edits do not mutate a released snapshot.

## Entity groups

### Attendance (BC1)

| Table | Role |
|-------|------|
| `attendance_policies` | School counting mode, late handling, and auto-confirm delay |
| `attendance_sessions` | Class + date + period |
| `attendance_records` | Per-student status — present/absent/late/excused |
| `absence_justifications` | Guardian/staff justification + optional attachment |
| `attendance_exports` | Async PDF/CSV export request and artifact metadata |

`attendance_sessions.lesson_id` is present in lesson-counting mode and null in period-total mode.
Partial uniqueness permits multiple lessons for one class/date while allowing only one period-total
roll per class/period/date. Report-card readiness requires all relevant sessions confirmed.

### Grades (BC2)

| Table | Role |
|-------|------|
| `subjects` | School-scoped discipline catalog |
| `class_disciplines` | Subject offering for one class/year, optional assigned teacher, report-card requirement flag |
| `grade_scales` | Versioned numeric/concept/rubric validation configuration |
| `evaluation_templates` | Versioned class/period formula and launch policy |
| `evaluation_components` | Weighted regular/recovery component per discipline and scale |
| `grade_entries` | Score/concept per student/component/period |
| `grade_overrides` | Audited computed→override value and reason |
| `grade_launches` | Append-only class-discipline-period launch, source digest, invalidation audit, and supersession link |

Templates/scales and computed-grade overrides are append-versioned after use. One current template
is permitted per class/period and one current override per student/class-discipline/period. A
launch digest covers the effective
template/component/scale versions, kept entries, and overrides. A post-launch contributing edit
marks the current row `invalidated` with `invalidated_at` and reason. Relaunch appends a new row
with recomputed digest and `supersedes_id`; a partial unique constraint permits one
`status = launched` row per class-discipline-period. Report-card publication rejects an invalidated
launch or one whose digest no longer matches current inputs.

### Report cards (BC3)

| Table | Role |
|-------|------|
| `report_card_configs` | Versioned per-school standard template/display/single-signatory configuration |
| `report_card_publish_batches` | Stable class/period request, atomic lifecycle, result counts/blockers |
| `report_card_publish_schedules` | Stable scheduled execution id linked to one batch |
| `report_card_publications` | One logical student/period publication and active released version |
| `report_card_snapshots` | Append-only grade, attendance, visibility, config, and PDF snapshot |

`report_card_publications` is unique by `(school_id, student_id, academic_period_id)`.
`report_card_snapshots.version` is unique within the publication. A republish creates a new
snapshot with `supersedes_id` and required correction reason; `active_snapshot_id` advances only
after the replacement is completely materialized.

Immediate and scheduled class batches are all-or-nothing. Every snapshot/PDF is staged before one
release transaction advances all affected `active_snapshot_id` pointers. A failed batch releases
zero snapshots and keeps prior active versions unchanged. Solid Queue job ids remain internal;
batch and schedule table ids are the stable API/audit ids.

There are no persisted draft snapshot rows. A `report_card_snapshots` row is inserted only after
its PDF bytes stage successfully, so `released_at` and `pdf_storage_key` are both non-null.
`report_card_publications.active_snapshot_id` remains nullable only before the first atomic release.

Readiness uses:

1. required visible `class_disciplines` for the student/class/period;
2. current non-invalidated `grade_launches` whose digests match referenced
   grade/formula/override values;
3. `academic_periods` in the same school/year, with initial publication in `closing` and only
   correction/republish allowed after `closed`;
4. confirmed `attendance_sessions`/`attendance_records` inside period boundaries.

The snapshot JSON materializes effective discipline visibility, launched grade rows/formulas,
override provenance, and deterministic attendance totals. Denominator `instructional_sessions`
counts every eligible confirmed session while the student's assignment was active. Excused and
late both enter the denominator; excused never enters the attended numerator, and late enters that
numerator only when `late_counts_as_absence = false`. The snapshot stores denominator,
numerator, status counts, policy
flag, and percentage rounded half-up to two decimals. Guardian reads never join live
grade/attendance tables.

### Preceptoria (BC9 backfill)

| Table | Role |
|-------|------|
| `preceptorship_reports` | Teacher-authored narrative with one-way `draft` → `published` lifecycle |

Published rows are immutable and family-visible only to guardians linked to the student. Corrections
are new reports. Shipped creation checks assignment only for a teacher-role membership; the
existing-report Pundit scope is school-wide for every `teach` holder, including teachers. That broad
scope is an explicit application authorization hardening blocker, not a modeled least-privilege
claim. The text is not PEI/AEE, a health record, or a grade scale.

### Diary (BC4)

| Table | Role |
|-------|------|
| `lessons` | Planned/completed lessons |
| `lesson_contents` | Attachments, homework |

### Curriculum (BC5)

| Table | Role |
|-------|------|
| `disciplines` | Subject catalog per school year |
| `class_disciplines` | Turma ↔ discipline matrix |

### Incidents (BC7)

| Table | Role |
|-------|------|
| `incidents` | Occurrence records — guardian visibility flag |

## Events

- `AbsenceRecorded` → communication notification pipeline (NFR-001 reliability requirements).
- `ReportCardPublished` → emitted after each snapshot becomes active, idempotently keyed by
  `snapshot_id`; whether communication consumes it is unresolved.
- Preceptoria has no shipped publication event; adding one requires a communication contract.

## NFR-001 hooks

Attendance confirmation job: idempotent delivery keyed by `attendance_record_id`; retry with
exponential backoff; audit `notification_deliveries` outcome.

Report-card scheduled jobs are idempotent by schedule/batch id plus intended input digest. Domain
batch/schedule rows expose stable status while Solid Queue stores transport execution. A failed
render leaves the whole batch unreleased and invisible to guardians.

## LGPD

Health-related incident fields marked sensitive; guardian visibility explicit per incident.
Report-card snapshots and Preceptoria narratives are child education records. All guardian reads
are family-scoped; retention and access-audit periods remain pending legal review.
