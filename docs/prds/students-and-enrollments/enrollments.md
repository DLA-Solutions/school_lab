# PRD — Students: Enrollments (BC1)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `students.enroll_student`, `students.import_students_bulk`, `students.manage_enrollment_contract`, `students.export_enrollment_reports`, `students.manage_enrollment_operations`  
> Related BC: [`records.md`](records.md)  
> Modeling: [`005-students-enrollments.md`](../../modeling/005-students-enrollments.md)  
> API narrative: [`students-and-enrollments.md`](../../api/v1/students-and-enrollments.md)

---

## Objective

Define **enrollment lifecycle** for a school year — create, update, status transitions, bulk
import, contract template binding, and exports — so Secretaria can matricular alunos and hand
off stable enrollment IDs to billing, communication, and academic domains.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Enroll student | `students.enroll_student` | [`proesc/gestao-academica/fluxos.md`](../../ref/proesc/gestao-academica/fluxos.md) (matrícula workflow), [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md), [`agenda-edu/gestao-academica/funcionalidades-por-ator.md`](../../ref/agenda-edu/gestao-academica/funcionalidades-por-ator.md), [`classapp/gestao-academica/funcionalidades-por-ator.md`](../../ref/classapp/gestao-academica/funcionalidades-por-ator.md) |
| Import students in bulk | `students.import_students_bulk` | [`classapp/gestao-academica/funcionalidades-por-ator.md`](../../ref/classapp/gestao-academica/funcionalidades-por-ator.md), [`parity-matrix.md`](../../product/parity-matrix.md#students--enrollments) |
| Manage enrollment contract | `students.manage_enrollment_contract` | [`DIV-financial-007`](../../ref/divergencias.md) — templates + binding; signature deferred |
| Export enrollment reports | `students.export_enrollment_reports` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) (carteirinha, lists) |
| General enrollment operations | `students.manage_enrollment_operations` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) — catch-all |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Same enrollment statuses; turma segment tag drives comms/academic routing |
| `fundamental_medio` | yes | Primary enrollment volume |
| `pj_financeiro` | partial | Contract binds financial guardian; PJ payer is billing P2 |
| `multi_unidade` | partial | Enrollments scoped per `school_id`; no cross-unit enroll in MVP |

---

## Context

Competitors treat matrícula as a multi-step flow: cadastro → turma → plano → contrato →
assinatura ([`DIV-academic-003`](../../ref/divergencias.md)). School Lab MVP delivers **staff-driven
enrollment** with optional unsigned contract binding; the online **trilha** (data → contract →
plan → pay) and guardian self-service are phase 2.

**Dependencies**

- BC2 records must exist or be created in the same transaction (student, class, guardian links).
- Identity permissions: `manage_enrollment` (primary), `manage_people` (create student/guardian).
- Platform school year (stub or full) supplies `school_year_id`.
- Billing `contracts` (fintech-first) may reference enrollment after UC-E03.

**Fintech-first baseline**

- No `enrollments` table today — billing `contracts` link directly to `student_id`.
- W2 introduces `enrollments` and migrates partner school to enrollment-scoped contracts.

---

## Re-enrollment boundary

| Topic | Owner | MVP | Phase 2 |
|-------|-------|-----|---------|
| Staff creates new enrollment for returning student | **Students BC1** (`students.enroll_student`) | yes — new `enrollments` row for new school year | — |
| Staff updates class on existing enrollment | **Students BC2** (`students.assign_class`) | yes | — |
| Guardian online rematrícula trilha | **Academic** (`academic.process_reenrollment`) | no | yes — [`DIV-academic-003`](../../ref/divergencias.md) |
| Vacancy slots / pre-matrícula | **Students P2** (`students.manage_enrollment_slots`) | no | yes |
| Payment plan selection on trilha | **Billing** (`billing.select_plan_on_enrollment`) | no | yes |
| E-signature on contract | **Students/Billing P2** + documents infra | no | yes — [`DIV-financial-007`](../../ref/divergencias.md) |

