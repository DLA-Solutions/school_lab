# Data Model — Documents & Archive (008)

> PRD: [`docs/prds/documents-and-archive/`](../prds/documents-and-archive/)  
> Depends on: [`005-students-enrollments.md`](005-students-enrollments.md)  
> Executable schema: [`docs/database/schema.dbml`](../database/schema.dbml) · DER: `der_008.png` (TBD)

## Storage decision (Aug 2026)

**Production:** **S3-compatible object storage** via Active Storage (`:amazon` service) — not
local Kamal volume. Staging may use `:local` for dev economy. See
[`open-questions.md`](../open-questions.md) § Infrastructure.

Shared blob contract for: archive documents, message attachments, absence justifications,
enrollment contract PDFs.

Enrollment contract PDFs persist as `archive_documents`; the students-domain
`enrollment_contracts.document_id` foreign key references `archive_documents.id`. The archive row
must share the enrollment's `school_id` and `student_id`.

## Entity groups

### Archive (BC1)

| Table | Role |
|-------|------|
| `archive_documents` | Typed document — supersedes/enextends fintech `documents` semantics |
| `archive_document_types` | School-configurable taxonomy |
| `document_signatories` | Secretary/director blocks for generated docs |
| `archive_exports` | Audit package generation jobs |

Migration path: existing `documents` rows map to `archive_documents` with
`legacy_fintech_kyc: true` flag during W1.

## archive_documents

| Column | Notes |
|--------|-------|
| `school_id`, `student_id` | Required for student docs |
| `school_year_id` | Optional filter |
| `document_type_id` | FK |
| `visibility` | `staff_only` \| `guardian` |
| `review_status` | `pending` \| `approved` \| `rejected` — KYC subset |
| Active Storage | `has_one_attached :file` |

## Conselho audit list (MVP minimum)

Document types seeded per school template: enrollment form, guardian ID copy, medical authorization,
transfer certificate, report card PDF — configurable list in PRD
[`archive.md`](../prds/documents-and-archive/archive.md).

## fintech-first UC-07 deprecation

Staff upload + approve/reject flows **retained** as subset of archive with `review_status`.
Guardian read moves to family-scoped archive routes.

## LGPD

Access audit on guardian document views (P2 full audit; MVP log staff exports).
Retention policy hooks in [`retention.md`](../prds/documents-and-archive/retention.md) — default
retain until legal review.

## Out of scope (P2)

- Livro Ata generation, e-signatures, semantic search (pgvector).
