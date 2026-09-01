# PRD — Students: Health Records (BC3)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Jira: [DLA-11](https://dla-solutions.atlassian.net/browse/DLA-11)  
> Modeling: [`005-students-enrollments.md`](../../modeling/005-students-enrollments.md)  
> API: [`students-and-enrollments.md`](../../api/v1/students-and-enrollments.md) § Health records

---

## Objective

Evolve **Ficha de saúde** from a single standing note per student into:

1. A **structured health profile** (stable facts — blood type, health plan, emergency contact, special care notes).
2. **Multiple health records** per child (conditions, treatments, prescriptions) — each with optional free text and an optional **PDF attachment**.

Guardians create, update, and soft-delete records; school staff have **read-only** access — same authorization pattern as authorized pickups.

---

## Context

The fintech-first slice shipped a singular `student_health_records` row per student with free-text
`content` only. Staff could edit; there was no document upload and a second write overwrote the
first entry.

**Gaps addressed (DLA-11)**

- No medical document attachment (PDF).
- Only one record per student — subsequent writes overwrote prior content.
- No structured profile fields aligned with competitor "ficha médica" flows.
- Staff write access contradicted grooming decision (family-owned data).

**Related domains**

- **Identity / consent** — legal basis for child health data ([`consent.md`](../identity-and-onboarding/consent.md)).
- **Documents & archive** — distinct from `archive_documents`; health PDFs stay on the health record via Active Storage (not the digital archive taxonomy in MVP).
- **Academic / incidents** — pastoral or disciplinary health notes remain in incidents; this BC is family-maintained standing health information.

**Baseline replaced**

- Singular route `resource :health_record` (show/update) → nested `health_profile` + `health_records` collection.
- Unique index on `student_health_records.student_id` removed; `title` and `discarded_at` added.
- New `student_health_profiles` table (one per student).

---

## Competitive grounding

| Capability | ID | Evidence |
|------------|-----|----------|
| Register student medical form | `communication.create_cadastrar_a_ficha_medica_do_al` *(raw Agenda Edu)* | [`agenda-edu/comunicacao/funcionalidades-por-ator.md`](../../ref/agenda-edu/comunicacao/funcionalidades-por-ator.md) — blood type, health plan, emergency contact, special care |
| Maintain health information for school staff | `[product decision]` | Guardian-maintained sheet read by secretariat — no direct Proesc parity row |

Requirements without market anchor: `[product decision]` or `[invented]`.

---

## Actors and surfaces

| Actor | Surfaces | Notes |
|-------|----------|-------|
| guardian | Web SPA (`/ficha-de-saude`) | Edit profile; list/create/update/delete records; upload PDF |
| staff (`manage_people`) | Web SPA (`Students`) | Read-only profile + records; download PDF |
| teacher | — *(MVP)* | No direct access — coordination/secretary proxy |
| student | — *(MVP)* | No login; record managed by guardian |
| mobile | — *(out of scope)* | API contract-ready; UI deferred |

Detail: [`docs/actors-and-surfaces.md`](../../actors-and-surfaces.md).

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Special care notes and allergy records are high value |
| `fundamental_medio` | yes | Same model; chronic conditions and medication notes |
| `pj_financeiro` | partial | Health data unrelated to billing payer |
| `multi_unidade` | partial | Scoped by `school_id`; no cross-unit health sharing |

---

## Business Rules

BR-H01

A **student health profile** (`student_health_profiles`) holds stable health facts — at most **one**
kept row per student. All fields are optional; the family keeps it current over time.

BR-H02

Profile fields: `blood_type` (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, `unknown`),
`health_plan_name` (max 120), `health_plan_number` (max 60), `emergency_contact_name` (max 120),
`emergency_contact_phone` (max 30, digits normalized), `special_care_notes` (max 2000).

BR-H03

A **student health record** (`student_health_records`) is one condition/treatment/prescription
entry. A student may have **many** kept records. Required: `title` (max 120). Optional: `content`
(max 5000), `document` (PDF via Active Storage, max 10 MB).

BR-H04

