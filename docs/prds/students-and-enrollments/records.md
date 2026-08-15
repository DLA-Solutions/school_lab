# PRD — Students: Records (BC2)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `students.update_student_record`, `students.manage_guardian_link`, `students.manage_class_structure`, `students.assign_class`  
> Related BC: [`enrollments.md`](enrollments.md)  
> Modeling: [`005-students-enrollments.md`](../../modeling/005-students-enrollments.md)  
> API narrative: [`students-and-enrollments.md`](../../api/v1/students-and-enrollments.md)

---

## Objective

Define **student person records**, **guardian–student links**, and **class structure** so staff
can maintain cadastral data, family relationships, and turmas — the foundation for enrollments,
family isolation ([NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy)),
and downstream communication/academic recipient resolution.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Update student record | `students.update_student_record` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md), [`parity-matrix.md`](../../product/parity-matrix.md#students--enrollments) |
| Manage guardian–student link | `students.manage_guardian_link` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md), [`proesc/gestao-academica/casos-de-borda.md`](../../ref/proesc/gestao-academica/casos-de-borda.md) (guardian visibility failures) |
| Manage class structure | `students.manage_class_structure` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) (turmas, turnos, capacidade), [`proesc/gestao-academica/fluxos.md`](../../ref/proesc/gestao-academica/fluxos.md) |
| Assign student to class | `students.assign_class` | `[product decision]` — via enrollment class_id or PATCH enrollment; capacity enforced |

P2 capabilities documented for boundary only: `students.unify_person_records`,
`students.transfer_enrollment` (MVP uses assign_class + enrollment update).

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Classes tagged `segment: infantil`; simplified cadastral set |
| `fundamental_medio` | yes | Full cadastral fields; RA optional per school policy |
| `pj_financeiro` | partial | `financial_responsible` link role required before boleto issuance (identity BR-O10) |
| `multi_unidade` | partial | Classes and students per school; no shared class across units |

---

## Context

Competitors combine **cadastro do aluno**, **responsáveis**, and **turmas** in ERP modules.
School Lab separates **records** (stable identity) from **enrollments** (year-specific placement)
while keeping create flows composable in one transaction (UC-E01).

**Fintech-first baseline**

- `students`, `guardians`, `student_guardians` exist with minimal columns.
- No `classes` table; no relationship roles on links.
- Guardian `user_id` linked by identity onboarding, not this BC.

**Family isolation**

Guardian authorization resolves children exclusively through `student_guardians` where
`guardians.user_id = current_user` (NFR-002). Staff must never expose guardian B's children to
guardian A — policies return `404` on cross-family ids.

Proesc edge case: misconfigured links cause "guardian sees nothing" at year start
([`casos-de-borda.md`](../../ref/proesc/gestao-academica/casos-de-borda.md)) — MVP validates
links at enrollment activate and surfaces warnings in roster UI `[product decision]`.

---

## Business Rules

BR-R01

A **student** is a school-scoped person record (`students.school_id`) with cadastral fields.
Students do **not** have user accounts or memberships in MVP (D1).

BR-R02

Required cadastral fields for MVP: `full_name`, `birth_date`. Optional: `cpf`, `ra`,
`gender`, `nationality`, `address` subset — LGPD minimization (collect only what school
requires for enrollment/billing).

BR-R03

When `cpf` is present, it must be unique per `school_id` among non-discarded students
(`409 duplicate_cpf`).

BR-R04

A **guardian** is a school-scoped person record (`guardians.school_id`), distinct from
`users`. One guardian row may link to at most one `users` row via `guardians.user_id` after
identity invite accept.

BR-R05

Creating a `student_guardians` link does **not** auto-invite the guardian. Staff triggers
identity invite separately ([`onboarding.md`](../identity-and-onboarding/onboarding.md) UC-O04).
Guardian profile may exist before portal access.

BR-R06

Each `student_guardians` row defines `relationship` enum: `parent`, `guardian`, `other` and
role flags: `primary_contact`, `financial_responsible`, `pickup_authorized` (multiple flags
allowed; at least one guardian per student in MVP).

BR-R07

Exactly **one** guardian link per student should have `financial_responsible: true` when billing
is enabled — charge issuance validates this (fintech-first extension). Warning if zero or
multiple.

