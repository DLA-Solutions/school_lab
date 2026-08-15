# PRD — Academic: Curriculum (BC5)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `academic.manage_curriculum_matrix`  
> Related BCs: [`diary.md`](diary.md), [`grades.md`](grades.md)  
> Modeling: *(pending — `docs/modeling/007-academic.md`)*  
> API narrative: *(pending — `docs/api/v1/academic.md`)*

---

## Objective

Define **curriculum matrix** — disciplines, subdisciplines, and class bindings — enabling
self-service academic setup ([`DIV-academic-001`](../../ref/divergencias.md)) without ERP import in MVP.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Manage curriculum matrix | `academic.manage_curriculum_matrix` | [`DIV-academic-001`](../../ref/divergencias.md), [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) (disciplines, matrix) |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Fewer disciplines; optional thematic areas |
| `fundamental_medio` | yes | Full matrix |
| `pj_financeiro` | yes | — |
| `multi_unidade` | partial | Matrix per school |

---

## Context

Disciplines link **classes** (students BC) to **diaries** and **evaluation templates**. Skills
matrix depth is MVP-light — full BNCC tagging P2 `[product decision]`.

---

## Business Rules

BR-CU01

**Discipline** rows are school-scoped with `name`, `code`, optional `parent_discipline_id`
(subdiscipline).

BR-CU02

**Class curriculum** binds `class_id` + `discipline_id` + `school_year_id` with optional
`workload_hours` per period.

BR-CU03

Removing a discipline from class curriculum is blocked when launched grades or published report
cards exist for that binding.

BR-CU04

Discipline codes unique per school (`409 duplicate_discipline_code`).

BR-CU05

Coordination copies matrix from prior year with new `school_year_id` (bulk clone).

BR-CU06

Infantil classes may use **area groups** instead of traditional disciplines `[product decision]`.

---

## Use Cases

### UC-CU01 — Manage disciplines (coordination)

Input: discipline CRUD payloads.

Flow

1. Validate `manage_academic`.
2. Persist with uniqueness (BR-CU04).

### UC-CU02 — Bind disciplines to class

Input: class_id, discipline_ids[], workload.

Flow

1. Create class_curriculum rows (BR-CU02).
2. Auto-provision diary shells per binding `[product decision]`.

### UC-CU03 — Clone matrix for new school year

Input: source year, target year, class mapping.

Flow

1. Clone disciplines bindings (BR-CU05).

---

## API

### CRUD /api/v1/schools/:school_id/disciplines

### PUT /api/v1/schools/:school_id/classes/:class_id/curriculum

Replace or patch class discipline bindings.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 409 | `duplicate_discipline_code` | Code collision |
| 409 | `curriculum_in_use` | Grades published block removal |

---

## Database

Expected entity groups: `disciplines`, `class_curriculum`, `curriculum_clone_jobs`.

---

## Events

| Event | When | Consumers |
|-------|------|-----------|
| `ClassCurriculumChanged` | Binding update | Diary auto-provision, coordination dashboard |

---

## Permissions

| Key | disciplines | class curriculum |
|-----|-------------|------------------|
| `manage_academic` | yes | yes |
| teacher | read assigned | read |

---

## Non-functional requirements

- **[NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy)** — school-scoped disciplines.
- **[NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit)** — curriculum changes audited.

---

## Acceptance Criteria

AC-CU01

- [ ] Given coordination adds discipline to class, When diary list loads for teacher, Then diary exists for that class-discipline pair.
- Source: `[product decision]`

AC-CU02

- [ ] Given published report card for discipline D, When staff removes D from class curriculum, Then API returns `409 curriculum_in_use`.
- Source: BR-CU03

AC-CU03

- [ ] Given matrix cloned to new year, When complete, Then all bindings reference new school_year_id with empty grades.
- Source: [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md)

---

## Open items / pending decisions

- [ ] Auto-provision diaries on curriculum bind vs lazy create on first lesson.
- [ ] BNCC skill tagging phase.

---

## Out of Scope

- ERP curriculum import — P2 integrations.
- Billing charge types by discipline — billing domain.
