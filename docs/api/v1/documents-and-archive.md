# API v1 — Documents & Archive

> PRDs: [`docs/prds/documents-and-archive/`](../../prds/documents-and-archive/)  
> Modeling: [`docs/modeling/008-documents-archive.md`](../../modeling/008-documents-archive.md)  
> Baseline: [`fintech-first.md`](fintech-first.md) § Documents (superseded)  
> Platform contract: [`platform-and-admin.md`](platform-and-admin.md) — **frozen W1 (4C.1)**  
> Conventions: [`docs/api/README.md`](../README.md)

Digital archive — extends fintech-first KYC upload to typed archive, search, audit export.

---

## School year context

Archive search and audit export filter by school year per the frozen Platform contract
([`platform-and-admin.md`](platform-and-admin.md) § Cross-domain contract):

- `GET /archive/documents?school_year_id=:id` — filter documents linked to a year.
- `POST /archive/exports/audit_package` — accept `school_year_id` or `student_id` scope.
- Validate `school_year_id` belongs to route `school_id`; cross-tenant ids return `404`.

---

## Staff archive (W1)

Base: `/api/v1/schools/:school_id/archive`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/documents` | Search — `student_id`, `type`, `school_year_id`, `q` |
| `POST` | `/documents` | Upload — multipart + metadata |
| `GET` | `/documents/:id` | Metadata + signed download URL |
| `PATCH` | `/documents/:id` | Update visibility/type |
| `DELETE` | `/documents/:id` | Soft delete |
| `POST` | `/documents/:id/approve` | Review queue (KYC subset) |
| `POST` | `/documents/:id/reject` | With reason |

Storage: Active Storage → S3 in production ([`008-documents-archive.md`](../../modeling/008-documents-archive.md)).

---

## Guardian read (W1)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/me/students/:student_id/documents` | Family-scoped — `visibility: guardian` only |

Supersedes fintech-first `GET /me/documents`.

### Guardian "Meus documentos" (upload, shared by co-guardians)

PRD: [`archive.md`](../../prds/documents-and-archive/archive.md) UC-DA09, BR-ARC16–18.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/me/documents` | Documents of every linked child, shared across co-guardians; `?student_id=` optional |
| `POST` | `/me/documents` | Multipart upload: `student_id`, `document_type`, `file`, optional `title` |

`document_type` for guardians: `address_proof`, `vaccination_card`, `medical_report`,
`school_transfer`, `other`. Uploads bind to the child (not the parent) so father and mother see the
same documents; they start `pending` and stay visible while staff review. Errors: `404` child not
linked / other school, `422` invalid type, file, or non-enrolled child, `401`/`403` otherwise.

**Implemented contract (`web/`)**

- `POST` is `multipart/form-data` with flat fields `student_id`, `document_type`, `file`. `title`
  is accepted by the PRD but `documents` has no title column, so it is ignored.
- File: PDF, JPEG or PNG, detected from the bytes (not the filename), max 10 MB.
- `201` returns `{ data: Document }`; `GET /me/documents` returns `{ data: [Document], meta }` and
  `?student_id=` narrows to one linked child (a child outside the family is `404`). Each `Document`:
  `id, school_id, document_type, status, rejection_reason, reviewed_at, created_at, updated_at,
  documentable_type, documentable_id, filename, content_type, byte_size, file_url` plus
  `student_id`, `student_name`, `uploaded_by_name` (the parent's name; `null` for staff uploads)
  and `uploaded_by_kind` (`guardian` | `school`).
- `file_url` is a signed Active Storage redirect URL that downloads without a bearer token; there
  is no `GET /me/documents/:id`.
- Errors: `404 not_found`; `422 validation_error` (`details.document_type` or `details.file`),
  `422 student_inactive`, `422 unsupported_media_type`, `422 file_too_large`; `401` unauthenticated;
  `403` for a non-guardian membership.

---

## Guardian requests (implemented backfill)

The staff **Solicitações** queue and guardian **Meus pedidos** surface share
`guardian_requests`. The row records the ask and resolution; a future generated declaration is a
separate archive document.

| Method | Path | Actor | Description |
|--------|------|-------|-------------|
| `GET/POST` | `/requests` | staff with `manage_documents` | List/filter queue or create on behalf of guardian |
| `GET/DELETE` | `/requests/:id` | staff | Read or soft-discard |
| `POST` | `/requests/:id/start` | staff | `pending` → `in_progress` |
| `POST` | `/requests/:id/release` | staff | `in_progress` → `pending` |
| `POST` | `/requests/:id/fulfill` | staff | Open state → `fulfilled`; resolution note optional |
| `POST` | `/requests/:id/reject` | staff | Open state → `rejected`; non-blank resolution note required |
| `GET/POST` | `/me/requests` | guardian | List own requests or create in current guardian context |
| `GET` | `/me/requests/:id` | guardian | Own request and resolution |

Kinds are `declaration` and `second_call`; statuses are `pending`, `in_progress`, `fulfilled`, and
`rejected`. Guardian create ignores any body `guardian_id`, validates the student-family link, and
clears subject/reference date for a declaration. A supplied second-call `subject_id` is an optional
same-school foreign key. Unknown, other-school, and same-school-but-unlinked student identifiers
return indistinguishable `404 not_found`; cross-family request ids also return `404`. Non-sensitive
payload errors such as blank `details`, invalid `kind`, malformed field combinations, or rejection
without `resolution_note` return `422 validation_error`. `details` presence is enforced by the
shipped application but the existing DB column remains nullable pending a safe backfill/migration.
Guardian attempts to work the staff lifecycle return `403`.

---

## Audit export (W2)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/exports/audit_package` | Async ZIP for Conselho — `student_id` or `school_year_id` |
| `GET` | `/exports/:id` | Poll status + download URL |

---

## Signatories (W2)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/document_signatories` | List secretary/director blocks |
| `PUT` | `/document_signatories` | Replace school signatory set |

---

## Document types

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/document_types` | School taxonomy |
| `POST` | `/document_types` | Configure types |

Default seed: enrollment form, guardian ID, medical authorization, transfer certificate, report card.

---

## Migration from fintech-first

| Legacy route | Archive route |
|--------------|---------------|
| `POST /documents` | `POST /archive/documents` |
| `POST /documents/:id/approve` | `POST /archive/documents/:id/approve` |
| `GET /me/documents` | `GET /me/students/:id/documents` |

UC-07 in fintech-first PRD marked **deprecated** — behaviour preserved until W1 ships.

---

## OpenAPI tags

`Documents`, `Archive`, `Guardian Requests`, `Guardian Me`
