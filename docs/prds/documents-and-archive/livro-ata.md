# PRD — Documents & Archive: Livro Ata (BC4)

> Status: implemented (API + SPA, pending product-owner review)  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `documents.generate_official_minutes`, `documents.collect_minutes_signatures`  
> Related BCs: [`archive.md`](archive.md) *(signed PDF is filed here)*, [`../academic/incidents.md`](../academic/incidents.md) *(legacy "Atas de reuniões")*  
> Modeling: [`008-documents-archive.md`](../../modeling/008-documents-archive.md) § Livro Ata (BC4)  
> API narrative: [`documents-and-archive.md`](../../api/v1/documents-and-archive.md) § Livro Ata

---

## Objective

Give school leadership a **digital Livro Ata**: yearly **books** that hold typed **minutes** (atas),
each written in the product, rendered to PDF, and **signed digitally through Autentique** by the
people who took part — the legal basis being a valid digital signature, not a physical book
([`open-questions.md`](../../open-questions.md) § Contracts, signature, and Livro Ata).

---

## Context

- Menu item **"Atas da Escola"** replaces the staff menu item "Atas de reuniões" (BC7 incident-based
  "Ata", [`incidents.md`](../academic/incidents.md)). It is shown to staff holding the `director`,
  `coordination`, or `secretary` role template `[product decision]` (2026-10-21).
- Signature infrastructure already exists for enrollment contracts
  (`Gateways::Signature` adapter, Autentique webhook, reconcile job, signed-copy filing). Livro Ata
  **reuses** it; it does not add a second provider path.
- Source of the three minutes types and the book concept: stakeholder notes in
  [`main-menu-description.md`](../../main-menu-description.md) (Documentos → Atas).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Generate official minutes | `documents.generate_official_minutes` | [`vision.md`](../../vision.md) §6 — high priority phase 2 |
| Collect minutes signatures | `documents.collect_minutes_signatures` | Valid digital signature for Conselho audits ([`open-questions.md`](../../open-questions.md)) |

Everything not anchored above is `[product decision]` (stakeholder request, 2026-10-21).

---

## Actors and surfaces

| Actor | Surface | Notes |
|-------|---------|-------|
| Direção (`director`) | Web SPA | Creates books and minutes, sends for signature, signs as participant |
| Coordenação (`coordination`) | Web SPA | Same as Direção for books/minutes |
| Secretaria (`secretary`) | Web SPA | Same as Direção for books/minutes |
| Teacher, guardian | — | No access (guardians never see school minutes through this domain) |
| Participants (staff, guardians, students, others) | Autentique e-mail link | Sign outside the product; need not have an account |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | — |
| `fundamental_medio` | yes | Conselho de Classe / resultados finais are most relevant here |
| `multi_unidade` | partial | Books are per school |

---

## Business Rules

BR-LA01 *(book)*

A **minutes book** (`livro ata`) belongs to one school and has a `name` and a `year`. Name is unique
per school and year. A book has no workflow of its own in this slice; it only groups minutes.

BR-LA02 *(types)*

