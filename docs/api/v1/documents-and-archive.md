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

`Documents`, `Archive`, `Guardian Me`
