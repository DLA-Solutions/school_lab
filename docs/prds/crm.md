# PRD-CRM — Prospect contacts (lead list)

> Status: implemented *(minimal slice; written after the fact — see Context)*  
> Relation to School Lab: derived front — pre-enrollment layer next to
> [`students-and-enrollments/`](students-and-enrollments/index.md)  
> Capability IDs: `students.capture_prospect` *(canonical, P2 — this PRD implements its minimal slice early)*;
> `students.manage_enrollment_campaign` is **out of scope** (funnel/campaigns)  
> Modeling: table `crm_contacts` in [`docs/database/schema.dbml`](../database/schema.dbml) *(no narrative file yet)*  
> API: [`docs/api/v1/crm.md`](../api/v1/crm.md)

---

## Objective

Give the school's front office one place to record **prospects** — people who asked about the
school but are not yet guardians or students — with enough information to call them back and a
simple **lead temperature** (`cold` / `warm` / `hot`) so staff can see at a glance who is closest
to enrolling.

---

## Context

- The taxonomy lists `students.capture_prospect` ("CRM lead/opportunity before formal enrollment")
  as **P2**, with the PRD target
  [`students-and-enrollments/records.md`](students-and-enrollments/records.md). The product owner
  asked for a minimal list in the school SPA ahead of that wave; this PRD documents what shipped and
  fixes the boundaries so the P2 funnel does not grow by accident.
- A prospect is **not** a `Guardian` or `Student` and is never converted into one by this slice.
  Enrollment stays in [`students-and-enrollments/enrollments.md`](students-and-enrollments/enrollments.md).
- Tenant data: every row belongs to one school (`school_id`); isolation follows
  [`multi-tenancy`](../guidelines/web/multi-tenancy.md).
- Surface: school SPA (`/app`, menu item **CRM**, route `/crm`). The platform backoffice and the
  mobile app are not part of this slice.

---

## Competitive grounding

| Capability | ID | Evidence |
|------------|-----|----------|
| Capture enrollment prospect (lead before enrollment) | `students.capture_prospect` | Proesc CRM opportunities — 7 aliases in [`capability-aliases.jsonl`](../ref/capability-aliases.jsonl) (`cross-domain: CRM capture`); [`parity-matrix.csv`](../ref/parity-matrix.csv) row `students.capture_prospect` |
| Lead temperature (cold/warm/hot) | — | `[product decision]` — requested by the product owner; no competitor evidence recorded |
| Enrollment campaigns / CRM funnel | `students.manage_enrollment_campaign` | Deferred (P2) — see Out of Scope |

---

## Actors and surfaces

| Actor | Surfaces | Notes |
|-------|----------|-------|
| Director / secretary (staff with `manage_enrollment`) | School SPA, API | Create, list, search, filter, edit, reclassify, delete contacts |
| Teacher | — | No access (menu hidden, API `403`) |
| Guardian | — | No access (`403`) |
| Backoffice | — | Out of this slice |

Detail: [`docs/actors-and-surfaces.md`](../actors-and-surfaces.md).

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Prospects are not segment-bound; no segment field in this slice |
| `fundamental_medio` | yes | Same |
| `multi_unidade` | partial | One list per school record; no cross-unit view |

---

## Business Rules

BR-CRM01 — `capability_id`: `students.capture_prospect`

A CRM contact belongs to exactly one school and is invisible to every other school (cross-school
access is `404`).

BR-CRM02

`name` is required. `phone`, `email` and `notes` are optional; blank strings are stored as `null`.
`email`, when present, must be a valid address and is stored lowercase.

BR-CRM03 — `[product decision]`

Lead **temperature** is one of `cold` (pt-BR "Frio"), `warm` ("Morno"), `hot` ("Quente"), default
`cold`. API values are English; labels live in the SPA locale files.

BR-CRM04 — `[product decision]`

No uniqueness on `email` or `phone`: a family may share a number and a prospect may be entered
twice. De-duplication is a staff concern in this slice.

