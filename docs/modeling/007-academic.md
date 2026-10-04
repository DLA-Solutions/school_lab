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
| `incident_types` | School-configurable catalog — `category` (disciplinary/pastoral/health), free-text `severity`, `default_visibility` |
| `incidents` | Occurrence record (product label **"Ata"**) — carries both BR-IN08 approval slots directly |

Surfaced in the product menu as **"Ata"** — the end-user request was a single-type flow ("nota
ata" with "pontos trazidos pelos pais" / "respostas da escola") mapped onto the general,
school-configurable `incident_type` model from BR-IN01 rather than hardcoded, so other incident
types (disciplinary, health) stay representable without a second schema.

**Type catalog (BR-IN01):** one seeded system row per school, `system_key: "guardian_meeting"`
("Reunião com os pais", `category: pastoral`). `default_visibility: staff_only` was a product
judgment call, not literally mandated by BR-IN02 (which only forces `staff_only` automatically for
`category: health`) — meeting notes about a family are treated as sensitive-by-default until a
staff member explicitly decides to share them, matching how the end-user described this as an
internal record first. The row provisions lazily (idempotent `find_or_create` keyed on
`system_key`) the first time a school creates an incident with no explicit `incident_type_id`, so
the feature needs no catalog-management screen to be usable. Full CRUD for custom types is
deferred — see `docs/open-questions.md`.

**Snapshot fields:** `incidents.category`/`severity` copy from `incident_type` at creation time and
do not follow later edits to the type row — a report filtered by category must not change meaning
retroactively because a school renamed or recategorised a type after the fact.

**Structured body:** `description` stays a generic free-text field for any incident type;
`guardian_points_raised`/`school_response` are additional nullable fields specific to the
guardian-meeting shape (mapped 1:1 from the end-user's "pontos trazidos pelos pais" /"respostas da
escola") but available to any incident type rather than gated behind a per-type dynamic schema —
over-engineering for two fields.

**Visibility and publish (BR-IN02/BR-IN04/UC-IN02):** `visibility: guardian` publishes immediately
at creation (`published_at` set then); `guardian_on_publish` stays a draft until
`POST .../publish`; `staff_only` never publishes (publishing one is a `409`). Guardian name
("nome dos pais" in the grid) is never stored on the incident — it is derived at render time from
`student.student_guardians`, the same association `Preceptoria#roll` already reads.

**Approval gate (BR-IN08):** two fixed slots (`coordination_approved_at`/`_by_membership_id`,
`director_approved_at`/`_by_membership_id`) rather than an approvals table, since there are always
exactly two named slots, never an arbitrary list. Modeled as plain guarded model methods
(`approve_coordination!`/`approve_director!`), not AASM — the state is two independent booleans
converging on one derived status, not a linear transition graph. `status: approved` only once both
are present; `manage_academic` alone never fills a slot — only a membership whose
`staff_profile.role_template.system_key` is exactly `coordination` or `director` can (checked via
`SchoolRoleTemplate.system_key`, the same field `school_role_templates` already carries). This gate
is independent of the guardian-visibility publish step (BR-IN08), by product decision.

**No hard delete (BR-IN05):** `incidents` carries no `discarded_at` — "archived" is a `status`
value, not a Discard flag, so the business lifecycle and the soft-delete mechanism are not
conflated for this table. No archive endpoint ships in this pass (not in the PRD's API list);
the status value exists in the schema for a later pass.

**Attachments:** `has_many_attached :attachments` directly on `Incident` (Active Storage), the
same mechanism already used by `student_health_records.document` and
`authorized_pickups.photo` — no separate `incident_attachments` join table. No upload endpoint
ships in this pass; the capability is scaffolded on the model per BR-IN05/the PRD's database
section, but the concrete feature request (two text fields) does not need it yet.

**No distinct event date:** UC-IN01's input list (`student_id, type, description, visibility`) has
no "when it happened" field, so the record date shown in the grid is `created_at`. Whether a
school ever needs a date distinct from the record date is an open item, not a guessed column.

### Daily routine (BC11)

| Table | Role |
|-------|------|
| `daily_routines` | One Infantil card per child per date |

The paper agenda is the content reference (narrative, sleep, meals, signals). It is not a UI
model. `school_class_id` references `classes.id`. `author_id` references `teachers.id`.

| Column | Notes |
|--------|-------|
| `school_id`, `student_id`, `school_class_id`, `date` | Unique on `(school_id, student_id, date)` |
| `author_id` | Teacher who writes the card |
| `narrative` | Nullable text |
| `sleep_morning`, `sleep_after_lunch`, `sleep_afternoon` | Null, `yes`, or `no` |
| `interaction`, `evacuation`, `discomfort` | Null, `yes`, or `no` |
| `discomfort_detail` | Sensitive. Required when `discomfort` is `yes`; empty otherwise |
| `meal_breakfast`, `meal_lunch`, `meal_afternoon_snack`, `meal_dinner`, `meal_hydration` | Null, `great`, `regular`, or `refused` |
| `status` | `draft` or `sent` |
| `sent_at` | Set when the one routine message is posted |

No `discarded_at`. Same-day edits use `America/Sao_Paulo`. A later civil day is not writable.
`communication_attachments.daily_routine_id` and `messages.daily_routine_id` (unique) live with
the communication model. Only classes `infantil_1` … `infantil_5` get a row. `manage_academic`
reads these rows and does not read `conversations`.

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

Health-related incident fields marked sensitive; `description`, `guardian_points_raised`, and
`school_response` may all carry sensitive family content regardless of category and are flagged
accordingly (BR-IN07); guardian visibility explicit per incident.
`daily_routines.discomfort_detail` is health data about a child. Guardian routine reads are
family-scoped and omit null fields. Retention for messages, attachments, and routine rows remains
pending legal review; sent content is not hard-deleted.
Report-card snapshots and Preceptoria narratives are child education records. All guardian reads
are family-scoped; retention and access-audit periods remain pending legal review.
