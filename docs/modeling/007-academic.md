# Data Model — Academic (007)

> PRD: [`docs/prds/academic/`](../prds/academic/)  
> Depends on: [`009-platform-admin.md`](009-platform-admin.md), [`005-students-enrollments.md`](005-students-enrollments.md), [`006-communication.md`](006-communication.md)  
> Executable schema: [`docs/database/schema.dbml`](../database/schema.dbml) · DER: `der_007.png` (TBD)

## Product decisions (embedded)

- **Assessment periods:** default template **trimester** (3 periods) for `fundamental_medio`;
  **bimester** (4) available per school template — configured on `school_years.period_template`.
- **Auto-confirm absence delay:** **15 minutes** after teacher marks absent before push fires —
  allows correction window ([`attendance.md`](../prds/academic/attendance.md) BR-AT06).

## Entity groups

### Attendance (BC1)

| Table | Role |
|-------|------|
| `attendance_sessions` | Class + date + period |
| `attendance_records` | Per-student status — present/absent/justified |
| `absence_justifications` | Guardian/staff justification + optional attachment |

### Grades (BC2)

| Table | Role |
|-------|------|
| `evaluation_templates` | Components per discipline/class |
| `grade_entries` | Score/concept per student/component/period |
| `grade_launches` | Batch publish state |

### Report cards (BC3)

| Table | Role |
|-------|------|
| `report_card_configs` | Per-school template reference |
| `report_card_publications` | Period publish snapshot |

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

`AbsenceRecorded` → communication notification pipeline (NFR-001 reliability requirements).

## NFR-001 hooks

Attendance confirmation job: idempotent delivery keyed by `attendance_record_id`; retry with
exponential backoff; audit `notification_deliveries` outcome.

## LGPD

Health-related incident fields marked sensitive; guardian visibility explicit per incident.