**MVP rematrícula:** Secretaria enrolls returning students via UC-E01 (same as new enrollment,
with existing student record). Reports may filter `enrollment_kind: new | returning` (BR-E04).
Online self-service rematrícula is explicitly **out of scope** — documented here so academic PRD
does not duplicate staff enrollment rules.

Proesc pattern: relatório de alunos não rematriculados identifies gaps; MVP export UC-E04
supports "not enrolled in target year" filter `[product decision]`.

---

## Business Rules

BR-E01

An **enrollment** binds one `student_id`, one `school_year_id`, one `class_id`, and
`school_id` — the unit Secretaria tracks for matrícula.

BR-E02

At most **one active enrollment** per student per school year per school. Attempting a second
active enrollment returns `409 enrollment_already_active`.

BR-E03

Enrollment status uses an explicit state machine: `draft` → `active` → `completed` |
`withdrawn`. Invalid transitions return `422 invalid_transition`. `draft` allows edit/delete;
`active` allows class change (via records BC) and contract bind; `withdrawn` is terminal with
audit reason.

BR-E04

`enrollment_kind` is `new` or `returning` (staff-selected or inferred when student had a
prior completed enrollment in any prior year at the same school) — for reports only; no
workflow difference in MVP.

BR-E05

Creating an enrollment requires the target class to belong to the same `school_id` and
`school_year_id` (records BR-R09).

BR-E06

Bulk import supports `dry_run=true` preview returning row-level errors without commit;
`dry_run=false` commits in a single database transaction per batch — all rows succeed or
none persist.

BR-E07

Bulk import rejects duplicate student CPF within the same school when CPF is present
(`409 duplicate_cpf`). Rows without CPF match on normalized name + birth date warning only
(staff confirms) `[product decision]`.

BR-E08

Enrollment **contract templates** are school-scoped HTML/PDF merge templates. Binding an
`enrollment_contract` to an enrollment stores `document_id` referencing the generated PDF in
`archive_documents` and
`signature_status: pending`. **Unsigned contracts do not block** enrollment activation,
guardian login, or billing (BR-O11).

BR-E09

Only staff with `manage_enrollment` may activate enrollments, bind contracts, and run bulk
import. Staff with `manage_people` only may create student/guardian records but not activate
enrollments unless template grants both keys.

BR-E10

Export endpoints are read-only and scoped by `school_id`; large exports are async jobs with
download token (NFR-001 idempotence on job enqueue).

BR-E11

Withdrawing an enrollment (`withdrawn`) does **not** delete the student record or guardian
links. Billing contracts remain for audit; new charges require staff action (billing domain).

BR-E12

**Bulk import entry points:**

- **Onboarding CSV** (identity UC-O06) — during `provisioning` / white-glove; audited on
  `provisioning_imports`; may create students, guardians, links, and draft enrollments.
- **Enrollment import** (UC-E05) — post-`active` school; audited on `enrollment_imports`;
  requires `manage_enrollment`.

Same column schema may be shared; **separate service classes** — no dual-write from one controller.

---

## Use Cases

### UC-E01 — Enroll student (staff)

Input: `student_id` (or inline student create payload), `class_id`, `school_year_id`,
optional `enrollment_kind`, optional guardian link ids.

Flow

1. Validate staff `manage_enrollment` and class/year scope (BR-E05, BR-E09).
2. If student new, delegate to records BC create (UC-R01) in same transaction.
3. Create enrollment in `draft` or `active` (staff choice; default `active`).
4. Check one-active-per-year (BR-E02).
5. Validate class capacity (BR-R08 — records BC).
6. Emit `EnrollmentCreated` event.

### UC-E02 — Update enrollment status

Input: `enrollment_id`, target status, optional `withdrawal_reason`.

Flow

1. Load enrollment scoped by `school_id`.
2. Apply AASM transition (BR-E03).
3. Audit status change (NFR-005).

### UC-E03 — Bind enrollment contract

Input: `enrollment_id`, `contract_template_id`, merge fields.

Flow

