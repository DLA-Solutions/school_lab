# PRD — Platform: Collaborator Health Record (BC6)

> Status: validated
> Parent PRD: [`index.md`](index.md)
> Capability IDs: `platform.manage_collaborator_health_profile`
> Related: [`staff-users.md`](staff-users.md); mirrors `students-and-enrollments`'s
> `StudentHealthProfile` field shape
> Modeling: *(pending — `009-platform-admin.md`)*
> API narrative: *(pending)*

---

## Objective

Let a collaborator (the existing `Teacher` record — "Named Teacher because teaching assignments
hang off it, but the register covers every post", per `app/models/teacher.rb`) fill in their own
health facts, and let an administrator read them from the Colaboradores roster — same shape and
intent as a student's health profile, scoped to staff instead.

---

## Context

A **student** health profile (`student_health_profiles`) already exists
(students-and-enrollments domain) with: `blood_type`, `health_plan_name`, `health_plan_number`,
`emergency_contact_name`, `emergency_contact_phone`, `special_care_notes`. The product owner
confirmed (2026-10-02) the collaborator version mirrors that same field set exactly — no new
fields invented here.

`Teacher` rows are **not** necessarily linked to a login — "a collaborator here is a person on
file and needs no login" (same file). The logged-in user who may fill this in is a `membership`
with `role: "teacher"`; the existing report-card preview work already established the only link
between that login and a `Teacher` row is **matching email**
(`teacher_record = create(:teacher, ..., email: teacher_user.email)` in
`spec/requests/.../report_card_previews_spec.rb`) — there is no FK from `users`/`memberships` to
`teachers`. Resolve the same way here: the authenticated teacher's own `Teacher` row is
`Current.school.teachers.kept.find_by!(email: Current.user.email)`.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Collaborator self-reported health record | `platform.manage_collaborator_health_profile` | [`main-menu-description.md`](../../main-menu-description.md) — "Colaboradores ... dossiê Documentos pessoais, ficha de saúde ... Lista dos colaboradores e botão ver ficha de saúde" |

---

## Actors and surfaces

| Actor | Surfaces | Notes |
|-------|----------|-------|
| teacher (any collaborator with a login) | Web SPA (`/app`) | Create/update their own health profile only |
| staff with `manage_people` | Web SPA (`/app`) | Read any collaborator's health profile from the Colaboradores roster |

---

## Business Rules

BR-CH01 — `capability_id`: `platform.manage_collaborator_health_profile`

One `teacher_health_profiles` row per `Teacher` (`teacher_id` unique), same field set as
`student_health_profiles`: `blood_type` (same enum), `health_plan_name`, `health_plan_number`,
`emergency_contact_name`, `emergency_contact_phone` (digits-normalized, same as the student
version), `special_care_notes` — same length limits as the student version.

BR-CH02

Only the logged-in teacher whose email matches the `Teacher` row's email may create/update that
row's health profile. Staff with `manage_people` may read (not write) any collaborator's profile —
mirrors how `manage_people` already gates the Colaboradores roster itself.

BR-CH03

A `Teacher` row with no logged-in match (no login, or email mismatch) simply has no way to be
filled by its subject — staff with `manage_people` can still see the roster entry with an empty
profile. No write path for staff on someone else's behalf in this version `[product decision]`.

BR-CH04

`school_id` scoping throughout (NFR-003) — never cross-school.

---

## Use Cases

### UC-CH01 — Fill my health profile (teacher)

Input: the field set in BR-CH01.

Flow

1. Resolve `Current.school.teachers.kept.find_by!(email: Current.user.email)` — `404` if the
   logged-in user has no matching `Teacher` row at this school.
2. Upsert `teacher_health_profiles` for that teacher (BR-CH02).

### UC-CH02 — Read a collaborator's health profile (admin)

Input: `teacher_id`.

Flow

1. Validate `manage_people`.
2. Return the profile, or an empty/absent state if the collaborator never filled it in.

---

## API

Base: `/api/v1/schools/:school_id/academics` (same namespace `teachers` already lives in)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/me/teacher_health_profile` | UC-CH01 read-back for the logged-in teacher |
| `PUT` | `/me/teacher_health_profile` | UC-CH01 upsert |
| `GET` | `/teachers/:teacher_id/health_profile` | UC-CH02, `manage_people` only |

---

## Errors

| Status | Code | Description |
|--------|------|--------------|
| 403 | `forbidden` | Staff without `manage_people` reading someone else's profile; anyone writing someone else's |
| 404 | `not_found` | Logged-in user has no matching `Teacher` row; unknown/cross-school `teacher_id` |

---

## Database

| Entity | Purpose |
|--------|---------|
| `teacher_health_profiles` | One row per `Teacher`, same shape as `student_health_profiles` |

---

## Permissions

| Key | write own | read own | read any collaborator |
|-----|-----------|----------|------------------------|
| teacher (email-matched to the `Teacher` row) | yes | yes | — |
| `manage_people` | — | — | yes |

---

## Non-functional requirements

- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — `school_id` scoping (BR-CH04).
- [NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy) — health data; same sensitivity class as the student version.

---

## Acceptance Criteria

AC-CH01

- [ ] Given teacher T's login email matches `Teacher` row R, When T submits a health profile,
      Then it is saved against R and readable back by T.
- Source: BR-CH01/BR-CH02

AC-CH02

- [ ] Given staff S has `manage_people`, When S opens collaborator R's roster entry, Then S can
      read R's health profile (or see it is empty) without being able to edit it.
- Source: BR-CH02

AC-CH03

- [ ] Given teacher T1 and T2 are different collaborators, When T1 attempts to write T2's health
      profile, Then the API returns `403`.
- Source: BR-CH02

---

## Open items / pending decisions

- [ ] Whether staff with `manage_people` should be able to fill this in on behalf of a
      collaborator with no login (BR-CH03) — deferred until asked for.

---

## Out of Scope

- Document/attachment uploads (exam results, certificates) — could later reuse the `documents`
  polymorphic attachment pattern already on `Teacher` (`has_many :documents, as: :documentable`).
- Any health workflow beyond self-reported facts (e.g. periodic exam reminders).
