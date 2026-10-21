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

Storage: Active Storage → Cloudflare R2 (private bucket) in production ([`008-documents-archive.md`](../../modeling/008-documents-archive.md)).

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

`document_type` for guardians, in display order: `address_proof`, `school_transcript` ("Histórico
escolar"), `guardian_identity` ("RG e CPF dos responsáveis"; identity data, shared by both parents
like every family document), `vaccination_card`, `medical_report`, `school_transfer`, `other`. Any
other value is `422`. Uploads bind to the child (not the parent) so father and mother see the
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
  and `uploaded_by_kind` (`guardian` | `school`; `null` when the system filed the document, see
  below).
- `file_url` is a signed Active Storage redirect URL under `/api/active_storage/blobs/redirect/...`
  that downloads without a bearer token; it expires 15 minutes after the response that carried it
  (re-list to get a fresh one) and redirects to a bucket URL valid for 5 minutes. There is no
  `GET /me/documents/:id`.
- Errors: `404 not_found`; `422 validation_error` (`details.document_type` or `details.file`),
  `422 student_inactive`, `422 unsupported_media_type`, `422 file_too_large`; `401` unauthenticated;
  `403` for a non-guardian membership.

**System-generated rows: `signed_contract`**

When a contract is signed through the e-signature provider (Autentique) and its signed file is
retrievable, the API files that PDF as a document of the contract's student, asynchronously (it can
lag the signature by a few minutes). It appears in `GET /me/documents` for every guardian linked to
the child, with this shape:

| Field | Value |
|-------|-------|
| `document_type` | `signed_contract` (system-only; never accepted by `POST /me/documents`, which answers `422`) |
| `status` | `approved` (no review step; never `pending` or `rejected`) |
| `documentable_type` / `student_id` / `student_name` | `Student` / the contract's student |
| `uploaded_by_kind`, `uploaded_by_name` | `null` and `null` — render a "system" sender |
| `content_type`, `filename` | `application/pdf`, `contrato-assinado-<student-name>.pdf` |
| `file_url` | same signed redirect URL as any other document |

One document per contract: provider replays or re-runs never duplicate it. Staff see the same row in
`GET /documents` (including the `guardian_id` filter below) and can discard it with
`DELETE /documents/:id`; a discarded copy is not re-filed. `approve`/`reject` answer `409` because
the row is already `approved`. Backfill for contracts signed earlier: `bin/rails
signature:backfill_signed_documents[school_id]` (idempotent; `school_id` optional).

---

### Staff list by guardian ("Meus documentos" seen from the guardians list)

PRD: [`archive.md`](../../prds/documents-and-archive/archive.md) BR-ARC19.

`GET /api/v1/schools/:school_id/documents` (staff with `manage_documents`; `403` for guardians,
`401` unauthenticated) is paginated (`{ data, meta: { page, per_page, total } }`, newest first) and
accepts two mutually exclusive filters:

- `documentable_type` + `documentable_id` (both required, otherwise ignored; unknown type returns an
  empty list) — unchanged.
- `guardian_id` — returns the union of documents whose documentable is that guardian and documents
  whose documentable is a kept student linked to that guardian by a kept `student_guardians` row,
  same school only, excluding discarded documents. An unknown guardian id, or one from another
  school, returns `200` with an empty `data` (no existence leak).

Sending `guardian_id` together with `documentable_type` or `documentable_id` returns
`422 validation_error` with `details.guardian_id`. Rows for a `guardian_id` query use the same shape
as the guardian "Meus documentos" rows (the base `Document` fields plus `student_id`, `student_name`,
`uploaded_by_name`, `uploaded_by_kind`); the extra fields are `null` for documents attached to the
guardian itself. Responses to the other queries are unchanged and do not carry the extra fields.
Staff approve, reject or delete these rows through the existing `POST /documents/:id/approve`,
`POST /documents/:id/reject` and `DELETE /documents/:id`.

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

## Compliance

Staff with `manage_documents` only; school-level files only (BC5). PRD:
[`compliance.md`](../../prds/documents-and-archive/compliance.md). Files are `documents` rows with
`documentable_type = "School"`, `documentable_id = :school_id`, `status = approved`. Requires the
`documents` module enabled for the school (`403 module_disabled` otherwise).

