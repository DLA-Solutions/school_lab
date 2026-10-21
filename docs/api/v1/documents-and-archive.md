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

## Livro Ata

Tenant routes under `/api/v1/schools/:school_id`; allowed only for memberships whose role template
(`staff_profiles.role_template.system_key`) is `director`, `coordination` or `secretary` — other
roles get `403`, another school's ids get `404`. PRD:
[`livro-ata.md`](../../prds/documents-and-archive/livro-ata.md).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/minutes_books` | List books (`year` filter), newest year first, with `entries_count` |
| `POST` | `/minutes_books` | Create book (`name`, `year`); same name+year in a school → `422` |
| `GET` | `/minutes_entries` | List; `q` (participant name, case/accent-insensitive), `year` (the book's), `kind`, `status`, `minutes_book_id`, `page` |
| `POST` | `/minutes_entries` | Create a draft with its `participants` |
| `GET` / `PATCH` | `/minutes_entries/:id` | Show / edit a draft (`409 invalid_state_transition` otherwise) |
| `GET` | `/minutes_entries/:id/pdf` | `application/pdf`: the signed copy once signed, otherwise a fresh preview render |
| `POST` | `/minutes_entries/:id/send_for_signature` | Render the PDF, create the Autentique document, move to `pending_signature` |
| `POST` | `/minutes_entries/:id/cancel` | Cancel a draft / pending entry (withdraws the provider document first) |

Request bodies are wrapped: `{ "minutes_book": {...} }` and `{ "minutes_entry": {...} }`. Lists use the
Pagy envelope `{ data: [...], meta: { page, per_page, total } }`; single resources are `{ data: {...} }`.

### Books

```jsonc
// POST /minutes_books  { "minutes_book": { "name": "Livro Ata 2026", "year": 2026 } }  → 201
// GET  /minutes_books                                                                   → 200 (items below)
{ "id": 1, "name": "Livro Ata 2026", "year": 2026, "entries_count": 3,
  "created_at": "2026-10-21T10:00:00Z", "updated_at": "2026-10-21T10:00:00Z" }
```

### Entries

`kind`: `meeting` | `class_council` | `final_results` (fixed at creation; ignored on `PATCH`).
`status`: `draft` | `pending_signature` | `signed` | `cancelled`.
`school_class_id` is accepted only for `class_council`. `body` is sanitized HTML (allowlist:
`h1`–`h4`, `p`, `ul`, `ol`, `li`, `strong`, `em`, `br`; no attributes).

```jsonc
// POST /minutes_entries → 201   (PATCH takes the same fields except kind; `participants` replaces the
// whole list when present and leaves it alone when omitted)
{ "minutes_entry": {
    "minutes_book_id": 1, "kind": "meeting", "title": "Reunião de pais", "held_on": "2026-03-10",
    "body": "<h2>Pauta</h2><p>...</p>", "school_class_id": null,
    "participants": [
      { "name": "Ana Souza", "role_label": "Diretora", "email": "ana@example.com",
        "cpf": "529.982.247-25", "signs": true,
        "membership_id": null, "guardian_id": null, "student_id": null }
    ] } }
```

List item (`GET /minutes_entries`) — participants carry **no** e-mail or CPF:

```jsonc
{ "id": 9, "minutes_book_id": 1, "school_class_id": null, "kind": "meeting",
  "title": "Reunião de pais", "held_on": "2026-03-10", "status": "draft",
  "signature_requested_at": null, "signed_at": null, "cancelled_at": null,
  "created_at": "...", "updated_at": "...",
  "book": { "id": 1, "name": "Livro Ata 2026", "year": 2026 },
  "participants": [ { "id": 5, "name": "Ana Souza", "role_label": "Diretora", "signs": true } ] }
```

Detail (`GET /minutes_entries/:id`, and the response of create / update / send_for_signature / cancel):

```jsonc
{ "id": 9, "minutes_book_id": 1, "school_class_id": null, "kind": "meeting",
  "title": "Reunião de pais", "held_on": "2026-03-10", "status": "pending_signature",
  "body": "<h2>Pauta</h2><p>...</p>", "school_id": 3,
  "signature_provider": "autentique", "signature_requested_at": "...", "signed_at": null,
  "cancelled_at": null, "created_by_membership_id": 12, "created_at": "...", "updated_at": "...",
  "book": { "id": 1, "name": "Livro Ata 2026", "year": 2026 },
  "sent_to_provider": true,
  "has_signed_pdf": false,
  "participants": [
    { "id": 5, "name": "Ana Souza", "role_label": "Diretora", "signs": true,
      "email": "ana@example.com", "cpf": "***.982.247-**", "signed_at": null,
      "membership_id": null, "guardian_id": null, "student_id": null } ] }
```

The CPF is always masked (`***.NNN.NNN-**`) in responses; the full document is write-only. The
provider's document id and signed-file URL are never exposed — the signed copy is served by
`GET /minutes_entries/:id/pdf` (`has_signed_pdf` says whether it is available).

### Errors

| Status | `error.code` | When |
|--------|--------------|------|
| 401 | `unauthorized` | No / invalid token |
| 403 | `forbidden` | Role template is not director / coordination / secretary |
| 404 | `not_found` | Unknown or cross-school school / entry id |
| 409 | `invalid_state_transition` | Edit, send or cancel from a state that disallows it (edit/send need `draft`; cancel needs `draft` or `pending_signature`) |
| 422 | `validation_error` | `details` keyed by field. Participant errors are keyed `participants.<index>.<field>` (e.g. `participants.1.cpf`). Unknown `minutes_book_id` / `school_class_id` → keys `minutes_book` / `school_class`. Invalid `kind` / `status` / `year` list filters → the filter name. Send errors use `details.base`: no signer, or a signer missing e-mail/CPF (names them), no signature integration configured, provider refused |
| 502 | `provider_error` | Autentique unreachable, or the signed copy cannot be fetched / the provider document cannot be cancelled |

Webhook / reconcile: Autentique callbacks for a document id belonging to a minutes entry move it to
`signed` through the same `/webhooks/signatures/:token` endpoint contracts use; a daily
`Signatures::ReconcilePendingMinutesJob` sweep is the backstop, and the signed PDF is stored on the
entry (Active Storage) by `Minutes::AttachSignedPdfJob`.

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

`Documents`, `Archive`, `Guardian Requests`, `Guardian Me`, `Minutes`