A minutes entry has exactly one `kind`: `meeting` ("Ata de reunião"), `class_council` ("Ata de
Conselho de Classe"), or `final_results` ("Ata de resultados finais"). The kind is fixed at
creation. `class_council` may reference a `school_class`; the other kinds do not.

BR-LA03 *(content)*

A minutes entry has a `title`, `held_on` date, and a `body` of sanitized rich text (HTML subset:
headings, paragraphs, lists, bold/italic). No attachments in this slice.

BR-LA04 *(participants)*

Participants are the people involved in the ata. Each is a **snapshot** (`name`, optional `email`,
`cpf`, `role_label`) so the record survives later changes to the person, optionally linked to a live
`membership`, `guardian`, or `student` (nullable, same non-live rule as BR-IN11). Participants flagged
`signs` become Autentique signers and **must** carry `email` and `cpf` (same constraint as contract
guardians). Students are never signers.

BR-LA05 *(lifecycle)*

Status is an AASM machine: `draft → pending_signature → signed`, plus `cancelled` from `draft` or
`pending_signature`. Only `draft` entries can be edited. Sending requires at least one signing
participant. A signed entry is immutable.

BR-LA06 *(PDF and signature)*

On send, the service renders the entry to PDF (school header, book name/year, kind, title, date,
body, participant list) and creates the document in Autentique through `Gateways::Signature`. The
entry is marked `pending_signature` only after the provider accepts it (same rule as contracts).
Webhook/reconcile mark it `signed` and store the signed PDF on the entry itself (`has_one_attached :pdf`; the student-bound archive is not used).

BR-LA07 *(search)*

The list is searchable by **year** (the book's year) and by **participant name** (case/accent
insensitive substring) — plus filters by `kind`, `status`, and `minutes_book_id`.

BR-LA08 *(legacy atas)*

BC7 incident atas keep their own approval workflow and are **not migrated** into minutes
entries `[product decision]`. Their screen remains reachable from inside Atas da Escola (secondary
link "Notas de ocorrência") so nothing the old menu item exposed is lost. Whether they become
`meeting` minutes is tracked in [`open-questions.md`](../../open-questions.md).

BR-LA09 *(LGPD)*

Minutes can contain children's and families' data. Access is limited to the three role templates
above, school-scoped (cross-school → `404`), audited (`SchoolAuditable`), with participant
`cpf` redacted from audit logs and API lists (shown masked in detail). Retention follows
[`retention.md`](retention.md) (default retain).

---

## Use Cases

### UC-LA01 — Create a minutes book

Input: `name`, `year`. Creates the book; `409`/`422` on a duplicate name+year.

### UC-LA02 — Create a minutes entry

Input: `minutes_book_id`, `kind`, `title`, `held_on`, `body`, optional `school_class_id`,
`participants[]`. Creates in `draft`.

### UC-LA03 — Edit a draft

Updates fields and replaces participants. `409 invalid_state_transition` unless `draft`.

### UC-LA04 — Send for signature

Validates signers, renders PDF, calls Autentique, moves to `pending_signature`, stores
`provider_document_id`. Provider failures map as in contracts (`422`/`502`).

### UC-LA05 — Signature received

Autentique webhook / reconcile job marks the entry `signed` and stores the signed PDF on the entry.

### UC-LA06 — Cancel

Cancels a `draft`/`pending_signature` entry (cancels the provider document when one exists).

### UC-LA07 — List and search

Paginated list with `q` (participant name), `year`, `kind`, `status`, `minutes_book_id`.

---

## API

Tenant routes under `/api/v1/schools/:school_id` (narrative in
[`documents-and-archive.md`](../../api/v1/documents-and-archive.md) § Livro Ata):

| Method | Path | Use case |
|--------|------|----------|
| `GET` / `POST` | `/minutes_books` | UC-LA01 |
| `GET` / `POST` | `/minutes_entries` | UC-LA07 / UC-LA02 |
| `GET` / `PATCH` | `/minutes_entries/:id` | show / UC-LA03 |
| `GET` | `/minutes_entries/:id/pdf` | Preview / signed copy |
| `POST` | `/minutes_entries/:id/send_for_signature` | UC-LA04 |
| `POST` | `/minutes_entries/:id/cancel` | UC-LA06 |

---

## Errors

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `unauthorized` | No token |
| 403 | `forbidden` | Role template not director/coordination/secretary |
| 404 | `not_found` | Cross-school id |
| 409 | `invalid_state_transition` | Edit/send/cancel from a state that disallows it |
| 422 | `validation_error` | Missing signer e-mail/CPF, no signers, duplicate book |
| 502 | `provider_error` | Autentique unavailable (minutes endpoints only) |

---

## Database

Entity groups: `minutes_books`, `minutes_entries`, `minutes_participants` — see
[`008-documents-archive.md`](../../modeling/008-documents-archive.md) § Livro Ata and
`docs/database/schema.dbml`.

---

## Events

`MinutesEntrySigned` — emitted when the last signer signs; no guardian notification in this slice.

---

## Permissions

| Action | director | coordination | secretary | teacher / guardian |
|--------|----------|--------------|-----------|--------------------|
| List / view | yes | yes | yes | no |
| Create book / entry, edit draft | yes | yes | yes | no |
| Send / cancel | yes | yes | yes | no |

Roles come from `Current.membership.role_template.system_key`, not params.

---

## Acceptance Criteria

- [ ] Given a `director`, `coordination`, or `secretary` membership, the staff menu shows "Atas da Escola" and no longer shows "Atas de reuniões"; teachers and guardians do not see "Atas da Escola". Other staff (teachers included) keep a relabelled "Notas de ocorrência" entry for the BC7 page, so they do not lose access to it `[product decision]`.
- [ ] Creating a book with a name and a year lists it; the same name+year again returns `422`.
- [ ] "Nova ata" (top-right of the list) opens a chooser with "Ata de reunião", "Ata de Conselho de Classe", "Ata de resultados finais".
- [ ] Searching by year or by a participant's name narrows the list; other schools' atas never appear.
- [ ] Sending a draft with a signer lacking e-mail or CPF fails with `422` naming the person and sends nothing.
- [ ] Sending a valid draft moves it to `pending_signature` and creates the Autentique document; a signed webhook moves it to `signed` and a signed PDF is retrievable.
- [ ] A signed or pending entry cannot be edited (`409`).
- [ ] The legacy incident atas screen stays reachable inside Atas da Escola ("Notas de ocorrência").

---

## Out of Scope

- Migrating BC7 incident atas into minutes entries; "Ata de registro administrativo dos colaboradores"; enrollment-type minutes.
- Sequential signing order, Conselho signatory presets, semantic search, physical-print layout, historical digitization.
- Guardian-facing access to school minutes.