Base: `/api/v1/schools/:school_id/compliance_documents`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/compliance_documents` | List kept files, newest first (`document_type`, `page`); catalog in `meta.types` |
| `POST` | `/compliance_documents` | Multipart: `document_type`, `file`, optional `title` (accepted, not stored) |
| `GET` | `/compliance_documents/:id` | Metadata with file URL |
| `DELETE` | `/compliance_documents/:id` | Discard (`204`); sets `discarded_at` and `discarded_by_id` |

There is no separate `types` endpoint: the closed catalog travels in the list `meta`, so the SPA can
render a type with no file yet in the same request.

`document_type` ∈ `sanitary_inspection`, `fire_department_certificate`,
`municipal_education_council_resolution`, `state_education_council_resolution`, `pest_control`,
`water_tank_cleaning`, `first_aid_certificate` (labels from `documents.compliance_types.<key>`,
`Accept-Language` aware: pt-BR default, `en`).

### `GET /compliance_documents`

Pagy params `page`/`per_page`. The `document_type` filter does not narrow `meta.types`; an unknown
value returns an empty list.

```json
{
  "data": [
    {
      "id": 41,
      "document_type": "pest_control",
      "document_type_label": "Dedetização",
      "status": "approved",
      "uploaded_by_id": 7,
      "filename": "dedetizacao-2026.pdf",
      "content_type": "application/pdf",
      "byte_size": 183204,
      "file_url": "/rails/active_storage/blobs/redirect/<signed_id>/dedetizacao-2026.pdf",
      "created_at": "2026-10-21T19:07:58.908-03:00",
      "updated_at": "2026-10-21T19:07:59.355-03:00"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 25,
    "total": 1,
    "types": [
      { "key": "sanitary_inspection", "label": "Vigilância sanitária" },
      { "key": "fire_department_certificate", "label": "Certificado dos bombeiros" },
      { "key": "municipal_education_council_resolution", "label": "Resolução do Conselho Municipal de Educação" },
      { "key": "state_education_council_resolution", "label": "Resolução do Conselho Estadual de Educação" },
      { "key": "pest_control", "label": "Dedetização" },
      { "key": "water_tank_cleaning", "label": "Limpeza da caixa d'água" },
      { "key": "first_aid_certificate", "label": "Certificado de primeiros socorros" }
    ]
  }
}
```

Each row is the same object as `data` below. Several files per type are kept (renewals); order is
`created_at` descending.

### `POST /compliance_documents`

`multipart/form-data` with flat fields `document_type`, `file`, and optional `title` (the `documents`
table has no title column, so it is ignored, as in "Meus documentos"). `file` is a PDF, JPEG or PNG
up to 10 MB, checked on the bytes (the same limits as the guardian upload). `201`:

```json
{ "data": { "id": 41, "document_type": "pest_control", "document_type_label": "Dedetização",
            "status": "approved", "uploaded_by_id": 7, "filename": "dedetizacao-2026.pdf",
            "content_type": "application/pdf", "byte_size": 183204, "file_url": "/rails/active_storage/...",
            "created_at": "...", "updated_at": "..." } }
```

### `GET /compliance_documents/:id`

`200` with the same `{ "data": { ... } }` object. Another school's id, a student's file, a
non-catalog document and a discarded file are all `404`.

### Errors

Standard envelope `{ "error": { "code", "message", "details" } }`.

| Status | `error.code` | Condition |
|--------|--------------|-----------|
| 401 | `unauthorized` | No or invalid token |
| 403 | `forbidden` | Guardian, or staff without `manage_documents` |
| 403 | `module_disabled` | School has the `documents` module off |
| 404 | `not_found` | Unknown school for the user, cross-school id, non-compliance or discarded id |
| 422 | `validation_error` | Unknown `document_type` (`details.document_type`), missing/invalid `file` (`details.file`) |
| 422 | `unsupported_media_type` | File bytes are not PDF/JPEG/PNG |
| 422 | `file_too_large` | File over 10 MB |

### Isolation from the archive

Guardian surfaces (`/me/documents`, `GET /documents`, the policy scope) only ever resolve `Student`
and `Guardian` owners, so compliance files never reach a family. The staff archive
(`POST /documents`) refuses a compliance `document_type` unless the owner is the School
(`422`, `details.documentable_type`).

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

`Documents`, `Archive`, `Guardian Requests`, `Guardian Me`, `Compliance`