BR-R08

Each **class** (`classes`) has `capacity` (nullable = unlimited). Assigning enrollment to class
when active count ≥ capacity returns `409 class_at_capacity` unless staff passes
`force: true` with audit reason (director/secretary only) `[product decision]`.

BR-R09

Classes belong to one `school_year_id` and optional `segment_id` (D6 stub). Fields: `name`,
`shift` (`morning` | `afternoon` | `night` | `full`), `grade_level` label, `parent_class_id`
for multigrade child turmas.

BR-R10

**Assign class** updates the enrollment's `class_id` for the active school year (UC-R04) —
does not create a new student record. Historical class placement is preserved on past
enrollments when year changes.

BR-R11

Discarding a student (soft delete) is allowed only when no `active` enrollment and no open
billing contracts — otherwise `409 student_has_active_dependencies`.

BR-R12

Staff with partial `manage_people` scope (segment) may only list/update students and classes
in their `segment_id` when D6 segments are enabled.

---

## Use Cases

### UC-R01 — Create or update student record

Input: cadastral fields, optional `cpf`, `ra`.

Flow

1. Authorize `manage_people` or `manage_enrollment`.
2. Validate uniqueness (BR-R03).
3. Create or PATCH student; audit changes (NFR-005).
4. Do not create user/membership.

### UC-R02 — Manage guardian–student link

Input: `student_id`, `guardian_id` (or inline guardian create), relationship, role flags.

Flow

1. Authorize `manage_people`.
2. Ensure both rows share `school_id`.
3. Upsert `student_guardians` (BR-R06).
4. Validate financial_responsible cardinality (BR-R07) — warning in response if invalid.
5. Optionally suggest identity invite (no auto-send — BR-R05).

### UC-R03 — Manage class structure

Input: class fields, optional `parent_class_id` for multigrade.

Flow

1. Authorize `manage_enrollment` (class structure tied to enrollment domain menu).
2. Create/update/archive class (Discard gem — archived classes reject new enrollments).
3. Validate school_year and segment scope (BR-R09).

### UC-R04 — Assign student to class

Input: `enrollment_id`, target `class_id`, optional `force`, `force_reason`.

Flow

1. Load active enrollment (enrollments BC).
2. Validate class same school/year (BR-E05 in enrollments).
3. Check capacity (BR-R08); allow override with audit when authorized.
4. Update `enrollment.class_id` (BR-R10).
5. Emit `EnrollmentClassChanged` for comms/academic roster refresh.

### UC-R05 — List class roster

Input: `class_id`, `school_year_id`.

Flow

1. Authorize staff read (`manage_enrollment` or teacher class assignment scope).
2. Return active enrollments with student summary and guardian primary contact.
3. Teachers see only assigned classes.

### UC-R06 — Guardian views linked students

Input: authenticated guardian membership.

Flow

1. Resolve `guardians` row via `user_id`.
2. Return students linked through `student_guardians` only (NFR-002).
3. Include current active enrollment summary per student.

---

## API

### POST /api/v1/schools/:school_id/students

### PATCH /api/v1/schools/:school_id/students/:id

### POST /api/v1/schools/:school_id/guardians

### POST /api/v1/schools/:school_id/students/:student_id/guardian_links

Request

```json
{
  "guardian_id": "uuid",
  "relationship": "parent",
  "primary_contact": true,
  "financial_responsible": true,
  "pickup_authorized": true
}
```

### POST /api/v1/schools/:school_id/classes

### PATCH /api/v1/schools/:school_id/classes/:id

### PATCH /api/v1/schools/:school_id/enrollments/:id/class

Assign class (UC-R04) — may live under enrollments controller; documented in both BCs.

### GET /api/v1/schools/:school_id/classes/:id/roster

### GET /api/v1/schools/:school_id/me/students

Guardian family scope (extends fintech-first).

---

## Errors

| Status | Code / condition | Description |
|--------|------------------|-------------|
| 400 | `validation_error` | Invalid cadastral data |
| 403 | `forbidden` | Missing permission or segment scope |
| 404 | `not_found` | Cross-tenant or cross-family access |
| 409 | `duplicate_cpf` | BR-R03 |
| 409 | `class_at_capacity` | BR-R08 |
| 409 | `student_has_active_dependencies` | BR-R11 |

