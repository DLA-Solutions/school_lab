# API v1 — Students & Enrollments

> PRDs: [`docs/prds/students-and-enrollments/`](../../prds/students-and-enrollments/)  
> Modeling: [`docs/modeling/005-students-enrollments.md`](../../modeling/005-students-enrollments.md)  
> Platform contract: [`platform-and-admin.md`](platform-and-admin.md) — **frozen W1 (4C.1)**  
> Conventions: [`docs/api/README.md`](../README.md)

Extends fintech-first people routes with enrollments, classes, and bulk import.

---

## School year context

Enrollment and class routes require explicit year context per the frozen Platform contract
([`platform-and-admin.md`](platform-and-admin.md) § Cross-domain contract):

- Pass `school_year_id` as a query parameter on list/create endpoints, or `X-School-Year-Id` where
  noted.
- Default to the active year from `GET /schools/:school_id/school_years/active` when the UI has
  no explicit selection.
- Services reject `school_year_id` from another school (`404`) and block **new** enrollments for
  **archived** years (`422 archived_school_year`).
- Class list and enrollment export filters use the same parameter: `?school_year_id=:id`.

---

## Students & guardians

Base: `/api/v1/schools/:school_id/people`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/students` | Paginated list — filter `status`, `class_id`, `school_year_id` |
| `POST` | `/students` | Create student record |
| `PATCH` | `/students/:id` | Update — `manage_enrollment` |
| `GET` | `/guardians` | List guardians |
| `POST` | `/guardians` | Create guardian + optional invite |
| `POST` | `/student_guardians` | Link guardian ↔ student |

Existing fintech-first paths remain; this narrative adds enrollment and class endpoints.

---

## Classes (W1)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/classes?school_year_id=` | List turmas |
| `POST` | `/classes` | Create — capacity, shift, segment |
| `PATCH` | `/classes/:id` | Update |
| `POST` | `/classes/:id/assignments` | Bulk assign students |

---

## Enrollments (W1)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/enrollments?school_year_id=` | List matrículas |
| `POST` | `/enrollments` | Enroll student for year |
| `PATCH` | `/enrollments/:id` | Status, class assignment |
| `GET` | `/enrollments/export` | CSV export — `manage_enrollment` |

### `POST /enrollments`

```json
{
  "student_id": 1,
  "school_year_id": 10,
  "class_id": 5,
  "enrolled_on": "2026-02-03"
}
```

---

## Bulk import (W2)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/enrollments/import?dry_run=true` | Preview CSV |
| `POST` | `/enrollments/import?dry_run=false` | Commit batch |

Distinct from onboarding `provisioning/import` (white-glove provisioning only).

---

## Consent

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/students/:id/consents` | Staff view |
| `POST` | `/students/:id/consents` | Record consent |
| `GET` | `/me/students/:id/consents` | Guardian self-service |

See [`identity-and-onboarding/consent.md`](../../prds/identity-and-onboarding/consent.md).

---

## Errors

| HTTP | `error.code` | When |
|------|--------------|------|
| `409` | `class_at_capacity` | BR-R08 |
| `422` | `import_validation_failed` | CSV errors |

---

## OpenAPI tags

`People`, `Enrollments`, `Classes`