Creating or updating a record sets `created_by_id` / `updated_by_id` and `content_updated_at`
when content or document changes. Soft delete uses `Discard` (`discarded_at`); discarded rows are
excluded from list/show.

BR-H05

**Guardian write / staff read** — linked guardians may `show`/`update` profile and full CRUD on
records. Staff with `manage_people` may `index`/`show` only. Staff `create`/`update`/`destroy` on
profile or records returns `404` or `403` (policy implementation detail).

BR-H06

Family isolation — guardian routes resolve students only via `student_guardians`. Cross-family or
cross-school student ids return `404`.

BR-H07

PDF upload validation — content-type must be `application/pdf`; size ≤ 10 MB. Invalid uploads
return `422` with i18n error keys on `document`.

BR-H08

Data migration — remove unique `student_id` index on records; backfill non-empty legacy rows with
`title = "Health information"`; delete lazy-created empty rows (`content = ""` and no title).

BR-H09

Both `student_health_profiles` and `student_health_records` include `SchoolAuditable` for change
history. Read/access audit for PDF views is **not** in MVP — flagged in
[`open-questions.md`](../../open-questions.md).

BR-H10

Legal basis — processing child health data relies on guardian consent (`consent_records`) per LGPD
Art. 11 (sensitive data). Schools act as controller; DLA as processor.

---

## Use Cases

### UC-H01 — Guardian updates health profile

Input

- `student_id` (linked child)
- Optional profile fields

Flow

1. Guardian opens `/ficha-de-saude` for a child.
2. Client `PUT /me/students/:id/health_profile` with changed fields.
3. API lazy-creates profile on first update if missing.
4. Staff may `GET` the same profile read-only under `/people/students/:id/health_profile`.

### UC-H02 — Guardian adds a health record with PDF

Input

- `title` (required), `content` (optional), `document` (optional PDF file)

Flow

1. Guardian taps "Adicionar registro".
2. Client `POST /me/students/:id/health_records` as `multipart/form-data` when PDF present.
3. API validates PDF type and size; persists record with attribution.
4. Staff lists records on student detail; may open `document_url` to download.

### UC-H03 — Guardian removes a record

Flow

1. Guardian deletes a record from the list.
2. Client `DELETE /me/students/:id/health_records/:id`.
3. API soft-discards; record disappears from guardian and staff lists.

### UC-H04 — Staff views health information (read-only)

Flow

1. Secretary opens student in `Students`.
2. Client loads profile + records from `/people/students/:id/health_*` routes.
3. UI renders disabled fields; no save actions.

---

## API

Base paths (school-scoped):

- Guardian portal: `/api/v1/schools/:school_id/me/students/:student_id/...`
- Staff: `/api/v1/schools/:school_id/people/students/:student_id/...`

### Health profile (singleton)

| Method | Guardian path | Staff path | Description |
|--------|---------------|------------|-------------|
| `GET` | `.../health_profile` | `.../health_profile` | Show profile (lazy empty object or 404 until first write — implementation returns created profile on update) |
| `PUT` | `.../health_profile` | — | Create/update profile |

### Health records (collection)

| Method | Guardian path | Staff path | Description |
|--------|---------------|------------|-------------|
| `GET` | `.../health_records` | `.../health_records` | List kept records, `updated_at` desc |
| `POST` | `.../health_records` | — | Create (multipart if PDF) |
| `GET` | `.../health_records/:id` | `.../health_records/:id` | Show |
| `PATCH` | `.../health_records/:id` | — | Update (multipart if PDF) |
| `DELETE` | `.../health_records/:id` | — | Soft discard |

**Removed (breaking):** singular `health_record` show/update routes.

### Response — health record

```json
{
  "data": {
    "id": 1,
    "student_id": 42,
    "title": "Peanut allergy",
    "content": "Uses inhaler.",
    "has_document": true,
    "document_url": "/rails/active_storage/blobs/redirect/...",
    "document_filename": "prescription.pdf",
    "created_by_name": "carolina@email.com",
    "updated_by_name": "carolina@email.com",
    "content_updated_at": "2026-09-01T12:00:00Z",
    "created_at": "2026-09-01T10:00:00Z",
    "updated_at": "2026-09-01T12:00:00Z"
  }
}
```

