# PRD — Academic: Preceptorship Reports (BC9 backfill)

> Status: implemented  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: none — School Lab product decision; not PEI/AEE  
> Modeling: [`docs/modeling/007-academic.md`](../../modeling/007-academic.md)  
> API: [`docs/api/v1/academic.md`](../../api/v1/academic.md)

---

## Objective

Document the shipped **Preceptoria** flow: a teacher-authored narrative about one student's
progress, deliberately published to the family and available as an on-demand PDF.

---

## Context and boundaries

Preceptoria is prose about how a student is progressing. It is not a grade, report card, medical
record, **PEI** (individual education plan), **AEE** (specialized educational support), or
special-education workflow. Adding structured goals, accommodations, diagnoses, health fields, or
rating scales requires a separate approved PRD and sensitive-data review.

This is a backfill of behavior shipped in `preceptorship_reports`. Requirements are grounded in the
implemented contract and marked `[product decision]`.

---

## Competitive grounding

No canonical capability defines School Lab's exact Preceptoria lifecycle. Proesc documents an
adjacent teacher-authored descriptive report
(`raw:proesc:academic.create_cadastrar_o_relatorio_descriti`) in
[`catalogo-funcionalidades.md`](../../ref/catalogo-funcionalidades.md) and
[`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md).
That alias maps to a broader grade capability, so it is evidence only for the market existence of
descriptive reports, not a claim that Preceptoria is a grade or PEI/AEE flow. Its lifecycle,
authorization, publication, and PDF rules remain `[product decision]`.

---

## Actors and surfaces

| Actor | Surface | Actions |
|-------|---------|---------|
| teacher membership with `teach` | Web SPA/API | Create only for assigned students; shipped read/update/delete/publish/PDF policy scope is currently school-wide |
| non-teacher staff membership with `teach` and a matching teacher email record | Web SPA/API | Create under that teacher for any same-school student; administer all same-school reports |
| guardian (UI: **Responsável**) | Web first; mobile parity later | List, read, and download only published reports for linked children |

---

## Segment applicability

Applies to `infantil` and `fundamental_medio`. It remains an unstructured narrative in both;
segment-specific PEI/AEE or health content is out of scope.

---

## Business Rules

BR-PR01

Each report belongs to one `school_id`, student, teacher, and optional academic period. `author_id`
records who entered the text when that differs from the named teacher.

BR-PR02

Lifecycle is one-way: `draft` → `published`. Drafts may be edited or discarded; a published report
cannot be edited, discarded, or unpublished. A correction is a new report, preserving what the
family was previously told.

BR-PR03

Creation always resolves a `teacher` record by the authenticated user's email and writes that id;
the request does not accept `teacher_id`. When `Current.membership.role == "teacher"`, creation and
the roll are narrowed to students in classes covered by active teaching assignments. For a
non-teacher staff membership holding `teach`, the shipped controller bypasses that assignment
check, but creation still fails `not_found` when no matching teacher email record exists. The
controller comment about coordination writing for a departed teacher is therefore not implemented:
substitute/departed-teacher selection is not accepted by the request.

The shipped Pundit scope returns every same-school report to any membership with `teach`, including
a teacher membership. Update, draft discard, publish, and PDF checks require that school-wide scope
plus report state; they do not re-check assignment or named-teacher ownership. This is the
implemented contract being backfilled, not the desired least-privilege target.

BR-PR04

Guardian reads are school- and family-scoped and include only `published` rows. Draft, other-school,
and other-family ids return `404`; a non-guardian on `/me` receives `403`.

BR-PR05

The PDF contains school, student, teacher, optional class/period, publish date, and narrative body.
Its issue date is `published_at`, not download time. Staff and guardian endpoints use the same
renderer, but the shipped renderer reads current school/student/teacher/class/period labels at
download time; only report body/status/publish date are immutable. Byte-stable snapshot PDFs are a
future hardening item, not shipped behavior.

BR-PR06

`body` is required. The report contains child data and is audited. Retention and read-access
logging remain legal/privacy open items; product code must not silently hard-delete published
reports.

---

## Use Cases

### UC-PR01 — Write a draft

1. Resolve school and current teacher record by authenticated-user email.
2. For a teacher-role membership, require an active class assignment covering the student; a
   non-teacher `teach` holder is not assignment-narrowed by the shipped controller.
3. Save `student_id`, optional `academic_period_id`, and `body`.
4. Return `editable: true`.

### UC-PR02 — Publish a report

1. Authorize `teach` and same-school policy scope. The shipped publish action does not re-check
   assignment or named-teacher ownership.
2. Reject empty or non-draft reports.
3. Set `published_at`, transition to `published`, and make it family-visible.

### UC-PR03 — Read as Responsável

1. Resolve `Current.guardian` for the active school membership.
2. List published reports whose student is linked to that guardian.
3. Return the narrative or deterministic PDF; direct access outside that scope is `404`.

---

## API

Base: `/api/v1/schools/:school_id`

| Method | Path | Actor | Status |
|--------|------|-------|--------|
| `GET` | `/academics/preceptorship_reports?student_id=&status=&mine=` | teacher/staff | implemented |
| `GET` | `/academics/preceptorship_reports/roll` | teacher/staff | implemented |
| `POST` | `/academics/preceptorship_reports` | teacher/staff | implemented |
| `GET` | `/academics/preceptorship_reports/:id` | teacher/staff | implemented |
| `PATCH` | `/academics/preceptorship_reports/:id` | teacher/staff; draft only | implemented |
| `DELETE` | `/academics/preceptorship_reports/:id` | teacher/staff; draft only | implemented |
| `POST` | `/academics/preceptorship_reports/:id/publish` | teacher/staff | implemented |
| `GET` | `/academics/preceptorship_reports/:id/pdf` | teacher/staff | implemented |
| `GET` | `/me/preceptorship_reports` | guardian | implemented |
| `GET` | `/me/preceptorship_reports/:id` | guardian | implemented |
| `GET` | `/me/preceptorship_reports/:id/pdf` | guardian | implemented |

List responses use `{ data, meta }`; item responses use `{ data }`. Fields include `id`,
`school_id`, `student_id`, `student_name`, `teacher_id`, `teacher_name`, optional period fields,
`status`, `body`, `published_at`, `editable`, and timestamps.

---

## Errors

| Status | Code / condition | Meaning |
|--------|------------------|---------|
| `403` | `forbidden` | Wrong role/permission or teacher-role create targets an unassigned student |
| `404` | `not_found` | Cross-school/family, draft guardian read, absent record, or create actor has no matching teacher email record |
| `409` | `invalid_state_transition` | Edit/publish after publication or repeated publish |
| `422` | `validation_error` | Blank body or unsupported PDF character encoding |

---

## Database

`preceptorship_reports`: `school_id`, `student_id`, `teacher_id`, optional
`academic_period_id`/`author_id`, `body`, `status`, `published_at`, `discarded_at`, timestamps.
See [`007-academic.md`](../../modeling/007-academic.md).

---

## Events

No external event is shipped. A future publication notification may consume
`PreceptorshipReportPublished`, but adding it requires a communication contract and must not alter
the publication transaction.

---

## Permissions

| Action | shipped `teach` scope | guardian |
|--------|-----------------------|----------|
| list/show | every same-school report; `mine=true` is only an optional list filter | linked students, published only |
| create | matching teacher email record; assignment checked only for teacher-role membership | no |
| update/delete draft | every same-school draft | no |
| publish/PDF | every same-school report allowed by state | published PDF only |

---

## Non-functional requirements

- NFR-002: per-family and per-school isolation; cross-family ids return `404`.
- NFR-005: creation, edits, discard, and publication are school-audited.
- Published narrative/status/publish date are immutable; correction creates another report.
- PDF bytes are not immutable in the shipped implementation because identifying labels are rendered
  from live records. Snapshotting those labels/PDF is a documented hardening gap.
- Shipped `teach` policy scope is broader than assignment/author ownership for existing report
  reads and mutations. Narrowing it is an application-code authorization blocker outside this docs
  change; this PRD does not claim that narrowing already exists.
- UI uses **Preceptoria** and **Responsável**; identifiers remain English.

---

## Acceptance Criteria

AC-PR01

- [ ] Given a draft and a published report for a linked child, when the Responsável lists
      Preceptoria, then only the published report appears.
- Source: shipped request contract `[product decision]`

AC-PR02

- [ ] Given a report for another family, when its JSON or PDF URL is requested, then the API
      returns `404` without record metadata.
- Source: NFR-002 `[product decision]`

AC-PR03

- [ ] Given a report published on 2026-05-12, when downloaded later, then its PDF still shows
      12/05/2026.
- Source: shipped PDF behavior `[product decision]`

AC-PR04

- [ ] Given a published report, when staff tries to edit, discard, or publish it again, then the
      original remains unchanged.
- Source: shipped lifecycle/NFR-001 `[product decision]`

AC-PR05

- [ ] Given two teacher memberships with `teach` in the same school, when one requests the other's
      report id, then the shipped policy currently permits read and state-appropriate mutation;
      only creation and roll are assignment-narrowed for a teacher-role membership.
- Source: shipped controller/policy/service contract `[product decision]`

---

## Open items / pending decisions

- [ ] Narrow teacher-role policy scope for existing report read/mutation to assignment and/or named
      teacher ownership without breaking coordination workflows.
- [ ] Legal retention period for published narratives and PDFs.
- [ ] Whether read/download access requires a dedicated audit event.
- [ ] Whether publication should emit a notification event.
- [ ] Snapshot identifying labels and generated bytes at publication if byte-stable PDFs become a
      requirement.

---

## Out of Scope

- PEI, AEE, diagnoses, accommodations, health records, structured developmental scales.
- Report cards, grades, attendance calculations, and incident reports.
- Redesigning the shipped Preceptoria UI.
