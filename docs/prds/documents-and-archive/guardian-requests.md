# PRD — Documents & Archive: Guardian Requests (BC3 backfill)

> Status: implemented  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: none — shipped School Lab product decision  
> Modeling: [`docs/modeling/008-documents-archive.md`](../../modeling/008-documents-archive.md)  
> API: [`docs/api/v1/documents-and-archive.md`](../../api/v1/documents-and-archive.md)

---

## Objective

Document the shipped **Meus pedidos / Solicitações** queue through which a Responsável asks the
school for a declaration or a second sitting of a missed assessment and follows the school's
answer.

---

## Context and boundaries

`guardian_requests` records the request and resolution, not the resulting document. A fulfilled
declaration links to the documents/archive domain when document generation is implemented; the
request row remains the audit history of what was asked.

This backfill matches the shipped API. Requirements are `[product decision]`; no canonical
capability currently represents this queue.

---

## Competitive grounding

No canonical capability describes this exact shared school request queue. The corpus contains
adjacent request behavior in TOTVS
(`raw:totvs:academic.manage_portal_do_cliente_minhas_solic`) and Proesc formal-request type setup
(`raw:proesc:platform-and-admin.create_criar_tipos_de_requerimentos`); see
[`catalogo-funcionalidades.md`](../../ref/catalogo-funcionalidades.md). Those flows do not establish
School Lab's request kinds, lifecycle, or family-isolation contract, which remain a
`[product decision]` backfilled from shipped behavior.

---

## Actors and surfaces

| Actor | Surface | Actions |
|-------|---------|---------|
| guardian (UI: **Responsável**) | Web first; mobile parity later | Create, list, and read own requests and resolution |
| staff with `manage_documents` | Web SPA/API | Create on behalf of guardian, filter queue, claim/release, fulfill/reject, discard |

---

## Segment applicability

Applies to `infantil` and `fundamental_medio`. `second_call` is normally relevant to
`fundamental_medio`; schools may reject an inapplicable request rather than clients hiding it by
business inference.

---

## Business Rules

BR-GR01

Kinds are `declaration` and `second_call`. Both use one queue because staff ownership, lifecycle,
family visibility, and resolution behavior are shared.

BR-GR02

Each request belongs to one school, guardian, and linked student. `details` is required.
`second_call` may include a same-school `subject_id` foreign key and `reference_date`; both remain
optional in the shipped model and are cleared for `declaration`. The application validates
`details` presence, but the shipped database column is still nullable; a safe follow-up migration
is required before this PRD may claim DB-level `NOT NULL`.

BR-GR03

Lifecycle is `pending` → `in_progress` → `fulfilled | rejected`. Staff may release
`in_progress` back to `pending`, and may fulfill/reject directly from `pending`. Guardians cannot
transition or discard requests.

BR-GR04

Guardian identity comes from `Current.guardian`, never a body `guardian_id`. The named student must
be linked to that guardian in the active school. A guardian lists and reads only their own rows;
an unknown, other-school, or same-school-but-unlinked `student_id` returns `404` so the API does not
disclose whether a child record exists. Cross-family request ids likewise return `404`.

BR-GR05

Staff with `manage_documents` sees the school queue, may create on behalf of a caller, and records a
`resolved_by` and `resolved_at` when fulfilled or rejected. The shipped resolve service requires a
non-blank `resolution_note` only for `rejected`; a fulfilled request may have no note because the
delivered declaration is the answer.

BR-GR06

Soft discard is staff-only and separate from lifecycle. Requests and their audit history contain
child/family information; retention and guardian read/download access auditing require legal review.

---

## Use Cases

### UC-GR01 — Create as Responsável

1. Resolve guardian from the active membership.
2. Resolve `student_id` through the authenticated guardian's same-school family scope; return `404`
   when it is unknown, foreign, or unlinked.
3. Ignore any submitted `guardian_id`.
4. Create `pending` and return it.

### UC-GR02 — Create on behalf of a guardian

1. Staff with `manage_documents` resolves a same-school guardian and student link; unknown,
   other-school, or unlinked identifiers return `404`.
2. Record `requested_by_id` as the staff user and create `pending`.

### UC-GR03 — Work the school queue

1. Filter by `status=open|pending|in_progress|fulfilled|rejected` and/or kind.
2. Claim with `start`, release when ownership is relinquished, or resolve with
   `fulfill`/`reject`.
3. Persist actor/time. Require a resolution note for `reject`; accept an optional note for
   `fulfill`.

### UC-GR04 — Follow as Responsável

List newest first and show the current status and resolution note for only the authenticated
guardian's requests.

---

## API

Base: `/api/v1/schools/:school_id`

