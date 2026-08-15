# API v1 — Academic

> PRDs: [`docs/prds/academic/`](../../prds/academic/)  
> Modeling: [`docs/modeling/007-academic.md`](../../modeling/007-academic.md)  
> Platform: [`platform-and-admin.md`](platform-and-admin.md)  
> Conventions: [`docs/api/README.md`](../README.md)

Attendance, grades, report cards, diary, curriculum, incidents — NFR-001 on absence notifications.

---

## Attendance (W1 — reliability critical)

Base: `/api/v1/schools/:school_id/academic`

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

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/classes/:class_id/grade_book` | Grid by period |
| `PUT` | `/grade_entries` | Upsert scores |
| `POST` | `/grade_launches` | Publish period grades |

Period closed → `409 period_closed`.

---

## Report cards (W2)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/report_cards?student_id=&period_id=` | Staff |
| `GET` | `/me/students/:id/report_cards` | Guardian read |
| `POST` | `/report_cards/publish` | Coordination publish |

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

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/academic_periods/:id/closure_checklist` | Pre-close validation |
| `POST` | `/academic_periods/:id/close` | Close period |
| `POST` | `/academic_periods/:id/reopen` | Audited reopen |

---

## Events consumed

| Event | Action |
|-------|--------|
| `AbsenceRecorded` | Enqueue FCM + email via communication pipeline |

---

## OpenAPI tags

`Academic`, `Attendance`, `Grades`, `Guardian Me`
