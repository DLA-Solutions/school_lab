# PRD — Documents & Archive: Digital Archive (BC1)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `documents.store_student_document`, `documents.search_archive`, `documents.view_student_documents`, `documents.export_audit_package`, `documents.configure_document_signatories`  
> Related BCs: [`retention.md`](retention.md) *(P2 policy)*, [`students-and-enrollments/enrollments.md`](../students-and-enrollments/enrollments.md), [`academic/attendance.md`](../academic/attendance.md), [`academic/incidents.md`](../academic/incidents.md)  
> Supersedes: [`fintech-first.md`](../fintech-first.md) UC-07  
> Modeling: *(pending — `docs/modeling/008-documents-archive.md`)*  
> API narrative: *(pending — `docs/api/v1/documents-archive.md`)*

---

## Objective

Define the **MVP digital archive**: store, classify, search, and share student/school documents;
guardian read under family isolation; staff audit export; signatory metadata for future official
document generation — as the **shared durable file layer** for enrollment PDFs and academic
attachments.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Store document | `documents.store_student_document` | Proesc matrícula document types, Agenda Edu/ClassApp enrollment attachments — [`parity-matrix.md`](../../product/parity-matrix.md#documents--archive) |
| Search archive | `documents.search_archive` | Proesc (4 aliases), ClassApp (1) — metadata/filter search; semantic deferred P2 |
| View student documents | `documents.view_student_documents` | `[product decision]` — guardian family scope per vision §6 |
| Export audit package | `documents.export_audit_package` | `[product decision]` — Conselho readiness per [`vision.md`](../../vision.md) §3 |
| Configure signatories | `documents.configure_document_signatories` | [`documents-and-archive.create_adicionar_os_dados_de_secretar`](../../ref/catalogo-funcionalidades.md) — Proesc secretary/director on generated documents |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Consent and health documents; same upload/view rules |
| `fundamental_medio` | yes | Primary audit document volume |
| `pj_financeiro` | partial | Contracts may reference PJ; archive stores artifact only |
| `multi_unidade` | partial | Export scoped per `school_id` |

---

## Context

**Vision:** replace physical archive rooms with an audit-ready repository
([`vision.md`](../../vision.md) §2–§3). MVP does **not** generate Livro Ata or collect digital
signatures — those are P2 ([`index.md`](index.md) §6).

**Fintech-first baseline:** UC-07 supports multipart upload to `School`, `Guardian`, or `Student`
with `pending → approved | rejected` review and guardian read of linked children. Archive BC1
**extends** this with document types, school-year scope, search, audit export, versioning, and
cross-domain references.

**Cross-domain storage contract**

| Consumer | Use | Archive responsibility |
|----------|-----|------------------------|
| Students UC-E03 | Enrollment contract PDF | Store rendered PDF; return `archive_document_id` for `enrollment_contracts.document_id` |
| Academic UC-AT03 | Absence justification attachment | Accept `document_id` on existing entry or inline upload |
| Academic incidents | Incident file attachments | Same pattern as justifications |
| Billing P2 NFS-e | Tax PDF | Optional linked entry; **issuance not here** |
| Fintech-first legacy | KYC uploads | Migrate to `archive_entries` |

Communication message attachments remain in **comms media** storage with separate retention
([`communication/media.md`](../communication/media.md)) — not duplicated into student archive
unless staff explicitly "save to archive" `[product decision]`.

---

## Business Rules

BR-ARC01

An **archive entry** belongs to exactly one `school_id` and references one stored blob (Active
Storage or S3-compatible object). Entries are never shared across schools.

BR-ARC02

**Subject binding:** each entry has `subject_type` in `student | school | guardian | enrollment`
and `subject_id`. Student-scoped docs require valid `student_id` at same school. School-scoped
docs have no student (e.g., institutional policies).

BR-ARC03

**Document types** are school-configurable from a **system seed list** (e.g., `enrollment_form`,
`identity_document`, `medical_consent`, `contract`, `justification_attachment`, `incident_attachment`,
`other`). Type drives default `visibility` and audit manifest grouping.

BR-ARC04

**Visibility:** `staff_only | guardian | guardian_after_review`. Default per type from seed;
staff may override on upload. Guardian routes exclude `staff_only`.

BR-ARC05

**Review workflow** (when `guardian_after_review`): status `pending | approved | rejected`;
guardian sees entry only when `approved`. Rejection stores `rejection_reason` (audited). Supersedes
fintech-first approve/reject for guardian-visible uploads.

BR-ARC06

**Versioning:** editing document **content** creates a new entry with `supersedes_id` pointing
to prior entry; prior entry marked `status: superseded`. Metadata-only edits (title, tags) may
update in place with audit (NFR-005).

BR-ARC07

**Upload constraints:** max file size and MIME allowlist enforced centrally (e.g., PDF, JPEG, PNG,
DOCX — exact list in implementation). Rejected uploads return `422` with code `unsupported_media_type`
or `file_too_large`.

BR-ARC08

**School year tagging:** optional `school_year_id` on student documents for audit export filters.
When unset, entry still valid; export may include "untagged" bucket.

BR-ARC09

**Cross-domain references:** academic and students domains store `archive_entry_id` only — they
do not receive raw storage URLs. Download uses short-lived signed URLs from archive API.

BR-ARC10

**Search (MVP):** filter by `student_id`, `document_type`, `school_year_id`, title/text query
(simple `ILIKE` on title + filename + optional tags), date range, `review_status`, `source`
(`manual | enrollment | academic | legacy_kyc`). No full-text inside PDF bytes in MVP.

BR-ARC11

**Guardian access (NFR-002):** guardian may list/download entries where (a) subject is linked
student in `student_guardians`, (b) visibility permits guardian, (c) review approved if required.
Wrong-family student id returns **404**.

BR-ARC12

**Audit export:** staff with `export_audit_package` requests scope (student, class, school year,
document types, date range). System enqueues async job producing ZIP + `manifest.json` (entry ids,
hashes, types, student identifiers, export timestamp). One active export job per scope+user
(idempotent retry).

BR-ARC13

**Signatory configuration:** school may configure at most one active **secretary** and one
**director** signatory block (`name`, `title`, `registration_number`, optional image ref) for
injection into P2 generated documents. MVP stores metadata only — no PDF generation.

BR-ARC14

**Soft delete:** entries use Discard; discarded entries hidden from search and guardian view;
retained for audit until retention job (P2) or legal hold.

BR-ARC15

**Sensitive types:** `health`, `incident`, `identity_document` flagged `sensitive: true` — stricter
permission `view_sensitive_archive` for staff beyond default `view_archive`.

BR-ARC16

**Guardian self-service upload ("Meus documentos")** `[product decision]`: a guardian may upload
personal documents for a linked child (the family's proof of address, the child's vaccination card,
medical reports, a transfer record from another school). The document is bound to the **child**
(`subject_type: student`), never to the individual parent, so it is **shared by every kept guardian
linked to that child** (father, mother, others). A guardian sees documents uploaded by any co-guardian
of the same child and by staff; a guardian never sees documents of a child they are not linked to
(404, BR-ARC11). A family document needed for two children is uploaded once per child.

BR-ARC17

**Guardian upload types** (closed list, chosen by the guardian in a select at upload time; sent as
`document_type`, in this order): `address_proof` ("Comprovante de endereço"), `school_transcript`
("Histórico escolar" — the child's school history), `guardian_identity` ("RG e CPF dos responsáveis" —
one scan or photo of the guardians' RG and CPF, a single PDF may hold both), `vaccination_card`
("Cartão de vacina"), `medical_report` ("Laudos"), `school_transfer` ("Transferência de outra
escola" — distinct from `school_transcript`), `other` ("Outros"). Any other value from a guardian
returns `422`. Staff uploads keep the wider seed list (BR-ARC03). `vaccination_card` and
`medical_report` are health data and `guardian_identity` is identity data
(`identity_document`): all three are `sensitive: true` (BR-ARC15) and LGPD-flagged in
[`open-questions.md`](../../open-questions.md). `school_transcript` is not sensitive. Like every
other family document, `guardian_identity` is bound to the child and shared by all kept co-guardians
(BR-ARC16) — no per-parent privacy split `[product decision]`. Same file rules for all types
(BR-ARC07: PDF/JPEG/PNG sniffed from the bytes, ≤ 10 MB).

BR-ARC18

**Guardian-uploaded documents start `pending`** and stay visible to the child's guardians and to
staff with `manage_archive`/`manage_documents` while staff review them (approve/reject, UC-DA02).
A rejected document disappears from the guardian list and shows the rejection reason to staff only.
Only students enrolled (`Student#enrolled?`) accept new guardian uploads; a guardian whose
children are all non-enrolled has no portal access anyway.

BR-ARC19

**Staff view of a family's documents from the guardian row** `[product decision]`: there is no
separate menu item for family documents. The "documents" action on the school's guardians list shows,
for that guardian, the union of (a) documents attached to the guardian and (b) documents attached to
any kept student linked to that guardian through a kept `student_guardians` row, same school only.
Each row identifies the child and the sender (`student_id`, `student_name`, `uploaded_by_name`,
`uploaded_by_kind`). Staff with `manage_documents` approve, reject or discard those rows through the
usual document actions (UC-DA02). Authorization is unchanged; a guardian id from another school
matches nothing.

---

## Use Cases

### UC-DA01 — Upload student document (staff)

Input: `student_id`, file, `document_type`, optional `title`, `school_year_id`, `visibility`.

Flow

1. Validate `manage_archive` and student at school (BR-ARC01, BR-ARC02).
2. Validate file constraints (BR-ARC07).
3. Store blob; create `archive_entries` row with `review_status: pending` if
   `visibility: guardian_after_review`, else `approved` (BR-ARC05).
4. Emit `DocumentStored` event.
5. Return entry with download URL token.

### UC-DA02 — Review guardian-visible document (staff)

Input: `archive_entry_id`, `decision: approve | reject`, optional `rejection_reason`.

Flow

1. Validate entry in `pending` review state (BR-ARC05).
2. Transition status; audit decision.
3. On approve, emit `DocumentApproved` (optional guardian notification via comms `[product decision]`).
4. On reject, guardian does not see entry.

### UC-DA03 — Search archive (staff)

Input: filters per BR-ARC10, pagination.

Flow

1. Validate `view_archive` (and `view_sensitive_archive` when filtering sensitive types).
2. Apply scoped query; return summary list (no signed URLs in list — fetch via UC-DA05).

### UC-DA04 — View documents as guardian

Input: optional `student_id` (active child context).

Flow

1. Resolve guardian profile and linked students (NFR-002).
2. List entries passing BR-ARC11 for requested or all linked children.
3. Download via signed URL endpoint with same checks.

### UC-DA05 — Download archive entry (staff or guardian)

Input: `archive_entry_id`.

Flow

1. Authorize per BR-ARC11 or staff `view_archive`.
2. Issue short-lived signed URL to blob (BR-ARC09).

### UC-DA06 — Export audit package (staff)

Input: scope filters (students, class, school year, types, dates).

Flow

1. Validate `export_audit_package` (BR-ARC12).
2. Enqueue `AuditExportJob` with idempotency key.
3. Job collects entries, builds ZIP + manifest with SHA-256 hashes.
4. Notify staff when ready; download token expires per `[product decision]` (e.g., 7 days).

### UC-DA07 — Configure document signatories (staff)

Input: secretary and/or director fields (BR-ARC13).

Flow

1. Validate `configure_signatories`.
2. Upsert `document_signatories` for school.
3. Return config for display in settings UI (used by P2 certificate/minutes generators).

### UC-DA08 — Store blob on behalf of another domain (internal)

Input: `school_id`, `subject`, file bytes, `source`, `document_type`.

Flow

1. Called by students/academic services only (service-to-service or shared service object).
2. Same BR-ARC07 constraints.
3. Return `archive_entry_id` without review when `source: enrollment` or `academic` and caller
   specifies staff-initiated `[product decision]`.

### UC-DA09 — Upload family document as guardian ("Meus documentos")

Input: `student_id`, `document_type` (BR-ARC17), `file`, optional `title`.

Flow

1. Resolve guardian profile; require a kept `student_guardians` link to an enrolled `student_id`
   (BR-ARC16, BR-ARC18). Unlinked or other-school student → `404`.
2. Validate `document_type` against the guardian list and the file against BR-ARC07.
3. Store blob; create the entry with `uploaded_by` = guardian's user, bound to the student,
   `review_status: pending` (BR-ARC18).
4. Emit `DocumentStored`; staff see it in the archive/review queue and, per BR-ARC19, from the
   guardian row of any linked guardian; every co-guardian sees it in their own "Meus documentos".

---

## API

Base path: `/api/v1/schools/:school_id/archive/...`

### POST /api/v1/schools/:school_id/archive/entries

Multipart upload (UC-DA01).

Request (multipart fields)

- `student_id` (optional if school-scoped)
- `document_type`
- `file`
- `title`, `school_year_id`, `visibility` (optional)

Response `201`

```json
{
  "id": "uuid",
  "document_type": "enrollment_form",
  "review_status": "pending",
  "visibility": "guardian_after_review",
  "version": 1,
  "content_hash": "sha256:..."
}
```

### GET /api/v1/schools/:school_id/archive/entries

Search (UC-DA03) — query params per BR-ARC10.

### GET /api/v1/schools/:school_id/archive/entries/:id

Entry metadata + signed download URL (UC-DA05).

### POST /api/v1/schools/:school_id/archive/entries/:id/review

Body: `{ "decision": "approve" | "reject", "rejection_reason": "..." }` (UC-DA02).

### POST /api/v1/schools/:school_id/archive/audit_exports

Body: scope filters (UC-DA06). Response `202` with `job_id`.

### GET /api/v1/schools/:school_id/archive/audit_exports/:id

Export job status and download URL when complete.

### PUT /api/v1/schools/:school_id/archive/signatories

Signatory config (UC-DA07).

### GET /api/v1/schools/:school_id/me/documents

Guardian list (UC-DA04) — supersedes fintech-first `me/documents`.

Query: `student_id` optional.

### POST /api/v1/schools/:school_id/me/documents

Guardian multipart upload (UC-DA09). Fields: `student_id`, `document_type` (one of
`address_proof | school_transcript | guardian_identity | vaccination_card | medical_report |
school_transfer | other`), `file`, optional
`title`. Response `201` with the entry. `404` for a child outside the guardian's family; `422` for an
unsupported type, file constraints, or a non-enrolled child.

### Fintech-first compatibility (migration)

During transition, `POST /documents` may alias to archive upload with `legacy_source: fintech_kyc`
mapping. Deprecation header on old routes `[product decision]`.

---

## Errors

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `not_found` | Entry or student outside guardian family / school scope |
| 403 | `forbidden` | Missing permission or sensitive doc without `view_sensitive_archive` |
| 422 | `unsupported_media_type` | MIME not in allowlist (BR-ARC07) |
| 422 | `file_too_large` | Exceeds max size |
| 409 | `invalid_review_state` | Review on non-pending entry |
| 409 | `export_in_progress` | Duplicate audit export job for same scope |

---

## Database

Entity groups — full definitions in modeling doc when available.

| Entity | Purpose |
|--------|---------|
| `archive_entries` | Metadata, subject binding, type, visibility, review, version chain |
| `archive_blobs` / Active Storage | Byte storage with content hash |
| `document_types` | School overrides + system seeds |
| `document_signatories` | Secretary/director letterhead (BR-ARC13) |
| `audit_exports` | Export job status, manifest ref, expiry |
| `archive_entry_tags` | Optional faceted tags for search |

**Migration from fintech-first:** existing `documents` table → `archive_entries` with
`legacy_source: fintech_kyc`; preserve approve/reject columns.

| Artifact | Location |
|----------|----------|
| Narrative model | [`docs/modeling/008-documents-archive.md`](../../modeling/008-documents-archive.md) *(aligned)* |
| DBML | `docs/database/database_dml.md` |
| DER | `docs/database/der_008.png` *(unavailable — no repository-local renderer; not fabricated)* |

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `DocumentStored` | UC-DA01, UC-DA08 | Audit log; optional comms notify guardian `[product decision]` |
| `DocumentApproved` | UC-DA02 | Guardian notification (comms adapter) |
| `DocumentSuperseded` | New version upload | Audit |
| `AuditExportCompleted` | UC-DA06 job success | Staff notification |
| `EnrollmentContractBound` | students UC-E03 | Creates archive entry via UC-DA08 |

Academic **`AbsenceRecorded`** does not consume archive events — justification attachment is
optional input to attendance flow only.

---

## Permissions

| Action | Permission key | Typical roles |
|--------|----------------|---------------|
| Upload / supersede | `manage_archive` | secretary, director |
| Search / download (non-sensitive) | `view_archive` | secretary, coordinator, director |
| Sensitive types | `view_sensitive_archive` | secretary, director |
| Review guardian-visible | `manage_archive` | secretary |
| Export audit package | `export_audit_package` | director, secretary |
| Configure signatories | `configure_signatories` | secretary, director |
| Guardian read | *(implicit via family link)* | guardian |

Teacher upload: optional `upload_student_document` grant on teacher template `[product decision]`
— default off; coordinator uploads on behalf.

Pundit: scope all queries by `school_id`; guardian policies join `student_guardians`.

---

## Non-functional requirements

Cross-cutting: [`non-functional-requirements.md`](../../product/non-functional-requirements.md).

- **NFR-002:** Family isolation on guardian routes (BR-ARC11); sensitive type flag (BR-ARC15).
- **NFR-003:** Tenant scoping on entries, exports, signatories.
- **NFR-005:** Audit on upload, review, visibility change, supersede, export request.
- **NFR-001:** Audit export job idempotent; hash verification in manifest.

**Storage:** production backend decided — Cloudflare R2 (S3-compatible) via Active Storage
([`open-questions.md`](../../open-questions.md) § Infrastructure, [`storage.md`](../../guidelines/web/storage.md)).
MVP development may use local disk; PRD assumes object storage for production.

---

## Acceptance Criteria

AC-DA01

- [ ] Given staff with `manage_archive`, When they upload a PDF for a enrolled student with type `enrollment_form`, Then an archive entry is created with blob hash and school scope
- Source: [`documents.store_student_document`](../../product/capability-map.md#documents--archive)

AC-DA02

- [ ] Given an entry with `visibility: guardian_after_review` and status `pending`, When guardian requests `/me/documents`, Then the entry is not listed
- Source: `[product decision]` — BR-ARC05

AC-DA03

- [ ] Given staff approves a pending entry, When guardian requests `/me/documents` for linked student, Then entry appears with download URL
- Source: fintech-first UC-07 supersede

AC-DA04

- [ ] Given guardian A linked to student S, When guardian B requests entry for student S, Then API returns 404
- Source: NFR-002

AC-DA05

- [ ] Given staff searches with student name fragment and school year, When results return, Then only matching school's entries appear ordered by uploaded_at desc
- Source: [`documents.search_archive`](../../product/capability-map.md#documents--archive)

AC-DA06

- [ ] Given staff requests audit export for class C and year Y, When job completes, Then ZIP contains manifest.json with entry ids, filenames, sha256, student identifiers, and document types
- Source: [`documents.export_audit_package`](../../product/capability-map.md#documents--archive)

AC-DA07

- [ ] Given school configures secretary and director signatories, When settings are saved, Then subsequent GET returns both blocks for letterhead use
- Source: Proesc [`documents-and-archive.create_adicionar_os_dados_de_secretar`](../../ref/catalogo-funcionalidades.md)

AC-DA08

- [ ] Given students service stores enrollment contract PDF via internal store, When contract bind completes, Then `enrollment_contracts.document_id` references the new `archive_documents` row
- Source: [`students-and-enrollments/enrollments.md`](../students-and-enrollments/enrollments.md) UC-E03

AC-DA09

- [ ] Given teacher submits absence justification with attachment, When justification saves, Then `document_id` references valid archive entry with `source: academic`
- Source: [`academic/attendance.md`](../academic/attendance.md) — attachment handoff

AC-DA10

- [ ] Given staff uploads new version of document, When upload completes, Then prior entry is `superseded` and new entry has `supersedes_id` set
- Source: BR-ARC06 `[product decision]`

AC-DA11

- [ ] Given guardian A (mother) linked to student S, When she uploads a PDF of type `address_proof`, Then the entry is bound to S with status `pending`, and guardian B (father) linked to S lists and downloads it in `GET /me/documents`
- Source: `[product decision]` — BR-ARC16

AC-DA12

- [ ] Given a guardian not linked to student S, When they upload a document for S or request one of S's documents, Then the API returns 404 and nothing is stored
- Source: NFR-002

AC-DA13

- [ ] Given a guardian upload with `document_type` outside the five guardian types, When submitted, Then `422` and nothing is stored; each of the five types is accepted
- Source: `[product decision]` — BR-ARC17

AC-DA14

- [ ] Given a guardian opens "Meus documentos" in the school SPA, When they pick a child, a type from the select and a file, Then the document appears in the list for both parents with its type, date and who sent it
- Source: `[product decision]` — BR-ARC16

---

## Open items / pending decisions

- [ ] Max file size and MIME allowlist values
- [ ] Teacher direct upload permission default
- [ ] Guardian notification on document approval
- [ ] Audit export download token TTL
- [ ] "Save comms attachment to archive" staff action — MVP or defer
- [ ] Exact Conselho manifest schema — legal review
- [ ] Fintech-first route deprecation timeline
- [ ] Guardian "Meus documentos": may a guardian delete their own upload? (MVP: no — staff only)
- [ ] Guardian "Meus documentos": one upload covering several siblings (MVP: once per child)
- [ ] LGPD: retention and access audit for guardian-uploaded health documents (`vaccination_card`, `medical_report`)

---

## Out of Scope

- Livro Ata, transcripts, declarations, e-signatures — P2 ([`index.md`](index.md))
- Retention policy UI — [`retention.md`](retention.md)
- Semantic / vector search — P2 `documents.search_archive_semantic`
- NFS-e PDF issuance — [`billing/invoices.md`](../billing/invoices.md)
- Communication media storage and retention — [`communication/media.md`](../communication/media.md)
- In-PDF OCR or full-text extraction — post-MVP