1. Render PDF from template and store it through the documents/archive boundary.
2. Create `enrollment_contracts` with `document_id` referencing the generated
   `archive_documents` row and `signature_status: pending` (BR-E08).
3. Optionally link the fintech-first `contracts` row through `enrollment_id`; billing resolves
   the responsible guardian from `student_guardians.financial_responsible` when creating each
   `charges.guardian_id`.
4. Do not block enrollment or invites on pending signature.

### UC-E04 — Export enrollment report

Input: report type (`enrollment_list`, `student_card`, `not_reenrolled`), filters
(`school_year_id`, `class_id`, `status`).

Flow

1. Authorize `manage_enrollment` or read-only template with export key.
2. Query enrollments with student, class, guardian summary.
3. Sync export for &lt;500 rows; async job otherwise (BR-E10).
4. `student_card` (carteirinha) includes student name, class, year, school branding
   `[product decision]` — competitor parity Agenda Edu / Proesc.

### UC-E05 — Bulk import students and enrollments

Input: CSV file, `dry_run` flag, default `class_id` / `school_year_id` for rows missing them.

Flow

1. Parse rows: student fields, guardian fields, optional class code, relationship roles.
2. Validate all rows; return preview with errors if `dry_run=true` (BR-E06).
3. On commit: upsert students (match CPF or create), upsert guardians, create links (records
   BC), create enrollments (BR-E02, BR-E07).
4. Record batch on `enrollment_imports`.
5. **Does not** send guardian invites — staff triggers identity invite separately (BR-R05).

### UC-E06 — List and search enrollments

Input: filters (`school_year_id`, `class_id`, `status`, `q` on student name).

Flow

1. Scope by `school_id`; apply segment filter when staff has partial `manage_people` scope.
2. Paginate; include student summary and class name.

---

## API

### POST /api/v1/schools/:school_id/enrollments

Request

```json
{
  "student_id": "uuid",
  "class_id": "uuid",
  "school_year_id": "uuid",
  "status": "active",
  "enrollment_kind": "new"
}
```

Response 201

```json
{
  "id": "uuid",
  "student_id": "uuid",
  "class_id": "uuid",
  "school_year_id": "uuid",
  "status": "active",
  "enrollment_kind": "new"
}
```

### PATCH /api/v1/schools/:school_id/enrollments/:id

Status transitions and metadata updates.

### POST /api/v1/schools/:school_id/enrollments/import

Multipart CSV; query `dry_run=true|false`.

### POST /api/v1/schools/:school_id/enrollments/:id/contract

Bind contract template (UC-E03).

### GET /api/v1/schools/:school_id/enrollment_exports

Query params: `type`, filters; returns sync file or `202` with job id.

### GET /api/v1/schools/:school_id/enrollments

List/search (UC-E06).

---

## Errors

| Status | Code / condition | Description |
|--------|------------------|-------------|
| 400 | `validation_error` | Missing required fields |
| 403 | `forbidden` | Missing `manage_enrollment` |
| 404 | `not_found` | Enrollment or class outside tenant scope |
| 409 | `enrollment_already_active` | BR-E02 |
| 409 | `duplicate_cpf` | BR-E07 import |
| 409 | `class_at_capacity` | BR-R08 |
| 422 | `invalid_transition` | BR-E03 |
| 422 | `import_validation_failed` | CSV preview/commit errors |

---

## Database

| Entity group | Purpose |
|--------------|---------|
| `enrollments` | Student × school year; status, kind, and current `class_assignment_id` |
| `class_assignments` | Class placement history; API `class_id` resolves through the current assignment |
| `enrollment_contracts` | Template binding; `document_id` → `archive_documents.id`; `signature_status` |
| `enrollment_contract_templates` | School-scoped merge templates |
| `enrollment_imports` | Bulk import batch audit |

| Artifact | Location |
|----------|----------|
| Narrative DSL | [`docs/modeling/005-students-enrollments.md`](../../modeling/005-students-enrollments.md) |
| DBML | [`docs/database/schema.dbml`](../../database/schema.dbml) |
| DER | [`docs/database/der_005.png`](../../database/der_005.png) |

