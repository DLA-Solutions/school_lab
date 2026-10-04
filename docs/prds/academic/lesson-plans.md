# PRD — Academic: Lesson Plans (BC10)

> Status: validated
> Parent PRD: [`index.md`](index.md)
> Capability IDs: `academic.manage_lesson_plan`
> Related BCs: [`diary.md`](diary.md) (BC4 — intentionally separate, see Context),
> [`curriculum.md`](curriculum.md) (`class_discipline`), platform
> [`school-year.md`](../platform-and-admin/school-year.md) (instructional-days calendar, BR-SY10)
> Modeling: *(pending — `docs/modeling/007-academic.md`)*
> API narrative: *(pending — `docs/api/v1/academic.md`)*

---

## Objective

Let a teacher write and send a short **lesson plan** (plano de aula) for one class, one subject,
and one instructional day, from a yearly calendar view — and let an administrator mark which
calendar days are instructional for teachers to plan against.

---

## Context

The stakeholder's original notes ([`main-menu-description.md`](../../main-menu-description.md)
line 38-40) describe "Planos de aula" with coordination approval. [`diary.md`](diary.md) (BC4)
already models a heavier **Class Diary** — lessons with `planned|taught|cancelled` status, a
submission workflow (`draft → submitted → returned|accepted`), batch generation, and
copy-from-prior-term — but is unimplemented, and the product owner confirmed (2026-10-02) this is
a **deliberately separate, simpler** capability: no diary aggregate, no lesson status machine, no
submission/review cycle. Coordination approval from the original note is explicitly **not** built
in this version — see Open items.

Turma + matéria + professor is **not** modeled here: it already exists as `class_discipline`
(curriculum BC5), which ties one teacher to one subject in one class. A lesson plan simply
references the `class_discipline` the requesting teacher is already assigned to.

"Dias letivos" (instructional days) are **not** derived from `school_holidays` by exclusion today
— no weekday-pattern field exists, and the product owner confirmed (2026-10-02) the admin needs to
mark each calendar day explicitly, day by day. That calendar is a year-level concept, so it is
documented as an addition to [`school-year.md`](../platform-and-admin/school-year.md) (BR-SY10),
which already owns `school_years`/`school_holidays`; this PRD only consumes it.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Write a lesson plan per day/class/subject | `academic.manage_lesson_plan` | [`main-menu-description.md`](../../main-menu-description.md) stakeholder note; [`actors-and-surfaces.md`](../../actors-and-surfaces.md) "Create and view lesson plans" |

Requirements with no further market anchor beyond the stakeholder's own note are marked
`[product decision]` below.

---

## Actors and surfaces

| Actor | Surfaces | Notes |
|-------|----------|-------|
| teacher | Web SPA (`/app`) | Open the annual calendar for a class, click an instructional day, write/send the plan for one of their own subjects that day; list their own plans |
| staff with `manage_academic` | Web SPA (`/app`) | Read every lesson plan in the school via a dedicated menu entry (separate from the teacher-facing calendar at `nav.lessonPlans`), filterable by teacher, subject, and class (UC-LP04); no approval action in this version |
| guardian | — | No access |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | partial | Simpler content expected; same mechanism |
| `fundamental_medio` | yes | Primary use |
| `pj_financeiro` | yes | — |
| `multi_unidade` | partial | Per-school, same as the rest of academic |

---

## Business Rules

BR-LP01 — `capability_id`: `academic.manage_lesson_plan`

A **lesson plan** (`lesson_plans`) belongs to exactly one `class_discipline_id` (which already
fixes school, school class, subject, and assigned teacher — curriculum BC5) and one `date`. The
plan body follows the structured template in BR-LP07 — there is no separate free-text `content`
field (superseded; see BR-LP07).

BR-LP02

Only the `class_discipline`'s assigned teacher, or staff with `manage_academic`, may create or
update a lesson plan against it. Wrong teacher → `403`.

BR-LP03

`date` must be marked **instructional** for the `class_discipline`'s school year (BR-SY10 in
[`school-year.md`](../platform-and-admin/school-year.md)) — a day not yet marked, explicitly
marked non-instructional, or outside the school year's bounds is rejected with
`422 non_instructional_day`. There is no readiness gate beyond this: a lesson plan may be written
for a future day, or left as the only content for that day — nothing else is required to exist.

BR-LP04

One lesson plan per `(class_discipline_id, date)`. Submitting again for the same pair updates the
existing row in place rather than creating a second one — there is one plan per class/subject/day,
not a history of drafts.

BR-LP05

No submission or approval workflow in this version: saving is immediate and the plan is visible
right away. The stakeholder's original note ("Coordenação precisa aprovar o plano de aula") is
explicitly deferred — see Open items — not silently dropped.

BR-LP06

All queries scoped by `school_id` (NFR-003); a lesson plan is never visible across schools.

BR-LP07 *(structured template — supersedes the free-text `content` field from BR-LP01)*

