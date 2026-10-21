# PRD — Documents & Archive: Compliance (BC5)

> Status: draft  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `documents.store_compliance_document`  
> Related BCs: [`archive.md`](archive.md) *(shared `documents` storage)*, [`retention.md`](retention.md)  
> Modeling: [`008-documents-archive.md`](../../modeling/008-documents-archive.md) § Compliance (BC5)  
> API narrative: [`documents-and-archive.md`](../../api/v1/documents-and-archive.md) § Compliance

---

## Objective

Give school staff one menu item, **"Compliance"**, to upload and keep the **school's own regulatory
documents** (health inspection, fire-department certificate, education-council resolutions, pest
control, water-tank cleaning, first-aid certificate) so they are at hand for Conselho or inspector
audits ([`vision.md`](../../vision.md) §3).

---

## Context

- First item of the stakeholder's "Documentos da unidade" list
  ([`main-menu-description.md`](../../main-menu-description.md)); this slice ships the seven types
  below. The rest of that list (alvará, regimento interno, projeto pedagógico, edital de matrículas)
  is not in scope yet.
- Stored in the existing `documents` table as `documentable_type = "School"` (already allowed by
  [`archive.md`](archive.md)); no new table. Compliance files are **school-level**, never tied to a
  student or guardian, and never visible to guardians.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Store school compliance document | `documents.store_compliance_document` | `[product decision]` — stakeholder request 2026-10-21; audit readiness per [`vision.md`](../../vision.md) §3 |

---

## Actors and surfaces

| Actor | Surface | Notes |
|-------|---------|-------|
| Staff with `manage_documents` | Web SPA | List, upload, download, remove |
| Teacher without the permission, guardian | — | No access |

---

## Segment applicability

All segments (`infantil`, `fundamental_medio`, `multi_unidade`: per school).

---

## Business Rules

BR-CP01 *(catalog)*

The compliance `document_type` is a closed list (stable English keys, pt-BR labels via i18n):

| Key | Label (pt-BR) |
|-----|---------------|
| `sanitary_inspection` | Vigilância sanitária |
| `fire_department_certificate` | Certificado dos bombeiros |
| `municipal_education_council_resolution` | Resolução do Conselho Municipal de Educação |
| `state_education_council_resolution` | Resolução do Conselho Estadual de Educação |
| `pest_control` | Dedetização |
| `water_tank_cleaning` | Limpeza da caixa d'água |
| `first_aid_certificate` | Certificado de primeiros socorros |

Adding a type is a code change plus a PRD update (no school-configurable types in this slice).

BR-CP02 *(upload)*

A compliance document is one file (PDF or image; same size/type limits as the archive) with a
`document_type` from BR-CP01 and an optional `title`. It is created `approved` — there is no
review step. A type can hold **several files** (renewals); the list shows newest first, so history
is kept.

BR-CP03 *(removal)*

Removing a file discards it (soft delete, `discarded_at`/`discarded_by_id`); it disappears from the
list but is retained per [`retention.md`](retention.md).

BR-CP04 *(isolation and access)*

Requires `manage_documents`. Scoped to `Current.school`; another school's id → `404`. Guardians and
students never see these documents; the existing guardian document endpoints must not return
`documentable_type = "School"` rows.

BR-CP05 *(audit)*

Uploads and removals are audited (existing `SchoolAuditable` on `Document`) with the actor.

---

## Use Cases

### UC-CP01 — List compliance documents

Optional `document_type` filter. Returns files grouped by the SPA per type (a type with no file
shows as empty so staff see what is missing).

### UC-CP02 — Upload

Input: `document_type`, `file`, optional `title`. `422` for an unknown type or missing/invalid file.

### UC-CP03 — Download

Returns the file for viewing/download.

### UC-CP04 — Remove

Soft-deletes the document (BR-CP03).

---

## API

Tenant routes under `/api/v1/schools/:school_id` (shapes in
[`documents-and-archive.md`](../../api/v1/documents-and-archive.md) § Compliance):

| Method | Path | Use case |
|--------|------|----------|
| `GET` | `/compliance_documents` | UC-CP01 (`document_type`, page) |
| `POST` | `/compliance_documents` | UC-CP02 (multipart) |
| `GET` | `/compliance_documents/:id` | UC-CP03 |
| `DELETE` | `/compliance_documents/:id` | UC-CP04 |
| `GET` | `/compliance_documents/types` | Catalog (`key`, `label`) — or expose via the list `meta` |

---

## Errors

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `unauthorized` | No token |
| 403 | `forbidden` | Missing `manage_documents` |
| 404 | `not_found` | Cross-school or discarded id |
| 422 | `validation_error` | Unknown `document_type`, missing/invalid file |

---

## Database

No new table: `documents` with `documentable_type = "School"`, `documentable_id = school_id`,
`document_type` from BR-CP01, `status = approved`. See
[`008-documents-archive.md`](../../modeling/008-documents-archive.md) § Compliance.

---

## Events

None.

---

## Permissions

| Action | `manage_documents` staff | Other staff | Guardian |
|--------|--------------------------|-------------|----------|
| List / download / upload / remove | yes | no | no |

---

## Acceptance Criteria

- [ ] Staff with `manage_documents` see "Compliance" in the menu (module `documents` enabled); others do not.
- [ ] The page shows the seven types; each lists its files newest first and offers upload.
- [ ] Uploading a file under a type lists it immediately; an unknown type or a missing file returns `422`.
- [ ] A second upload under the same type keeps the first one in the list.
- [ ] Removing a file hides it from the list; a guardian token and another school's token never see it (`403` / `404`).
- [ ] Guardian "Meus documentos" never returns a compliance document.

---

## Out of Scope

- Expiry/validity dates and renewal reminders; other "Documentos da unidade" types (alvará, regimento interno, projeto pedagógico, edital); school-configurable types; versioning UI beyond the newest-first list.