---

## Database

| Entity group | Purpose |
|--------------|---------|
| `students` | School-scoped learner person record |
| `guardians` | School-scoped responsible person; optional `user_id` |
| `student_guardians` | Link + relationship + role flags |
| `classes` | Turma structure per school year |
| `class_assignments` | Historical class placement and current assignment per student/year |

| Artifact | Location |
|----------|----------|
| Narrative DSL | [`docs/modeling/005-students-enrollments.md`](../../modeling/005-students-enrollments.md) |
| DBML | [`docs/database/schema.dbml`](../../database/schema.dbml) |
| DER | [`docs/database/der_005.png`](../../database/der_005.png) |

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `StudentCreated` / `StudentUpdated` | UC-R01 | Audit, search index (future) |
| `GuardianLinkChanged` | UC-R02 | Identity (invite suggestions), billing (financial guardian) |
| `ClassStructureChanged` | UC-R03 | Academic (diary setup phase), communication (channels) |
| `EnrollmentClassChanged` | UC-R04 | Communication, academic attendance rosters |

---

## Permissions

| Action | Permission key |
|--------|----------------|
| Student/guardian CRUD | `manage_people` |
| Guardian link CRUD | `manage_people` |
| Class structure CRUD | `manage_enrollment` |
| Assign class | `manage_enrollment` |
| Roster read (staff) | `manage_enrollment` or teacher class scope |
| `/me/students` | guardian membership (no permission keys) |

Segment partial scope on `manage_people` per [`permissions.md`](../identity-and-onboarding/permissions.md) BR-P16.

---

## Non-functional requirements

- [NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy) — family isolation on guardian routes; minimize student PII fields.
- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — all records include `school_id`.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — cadastral changes and link mutations audited.

---

## Acceptance Criteria

AC-R01

- [ ] Given staff creates a student with duplicate CPF in the same school  
      When POST students  
      Then API returns 409 `duplicate_cpf`  
- Source: [`mvp-scope.md`](../../product/mvp-scope.md) — `students.import_students_bulk` decision

AC-R02

- [ ] Given guardian A linked to student S via student_guardians  
      When guardian B GET /me/students/:id for S  
      Then API returns 404  
- Source: NFR-002 — [`non-functional-requirements.md`](../../product/non-functional-requirements.md)

AC-R03

- [ ] Given a class with capacity 25 and 25 active enrollments  
      When staff assigns a 26th enrollment without force  
      Then API returns 409 `class_at_capacity`  
- Source: [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md)

AC-R04

- [ ] Given staff creates guardian link with financial_responsible true  
      When no identity invite sent  
      Then guardian row exists with null user_id and billing may reference guardian_id  
- Source: BR-R05 — [`identity-and-onboarding/onboarding.md`](../identity-and-onboarding/onboarding.md)

AC-R05

- [ ] Given multigrade parent class P and child class C with parent_class_id P  
      When staff lists classes for school year  
      Then hierarchy is returned for UI grouping  
- Source: `[product decision]` — Proesc turma multisseriada pattern

AC-R06

- [ ] Given teacher assigned to class C  
      When GET roster for class C  
      Then students returned; GET roster for other class returns 403  
- Source: `[product decision]` — teacher class scope

---

## Open items / pending decisions

- [ ] Full cadastral field list for MVP vs phase 2 (address, health — LGPD).
- [ ] RA validation rules (per-school free text vs masked format).
- [ ] Whether `pickup_authorized` drives any MVP feature or is metadata only.
- [ ] Teacher roster read via permission key vs class assignment table (academic PRD overlap).

---

## Out of Scope

- Student user account and portal (`students.view_student_portal`, `students.invite_student_access`) — P2.
- Duplicate person merge (`students.unify_person_records`) — P2.
- Formal transfer workflow with finance side-effects (`students.transfer_enrollment`) — P2; MVP uses UC-R04.
- Discipline/subject assignment on turma — academic domain.
- Guardian invite and authentication — identity BC2.
- Emergency contacts — communication domain (`communication.manage_emergency_contacts`).