| Method | Path | Actor | Status |
|--------|------|-------|--------|
| `GET` | `/requests?status=&kind=` | staff | implemented |
| `POST` | `/requests` | staff | implemented |
| `GET` | `/requests/:id` | staff | implemented |
| `DELETE` | `/requests/:id` | staff | implemented |
| `POST` | `/requests/:id/start` | staff | implemented |
| `POST` | `/requests/:id/release` | staff | implemented |
| `POST` | `/requests/:id/fulfill` | staff | implemented |
| `POST` | `/requests/:id/reject` | staff | implemented |
| `GET` | `/me/requests` | guardian | implemented |
| `POST` | `/me/requests` | guardian | implemented |
| `GET` | `/me/requests/:id` | guardian | implemented |

Create body:

```json
{
  "guardian_request": {
    "student_id": 42,
    "kind": "second_call",
    "details": "Missed the assessment because of a medical appointment.",
    "subject_id": 9,
    "reference_date": "2026-05-12"
  }
}
```

Fields include identifiers/names for guardian, student, and optional subject; kind, status, details,
reference date, resolution note/time, and timestamps. Staff detail additionally includes the
resolver display value.

---

## Errors

| Status | Code / condition | Meaning |
|--------|------------------|---------|
| `403` | `forbidden` | Wrong role/permission or guardian attempts staff transition |
| `404` | `not_found` | Cross-school/family request; unknown, foreign, or guardian-unlinked student/guardian identifier |
| `409` | `invalid_state_transition` | Invalid claim/release/resolve sequence |
| `422` | `validation_error` | Non-sensitive payload validation: blank details, invalid kind, malformed/reference-date rules, or invalid field combinations |

---

## Database

`guardian_requests`: school/guardian/student, kind/status, application-required but currently
DB-nullable details, optional same-school subject/reference date, resolution actor/note/time,
requester, `discarded_at`, and timestamps. See
[`008-documents-archive.md`](../../modeling/008-documents-archive.md).

---

## Events

No external events are shipped. Future request status notifications require an explicit
communication contract and must be idempotent.

---

## Permissions

| Action | `manage_documents` staff | guardian |
|--------|--------------------------|----------|
| list/show | school queue | own rows |
| create | on behalf of guardian | own guardian context |
| start/release/fulfill/reject/discard | yes | no |

---

## Non-functional requirements

- NFR-002: per-school and per-family isolation; no guardian id accepted from guardian input.
- NFR-005: staff lifecycle changes and discard are audited.
- UI says **Meus pedidos** for guardian self-service and **Solicitações** for the staff queue;
  technical resource stays `guardian_request`.

---

## Acceptance Criteria

AC-GR01

- [ ] Given a guardian with two linked children, when a valid request is created for either child,
      then it starts `pending` under the authenticated guardian.
- Source: shipped request contract/NFR-002 `[product decision]`

AC-GR02

- [ ] Given a request owned by another family, when the Responsável requests its id, then the API
      returns `404`.
- Source: NFR-002 `[product decision]`

AC-GR03

- [ ] Given an `in_progress` request, when staff rejects it with a note, then the guardian detail
      shows `rejected` and that note.
- Source: shipped request lifecycle `[product decision]`

AC-GR04

- [ ] Given a declaration payload carrying subject/date fields, when created, then those
      second-call-only fields are cleared.
- Source: shipped create behavior `[product decision]`

AC-GR05

- [ ] Given an unknown, other-school, or same-school-but-unlinked `student_id`, when a guardian or
      staff member creates a request for that guardian/student pair, then the API returns the same
      `404 not_found` envelope and creates nothing.
- Source: NFR-002 `[product decision]`

AC-GR06

- [ ] Given a linked student but blank `details` or an invalid `kind`, when request creation is
      attempted, then the API returns `422 validation_error` with field errors.
- Source: shipped validation contract `[product decision]`

AC-GR07

- [ ] Given a pending request, when staff rejects it without `resolution_note`, then the API
      returns `422 validation_error`; when staff fulfills it without a note, fulfillment succeeds
      and records resolver/time.
- Source: shipped resolve service `[product decision]`

---

## Open items / pending decisions

- [ ] Link/cardinality from a fulfilled declaration request to generated archive document(s).
- [ ] Add a safe migration making `guardian_requests.details` `NOT NULL` after verifying/backfilling
      legacy null rows; application presence validation is already shipped.
- [ ] Legal retention period and whether reads/downloads require a dedicated access log.
- [ ] Notification policy for new requests and status changes.

---

## Out of Scope

- Automatic tax declarations, which billing owns.
- Generating official declarations/certificates.
- PEI/AEE and special-education requests.