The plan body follows the school's standard printed template (the stakeholder's own paper form).
Professor/Disciplina/Turma/Data are **not** duplicated here — they resolve from
`class_discipline_id` + `date` per BR-LP01. The template adds these fields, all free text unless
noted, all optional (`[product decision]` — no field beyond `class_discipline_id`/`date` is
required to save a plan, matching BR-LP03's "nothing else is required to exist"):

| Field | Template label | Type |
|-------|-----------------|------|
| `duration` | Duração | string (free text, e.g. "50 minutos" — not a structured numeric/unit pair `[product decision]`) |
| `unit_stage` | Unidade/Etapa | string |
| `topic` | Tema da Aula | string |
| `general_objective` | Objetivo geral | text |
| `specific_objectives` | Objetivos específicos | text |
| `bncc_competencies` | Competências e habilidades (Código BNCC) | text — free text, not validated against a catalog; no BNCC code catalog exists in the system yet (`[product decision]`, same deferred scope as `curriculum.md`'s "full BNCC tagging" open item) |
| `other_competencies` | Outras competências | text |
| `resources_materials` | Recursos, Materiais e estratégias metodológicas | text |
| `assessment_types` | Tipo de avaliação | string array, multi-select checkboxes — allowed values: `diagnostic`, `formative`, `summative` |
| `assessment_formats` | (format checkboxes under Avaliação) | string array, multi-select checkboxes — allowed values: `observation`, `exercises`, `participation`, `written_production`, `oral_presentation`, `practical_activity`, `test` |

BR-LP08

A saved lesson plan can be previewed as a **PDF**, rendered from the template fields (BR-LP07) plus
the resolved teacher/subject/class/date, via a popup triggered by an action button — same UX
pattern as the Ata/incident PDF preview (`academic/incidents.md` — `Academic::RenderIncidentPdfService`
+ unsandboxed blob-URL iframe). No notification or event is emitted on preview; this is a read-only
render of already-saved data, not a new workflow step.

---

## Use Cases

### UC-LP01 — Open the annual calendar for a class (teacher)

Input: `school_class_id`.

Flow

1. Resolve the class's school year and its marked instructional days (BR-SY10).
2. Render a year calendar; instructional days are clickable, everything else is not.

### UC-LP02 — Write/send a lesson plan (teacher)

Input: `school_class_id`, `date` (from the calendar click), then in the popup: `subject_id`
(scoped to the teacher's own `class_discipline` rows for that class — BR-LP02) and the BR-LP07
template fields.

Flow

1. Resolve `class_discipline_id` from `(school_class_id, subject_id)`; verify the requester is its
   teacher, or staff with `manage_academic` (BR-LP02).
2. Verify `date` is instructional (BR-LP03).
3. Upsert by `(class_discipline_id, date)` (BR-LP04).

### UC-LP05 — Preview a lesson plan as PDF (BR-LP08)

Input: `lesson_plan_id`.

Flow

1. Validate the requester can read this plan (BR-LP02 scope — own plans for teachers, any for
   `manage_academic` staff).
2. Render the BR-LP07 template fields + resolved teacher/subject/class/date into a PDF; stream
   inline for the popup preview.

### UC-LP03 — List my lesson plans (teacher)

Input: optional date range, optional `school_class_id`/`subject_id`.

Flow

1. Scope to the teacher's own `class_discipline` assignments.

### UC-LP04 — Read a school's lesson plans (coordination)

Input: filters (class, subject, teacher, date range).

Flow

1. Staff with `manage_academic` reads across all classes/subjects/teachers in the school via a
   dedicated menu entry (`[product decision]` — a new sitemap item gated by `manage_academic`,
   distinct from the shared `nav.lessonPlans` entry that still serves the teacher calendar /
   instructional-days admin split) — no action beyond reading in this version (BR-LP05).
2. The requester may narrow the list by any combination of `school_class_id`, `subject_id`,
   `teacher_id`, and `from`/`to` date range.

---

## API

Base: `/api/v1/schools/:school_id/academics`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/school_classes/:school_class_id/instructional_days` | Calendar for UC-LP01 — reads BR-SY10 data, scoped to this class's school year |
| `GET` | `/lesson_plans?school_class_id=&subject_id=&teacher_id=&from=&to=` | List (UC-LP03 teacher-scoped, UC-LP04 staff-scoped by `policy_scope`; `teacher_id` is only meaningful for `manage_academic` staff — a teacher's own scope already excludes every other teacher) |
| `GET` | `/lesson_plans/:id` | Read one |
| `PUT` | `/lesson_plans` | Upsert by `school_class_id` + `subject_id` + `date` (UC-LP02, BR-LP04) |
| `GET` | `/lesson_plans/:id/pdf` | PDF preview (UC-LP05, BR-LP08) — `Content-Type: application/pdf`, `disposition: inline` |

Upsert request:

```json
{
  "lesson_plan": {
    "school_class_id": 310,
    "subject_id": 12,
    "date": "2026-04-14",
    "duration": "50 minutos",
    "unit_stage": "Unidade 3 — Frações",
    "topic": "Introdução a frações",
    "general_objective": "Compreender o conceito de fração como parte de um todo.",
    "specific_objectives": "Identificar numerador e denominador; representar frações simples.",
    "bncc_competencies": "EF04MA07, EF04MA08",
    "other_competencies": "Trabalho em dupla",
    "resources_materials": "Livro didático, quadro, material concreto (frutas em EVA)",
    "assessment_types": ["formative"],
    "assessment_formats": ["exercises", "participation"]
  }
}
```

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `forbidden` | Teacher not assigned to that class_discipline |
| 404 | `not_found` | Unknown class/subject/plan, or cross-school |
| 422 | `non_instructional_day` | `date` not marked instructional (BR-LP03) |
| 422 | `validation_error` | `assessment_types`/`assessment_formats` value outside the allowed lists (BR-LP07) |

---

## Database

| Entity | Purpose |
|--------|---------|
| `lesson_plans` | One row per `(class_discipline_id, date)`: BR-LP07 template fields (`duration`, `unit_stage`, `topic`, `general_objective`, `specific_objectives`, `bncc_competencies`, `other_competencies`, `resources_materials`, `assessment_types[]`, `assessment_formats[]`), timestamps |
| `class_disciplines` *(existing, curriculum BC5)* | Resolves teacher + subject + class |
| `school_instructional_days` *(new, owned by [`school-year.md`](../platform-and-admin/school-year.md) BR-SY10)* | Which calendar days are instructional |

---

## Events

None in this version — no downstream consumer identified yet.

---

## Permissions

| Key | create/update own | read own | read all (school) |
|-----|--------------------|----------|--------------------|
| teacher (assigned to the `class_discipline`) | yes | yes | — |
| `manage_academic` | yes (any) | — | yes |

---

## Non-functional requirements

- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — `school_id` scoping (BR-LP06).

---

## Acceptance Criteria

AC-LP01

- [ ] Given teacher T is assigned subject S in class C, When T opens C's annual calendar and clicks
      an instructional day, Then a popup offers S (and any other subject T teaches in C) and the
      BR-LP07 template fields.
- Source: stakeholder note, [`main-menu-description.md`](../../main-menu-description.md)

AC-LP02

- [ ] Given a date not marked instructional, When a teacher submits a lesson plan for it, Then the
      API returns `422 non_instructional_day` and nothing is persisted.
- Source: BR-LP03

AC-LP03

- [ ] Given teacher T already sent a plan for `(class_discipline, date)`, When T sends another for
      the same pair, Then the existing row is updated, not duplicated.
- Source: BR-LP04

AC-LP04

- [ ] Given teacher T is not assigned to subject S in class C, When T submits a plan for
      `(C, S, date)`, Then the API returns `403`.
- Source: BR-LP02

AC-LP05 *(structured template)*

- [ ] Given a teacher saves a lesson plan with only `school_class_id`/`subject_id`/`date` and no
      BR-LP07 fields, When the request is sent, Then it succeeds (all template fields optional).
- [ ] Given `assessment_types`/`assessment_formats` with values outside the allowed lists in
      BR-LP07, When submitted, Then the API returns `422`.
- Source: BR-LP07

AC-LP06 *(PDF preview)*

- [ ] Given a saved lesson plan, When its owning teacher (or `manage_academic` staff) requests
      `GET /lesson_plans/:id/pdf`, Then the response is an inline `application/pdf` rendering the
      BR-LP07 fields.
- [ ] Given a teacher not assigned to that `class_discipline`, When they request the PDF, Then the
      API returns `403`.
- Source: BR-LP08, BR-LP02

AC-LP07 *(coordination list + filters)*

- [ ] Given staff member S holds `manage_academic`, When S opens the dedicated "all lesson plans"
      menu entry, Then S sees lesson plans from every teacher/class/subject in the school, not
      just their own.
- [ ] Given that screen, When S filters by teacher, subject, or class (alone or combined), Then
      only matching plans are listed; combined with `from`/`to` narrows further.
- [ ] Given a teacher (no `manage_academic`) calls `GET /lesson_plans` with a `teacher_id` other
      than their own, When the request resolves, Then the `teacher_id` filter has no effect beyond
      their own already-scoped plans (BR-LP02/BR-LP06 — `policy_scope` still wins).
- Source: UC-LP04

---

## Open items / pending decisions

- [ ] Coordination approval (`draft → submitted → returned|accepted`, per the original stakeholder
      note) is deferred, not implemented — revisit if coordination needs to gate what teachers
      send. If/when built, this likely converges with `diary.md`'s BR-D06 workflow rather than
      inventing a second one.
- [ ] Rich text vs plain text per BR-LP07 field — same open item as `diary.md`.
- [ ] BNCC competency catalog/validation (`bncc_competencies` is free text today, BR-LP07) — same
      deferred scope as `curriculum.md`'s "full BNCC tagging" open item.
- [ ] Whether `lesson_plans` and `diary.md`'s future `lessons` table should ultimately merge once
      diary is built — both key off `class_discipline_id` + `date`.

---

## Out of Scope

- Submission/approval workflow — see Open items.
- Attendance or grade activities tied to a lesson plan — that is `diary.md`'s `lesson_activities`.
- Batch generation, copy-from-prior-term — `diary.md` BR-D04/BR-D05, not built here.