### Response — health profile

```json
{
  "data": {
    "id": 1,
    "student_id": 42,
    "blood_type": "O+",
    "health_plan_name": "Unimed",
    "health_plan_number": "123456",
    "emergency_contact_name": "João Sales",
    "emergency_contact_phone": "11999998888",
    "special_care_notes": "Nut-free lunch.",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

## Errors

| Status | Code / condition | Description |
|--------|------------------|-------------|
| `404` | — | Student not in policy scope (cross-family / cross-school) |
| `403` | — | Staff attempting write |
| `422` | `document` invalid | Non-PDF content-type or file > 10 MB |
| `422` | validation | Missing `title`, field length exceeded |

---

## Database

| Artifact | Location |
|----------|----------|
| Narrative DSL | `docs/modeling/005-students-enrollments.md` § Health records |
| DBML | `docs/database/schema.dbml` — `student_health_profiles`, `student_health_records` |
| DER | `docs/database/der_005.png` |

| Table | Role |
|-------|------|
| `student_health_profiles` | One structured profile per student |
| `student_health_records` | Many titled entries; optional PDF via `has_one_attached :document` |

---

## Events

No domain events in MVP. Future: notify school when guardian updates health record (out of scope).

---

## Permissions

| Action | Guardian (linked child) | Staff (`manage_people`) |
|--------|-------------------------|-------------------------|
| show profile / index+show records | yes | yes |
| update profile / create+update+destroy records | yes | **no** |

Policies: `StudentHealthProfilePolicy`, `StudentHealthRecordPolicy` — mirror authorized pickup
guardian-write / staff-read split.

---

## Non-functional requirements

Cross-cutting: [`docs/product/non-functional-requirements.md`](../../product/non-functional-requirements.md).

- **NFR-002 (LGPD)** — health data is sensitive; per-family isolation on all `/me` routes; minimize
  fields collected; consent recorded in identity BC.
- **NFR-003** — `school_id` on both tables; `policy_scope` filters by school.
- **NFR-005** — `SchoolAuditable` on profile and records; PDF storage on Active Storage (S3 in production).

Domain-specific:

- Do not execute or render PDFs server-side beyond storage and signed blob URLs.
- Empty lazy-created legacy rows removed on migration; list endpoints return only kept rows with
  meaningful content or attachments.

---

## Acceptance Criteria

AC-H001

```gherkin
Given a guardian linked to a student
When they create two health records with different titles
Then both records exist and neither overwrites the other
```

AC-H002

```gherkin
Given a guardian uploading a PDF health record attachment
When the file is application/pdf and under 10 MB
Then the record is created with has_document true and a document_url
```

AC-H003

```gherkin
Given a guardian uploading a non-PDF file
When they POST a health record
Then the API returns 422 with a document validation error
```

AC-H004

```gherkin
Given staff with manage_people
When they GET health records for a student in their school
Then they see the family's records
And POST/PATCH/DELETE return forbidden or not found
```

AC-H005

```gherkin
Given a guardian authenticated for school A
When they request health records for another family's child in school A
Then the API returns 404
```

AC-H006

```gherkin
Given a guardian updating blood type and emergency contact
When they PUT the health profile
Then staff can read the same values read-only
```

---

## Open items / pending decisions

- [ ] PDF retention after student withdrawal — [`open-questions.md`](../../open-questions.md) § LGPD.
- [ ] Access audit log when staff downloads health PDFs — same section.
- [ ] Weight/height history (edital item 6) — phase 2.
- [ ] Integration with `archive_documents` / digital dossier — out of scope.

---

## Out of Scope

- Mobile app UI (`mobile/`).
- Weight and height tracking with historical charts.
- Medication schedules with reminders (Agenda Edu "Acompanhar medicações").
- Staff editing health data on behalf of families.
- Push notification to school on guardian update.
- PDF view/download audit trail (MVP).
- Online enrollment or incident-domain health fields.