BR-CRM05

Deleting a contact is a **soft delete** (`discarded_at`); discarded contacts disappear from lists
and return `404`. There is no restore endpoint and no hard-purge job yet (retention is open).

BR-CRM06

Changes are recorded in the audit trail (`SchoolAuditable`). The trail is not exposed to the school
SPA in this slice.

BR-CRM07

Access requires the existing `manage_enrollment` staff permission (see [Permissions](#permissions)).
The SPA hides the menu item and shows a no-access state without it; the API enforces it regardless.

BR-CRM08

A contact is never created automatically from another domain, and nothing is notified by creating
or reclassifying one (no emails, no jobs — see rule `email-safety`).

---

## Use Cases

### UC-CRM01 — List and find contacts

`capability_id`: `students.capture_prospect`

Input

- optional `q` (case-insensitive substring of name, email or phone), optional `temperature`, `page`

Flow

1. Staff opens **CRM**; the SPA requests the first page (25 rows, ordered by name).
2. Staff types in the search box (debounced) and/or picks a classification; the list reloads from page 1.
3. Table shows Nome, Telefone, E-mail, Observações and Classificação; empty values render "—".
4. With no rows, an empty state replaces the table.

### UC-CRM02 — Create a contact

`capability_id`: `students.capture_prospect`

Input

- `name` (required), `phone`, `email`, `notes`, `temperature`

Flow

1. Staff clicks **Novo contato** (top right of the page header); a dialog opens.
2. Staff fills the form and saves; the API returns `201`.
3. On `422` the field errors from `error.details` are shown on the matching fields.
4. On success the dialog closes and the list reloads.

### UC-CRM03 — Edit or reclassify a contact

`capability_id`: `students.capture_prospect`

Flow

1. Staff opens edit from the row; the same dialog is pre-filled.
2. Saving sends `PATCH` with the changed fields (including `temperature`).

### UC-CRM04 — Delete a contact

`capability_id`: `students.capture_prospect`

Flow

1. Staff chooses delete on the row and confirms in a dialog.
2. The API soft-deletes (`204`); the row disappears from the list.

---

## API

Contract and examples: [`docs/api/v1/crm.md`](../api/v1/crm.md) (tag `CRM` in OpenAPI).

| Method | Path | Result |
|--------|------|--------|
| `GET` | `/api/v1/schools/:school_id/crm_contacts` | `200` — `data` + `meta {page, per_page, total}` |
| `GET` | `/api/v1/schools/:school_id/crm_contacts/:id` | `200` |
| `POST` | `/api/v1/schools/:school_id/crm_contacts` | `201` |
| `PATCH` | `/api/v1/schools/:school_id/crm_contacts/:id` | `200` |
| `DELETE` | `/api/v1/schools/:school_id/crm_contacts/:id` | `204` |

---

## Errors

| Status | Code / condition | Description |
|--------|------------------|-------------|
| 401 | `unauthorized` | Missing/invalid token |
| 403 | `forbidden` | Authenticated member of the school without `manage_enrollment` (teacher, guardian, other staff) |
| 404 | `not_found` | Unknown, discarded or cross-school contact; school the user does not belong to |
| 422 | `validation_error` | Missing `name`, invalid `email`, unknown `temperature` (body or query filter); `details` maps field → messages |

---

## Database

One entity group: `crm_contacts` (tenant table, soft delete, indexed on `[school_id, temperature]`).
Definition: [`docs/database/schema.dbml`](../database/schema.dbml). No narrative modeling file or DER
yet — add one in the modeling pass when the funnel PRD is written.

---

## Events

None. No domain events, notifications or jobs are emitted or consumed.

---

## Permissions

| Role | List/show | Create/update | Delete |
|------|-----------|---------------|--------|
| Owner / director / secretary (`manage_enrollment`) | yes | yes | yes |
| Other staff, teacher | no (`403`) | no | no |
| Guardian | no (`403`) | no | no |

Pundit `CrmContactPolicy` reuses `manage_enrollment` — no dedicated `manage_crm` key yet
(open item). Cross-school is `404`, wrong role `403`.

---

## Non-functional requirements

Cross-cutting catalog: [`docs/product/non-functional-requirements.md`](../product/non-functional-requirements.md).

- Per-school `school_id` scoping on every query; request and policy specs cover cross-school access.
- Pagination: 25 per page via the standard `data` + `meta` envelope.
- LGPD: phone, email and notes about prospects are personal data and notes may mention a child. The
  legal basis, retention window and read-access audit are **open** (see Open items). Do not use this
  list to message anyone — no outbound channel exists in this slice.
- UI follows the design system (`PageHeader`, `SectionCard`, `DataTable`, `EmptyState`,
  `SemanticChip`); strings in pt-BR and en-US locale files.

---

## Acceptance Criteria

AC-CRM01

- [x] Given a director, When they open the school SPA, Then the menu shows **CRM** and `/crm` lists the school's contacts below a header with a **Novo contato** button at the top right.
- Source: `[product decision]`

AC-CRM02

- [x] Given the list, Then each row shows name, phone, email, notes and a Frio/Morno/Quente chip.
- Source: `[product decision]`

AC-CRM03

- [x] Given a teacher or guardian, When they call any CRM endpoint, Then the API returns `403`; the SPA does not show the menu item and makes no API call on `/crm`.
- Source: `[invented]` (permission reuse — open item)

AC-CRM04

- [x] Given a contact of school A, When a member of school B requests it, Then the API returns `404`.
- Source: rule `multi-tenancy`

AC-CRM05

- [x] Given a create/update with blank `name`, invalid `email` or unknown `temperature`, Then the API returns `422` with field `details` and the dialog shows the errors on the fields.
- Source: `[invented]`

AC-CRM06

- [x] Given a delete, Then the contact is soft-deleted, an audit row is written, and it no longer appears in lists.
- Source: rules `auditing`, `models`

AC-CRM07

- [x] Given `q` and/or `temperature`, Then only matching contacts are returned, ordered by name, 25 per page.
- Source: `[invented]`

---

## Open items / pending decisions

- [ ] Funnel scope (stages beyond temperature, owner/assignee, interaction history, import/export,
      conversion to guardian/student/enrollment) — [`open-questions.md`](../open-questions.md) § CRM contacts.
- [ ] Dedicated permission key (`manage_crm`?) and whether coordination/teachers may see leads.
- [ ] Confirm the lead vocabulary ("Frio / Morno / Quente") and whether more levels are wanted.
- [ ] Duplicate handling (BR-CRM04).
- [ ] LGPD: legal basis for pre-enrollment contact, retention for cold leads, whether `notes` may
      mention a child, read-access audit — [`open-questions.md`](../open-questions.md) § LGPD / Privacy.
- [ ] Reconcile taxonomy PRD-target drift for `students.capture_prospect` / `students.manage_enrollment_campaign`
      (`records.md` in the YAML vs. non-existent `capture.md` in `capability-taxonomy.md` and `parity-matrix.csv`),
      and point `students-and-enrollments/index.md` and the product capability maps at this PRD.
- [ ] Modeling narrative (`docs/modeling/NNN-crm.md`) and DER, when the funnel is specified.
- [ ] Align with `students.capture_prospect` / `students.manage_enrollment_campaign` phase (P2) and
      fold this PRD into [`students-and-enrollments/records.md`](students-and-enrollments/records.md)
      or a `crm/` domain folder when the funnel is specified.

---

## Out of Scope

- Pipeline/funnel stages, tasks, reminders, interaction history, assignee.
- Enrollment campaigns and mass messaging (`students.manage_enrollment_campaign`; rule `email-safety`).
- Public lead-capture forms / online enrollment trail.
- Converting a contact into a guardian, student or enrollment.
- CSV import/export, restore of deleted contacts, hard purge.
- Backoffice and mobile surfaces.