Existing fintech-first tables: `students`, `contracts` — extended, not replaced.

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `EnrollmentCreated` | UC-E01 | Billing (contract optional), communication (channel membership phase 3) |
| `EnrollmentStatusChanged` | UC-E02 | Academic (roster refresh), billing (withdrawal holds — TBD) |
| `EnrollmentContractBound` | UC-E03 | Documents storage, phase 2 signature webhook |
| `EnrollmentImportCommitted` | UC-E05 | Audit, optional async invite suggestions |

---

## Permissions

Uses identity permission keys ([`permissions.md`](../identity-and-onboarding/permissions.md)):

| Action | Permission key |
|--------|----------------|
| Create/update/withdraw enrollment | `manage_enrollment` |
| Bulk import | `manage_enrollment` |
| Bind contract | `manage_enrollment` |
| Export reports | `manage_enrollment` |
| Create student/guardian during enroll | `manage_people` (or inline via `manage_enrollment` when template includes both) |

Teacher and guardian roles: **no** enrollment write in MVP. Guardian reads enrolled children
via `/me/students` (fintech-first).

---

## Non-functional requirements

Cross-cutting: [`non-functional-requirements.md`](../../product/non-functional-requirements.md).

- [NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains) — enrollment state machine; transactional import.
- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — all routes under `/schools/:school_id/`.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — enrollment and import batch audit.

---

## Acceptance Criteria

AC-E01

- [ ] Given staff with `manage_enrollment` and an active class under capacity  
      When they POST enrollments with a valid student and school year  
      Then enrollment is created with status `active` and visible in class roster  
- Source: [`proesc/gestao-academica/fluxos.md`](../../ref/proesc/gestao-academica/fluxos.md)

AC-E02

- [ ] Given a student with an active enrollment for school year 2026  
      When staff POST a second active enrollment for 2026  
      Then API returns 409 `enrollment_already_active`  
- Source: `[product decision]`

AC-E03

- [ ] Given a CSV with one invalid row and dry_run true  
      When staff POST import  
      Then no records persist and response lists row errors  
- Source: [`classapp/gestao-academica/funcionalidades-por-ator.md`](../../ref/classapp/gestao-academica/funcionalidades-por-ator.md)

AC-E04

- [ ] Given staff binds an enrollment contract with signature_status pending  
      When guardian completes identity invite and logs in  
      Then login succeeds and unsigned contract does not block access  
- Source: BR-O11 — [`identity-and-onboarding/onboarding.md`](../identity-and-onboarding/onboarding.md)

AC-E05

- [ ] Given enrollment export type student_card  
      When staff requests export for a class  
      Then PDF includes student name, class, year, and school identity  
- Source: [`agenda-edu/gestao-academica/funcionalidades-por-ator.md`](../../ref/agenda-edu/gestao-academica/funcionalidades-por-ator.md)

AC-E06

- [ ] Given white-glove onboarding CSV already imported via UC-O06  
      When staff POST enrollment import with overlapping CPF  
      Then import rejects duplicate or merges per BR-E07 rules — not double enrollment  
- Source: `[product decision]` — BR-E12 boundary

---

## Open items / pending decisions

- [ ] Contract PDF renderer; object-storage implementation remains documents-domain engineering
      work, while the persistence target is decided as `archive_documents`.
- [x] Default enrollment status is `active`; staff may explicitly create `draft`.
- [x] `withdrawn` enrollment frees class capacity immediately by leaving the active count.
- [ ] Async export job UX in SPA (layer PRD).

---

## Out of Scope

- Online enrollment trilha (`students.run_online_enrollment_trail`) — P2.
- Vacancy slots (`students.manage_enrollment_slots`) — P2.
- Guardian self-cancel (`students.cancel_enrollment`) — P2.
- E-signature (`students.sign_enrollment_contract`) — phase 2 Authentic.
- CRM prospects and campaigns — P2.
- **`academic.process_reenrollment`** — online guardian rematrícula; academic PRD phase 2.
- Charge generation rules — billing domain.
