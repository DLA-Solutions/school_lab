# PRD — Academic: Report Cards (BC3)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `academic.publish_report_card`, `academic.view_report_card`, `academic.configure_report_card`  
> Related BCs: [`grades.md`](grades.md), [`attendance.md`](attendance.md), [`periods.md`](periods.md)  
> Modeling: [`docs/modeling/007-academic.md`](../../modeling/007-academic.md)
> API narrative: [`docs/api/v1/academic.md`](../../api/v1/academic.md) — approved narrative target; executable OpenAPI pending

---

## Objective

Define **report card (boletim) configuration**, **scheduled publish**, and **guardian/staff view**
with immutable publish snapshots (NFR-001) and family-scoped guardian access (NFR-002).

---

## Context

Report cards aggregate **launched grades** (grades BC), **attendance summaries** (attendance BC),
and **discipline visibility rules**. Publish creates an **immutable snapshot** per student per
period.

The engine is standard and versioned; each school owns a `report_card_config` that selects template
reference, visibility, attendance mode, and exactly one `document_signatory_id`. This closes the
prior standard-vs-school template ambiguity without allowing arbitrary executable templates.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Publish report card | `academic.publish_report_card` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) boletim release workflow — **differentiator** |
| View report card | `academic.view_report_card` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) guardian view |
| Configure report card | `academic.configure_report_card` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) hide-discipline/final-grade rules |

---

## Actors and surfaces

| Actor | Surfaces | Actions |
|-------|----------|---------|
| staff with `manage_academic` | Web SPA/API | Configure, validate, schedule, publish, correct |
| teacher | Web SPA/API | Optional read only when separately approved |
| guardian (UI: **Responsável**) | Web first; mobile parity | List/read released snapshots and PDF for linked children |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | partial | Simplified layout; concept/descriptive fields |
| `fundamental_medio` | yes | Full discipline grid + frequency |
| `pj_financeiro` | yes | Same view; no payer-specific boletim |
| `multi_unidade` | partial | Per-school templates |

---

## Business Rules

BR-RC01

**Report card configuration** per school defines: visible columns, hide discipline rules,
show/hide numeric vs concept, attendance display mode, template reference, one document signatory, and
header/footer text. Updating configuration creates a new config version for future publications;
published snapshots retain the version used.

BR-RC02

**Hide discipline** rules: by `discipline_id`, by student opt-out flag, or by incomplete diary
block `[product decision]`. The effective visibility result is materialized in the snapshot rather
than recomputed on read.

BR-RC03

**Publish** creates one `report_card_publication` aggregate for `(school, student, period)` and an
append-only `report_card_snapshot` version. Corrections require `republish` with a required audit
reason; the prior version and PDF remain unchanged.

Snapshot rows are released records, never drafts: PDF bytes and snapshot payload are staged before
the release transaction, and a row is inserted with non-null `released_at` and
`pdf_storage_key`. `report_card_publications.active_snapshot_id` is nullable only before the
aggregate's first successful release. Failed staging creates no snapshot row and advances no active
pointer.

BR-RC04

**Scheduled class publish** creates a stable `report_card_publish_batch.id` and
`report_card_publish_schedule.id` before enqueue. `scheduled_for` is interpreted in the school's
IANA timezone and stored as UTC. Guardian visibility starts only when the entire class batch is
successfully materialized and each version has `released_at <= now`, not at validation or enqueue.

BR-RC05

Pre-publish **validation** requires: target period exists in the same school/year; grade launch
records cover every required visible class discipline, are not invalidated, and have an
`input_digest` matching current contributing inputs; launched values/formulas are valid; no
attendance session remains pending confirmation; and attendance summary can be computed for the
period. Initial publication requires `academic_periods.closure_status = closing`; a closed period
allows only an audited correction/republish. Missing prerequisites return structured blockers. A `force_publish_reason` may bypass only
school-configured warning-level items, never missing/invalid grade data, pending attendance, wrong
tenant/year, or a closed/reopened state conflict.

BR-RC06

Guardian **view** via `/me/report_cards`, `/me/report_cards/:publication_id`, and nested
`:snapshot_id` routes returns only released snapshots for students linked to `Current.guardian` in
the active school (NFR-002). Draft/scheduled/unreleased, cross-family, and mismatched nested ids
return `404`. Staff views are school-scoped with permission keys.

BR-RC07

Student portal (P2) reuses same snapshot API with student auth.

BR-RC08

Each newly active snapshot emits `ReportCardPublished` after the atomic release transaction,
idempotently keyed by `snapshot_id`. Whether communication consumes it, and on which channel,
remains unresolved; publication does not wait for or assume a notification consumer.

BR-RC09

Snapshots include the deterministic attendance contract from
[`attendance.md`](attendance.md) BR-AT14: denominator `instructional_sessions`, numerator,
present/absent/late/excused counts, `late_counts_as_absence`, and percentage (half-up, two
decimals). Excused always remains outside the numerator; late enters it only when policy says late
does not count as absence. They also include current launched grade values/formulas and effective
discipline visibility. Later grade, attendance, configuration, or period changes do not alter a
published version.

BR-RC10

PDF generation uses only the stored snapshot. Guardian download is a family-scoped API response or
short-lived signed artifact; it never triggers recalculation.

BR-RC11

Report-card readiness depends on the minimum prerequisite contracts below. Client implementation
must not begin until these contracts are implemented and represented in OpenAPI:

- grades: versioned evaluation components, entries, overrides, and a successful
  `grade_launch` per required class-discipline-period;
- periods: active school-year ownership; initial publish in `closing`, correction-only republish
  after `closed`;
- attendance: confirmed period records and deterministic summary semantics.

BR-RC12

A class publication batch is **all-or-nothing**. Immediate and scheduled execution revalidate every
student, stage every snapshot/PDF, and activate all resulting snapshots in one release transaction.
If any student has a blocker or any snapshot/PDF cannot be staged, the batch is `failed`, no new
snapshot from that batch becomes active or guardian-visible, and existing active snapshots remain
unchanged. A completed batch returns one result per roster student with explicit
`publication_id` and `snapshot_id`; mixed success is forbidden.

BR-RC13

Resource ids are not interchangeable. `batch_id` identifies a class request,
`schedule_id` identifies its scheduled execution, `publication_id` identifies one logical
student/period aggregate, and `snapshot_id` identifies one immutable version under that
publication. Sequential `version` is display metadata and is never accepted where `snapshot_id`
is required.

---

## Use Cases

### UC-RC01 — Configure report card display (coordination)

Input: layout options, hide rules, template id.

Flow

1. Validate `manage_academic`.
2. Upsert configuration (BR-RC01, BR-RC02).

### UC-RC02 — Publish report cards for a class

Input: `class_id`, `academic_period_id`, optional `scheduled_for`, and optional force reason for
warning-only blockers.

Flow

1. Run readiness validation and return structured grade/period/attendance blockers (BR-RC05).
2. At immediate/scheduled execution, revalidate and compute from launched grades + confirmed
   attendance.
3. Create a batch id; when scheduled, also create a schedule id and return them without snapshots.
4. At immediate/scheduled execution, stage every roster student's snapshot and PDF.
5. In one release transaction, create/update every publication aggregate, append every snapshot,
   advance all `active_snapshot_id` pointers, and mark the batch completed (BR-RC12).
6. Return one result per student with `publication_id` and `snapshot_id`; emit
   `ReportCardPublished` once per snapshot after commit.

### UC-RC03 — View report card (guardian)

Input: `publication_id` and optionally exact `snapshot_id`, or filters `student_id`,
`academic_period_id`.

Flow

1. Verify guardian link.
2. Return only released versions; latest active version is the list default.
3. Preserve superseded version metadata and correction notice without mutating prior snapshots.

---

## API

Base: `/api/v1/schools/:school_id`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/academics/report_card_config` | Read current staff configuration |
| `PATCH` | `/academics/report_card_config` | Create next config version |
| `POST` | `/academics/report_card_publication_batches/validate` | Validate one class/period request; create nothing |
| `POST` | `/academics/report_card_publication_batches` | Immediate atomic class publish or create schedule |
| `GET` | `/academics/report_card_publication_batches/:batch_id` | Poll batch status and per-student results/blockers |
| `GET` | `/academics/report_card_publish_schedules/:schedule_id` | Read scheduled execution and linked batch |
| `GET` | `/academics/report_card_publications/:publication_id` | Staff aggregate + active snapshot detail |
| `GET` | `/academics/report_card_publications/:publication_id/snapshots/:snapshot_id` | Staff exact immutable snapshot |
| `POST` | `/academics/report_card_publications/:publication_id/republish` | Correct one student with required reason |
| `GET` | `/me/report_cards?student_id=&academic_period_id=` | Guardian released list |
| `GET` | `/me/report_cards/:publication_id` | Guardian aggregate + active released snapshot |
| `GET` | `/me/report_cards/:publication_id/snapshots/:snapshot_id` | Guardian exact released snapshot |
| `GET` | `/me/report_cards/:publication_id/snapshots/:snapshot_id/pdf` | Guardian exact family-scoped PDF |

Class publish/validate request:

```json
{
  "report_card_publication_batch": {
    "class_id": 310,
    "academic_period_id": 44,
    "scheduled_for": null,
    "force_publish_reason": null
  }
}
```

Immediate response `201` (all students released):

```json
{
  "data": {
    "batch_id": 501,
    "schedule_id": null,
    "status": "completed",
    "atomic": true,
    "class_id": 310,
    "academic_period_id": 44,
    "scheduled_for": null,
    "counts": { "requested": 2, "released": 2, "failed": 0 },
    "results": [
      {
        "student_id": 42,
        "publication_id": 801,
        "snapshot_id": 901,
        "version": 1,
        "released_at": "2026-08-17T11:00:00Z",
        "pdf_url": "/api/v1/schools/7/me/report_cards/801/snapshots/901/pdf"
      },
      {
        "student_id": 43,
        "publication_id": 802,
        "snapshot_id": 902,
        "version": 1,
        "released_at": "2026-08-17T11:00:00Z",
        "pdf_url": "/api/v1/schools/7/me/report_cards/802/snapshots/902/pdf"
      }
    ],
    "blockers": []
  }
}
```

Scheduled response `202`:

```json
{
  "data": {
    "batch_id": 503,
    "schedule_id": 601,
    "status": "scheduled",
    "class_id": 310,
    "academic_period_id": 44,
    "scheduled_for": "2026-08-24T11:00:00Z",
    "school_timezone": "America/Sao_Paulo",
    "results": [],
    "blockers": []
  }
}
```

`GET .../batches/:batch_id` returns the same shape as state moves through
`scheduled | processing | completed | failed`. A failed batch has `released: 0`, no results, and
structured per-student blockers. `GET .../schedules/:schedule_id` returns `schedule_id`,
`batch_id`, `scheduled_for`, timezone, and execution status. List/detail payloads use explicit
`publication_id` and `snapshot_id`; they also carry display `version`, student, period,
`released_at`, `supersedes_snapshot_id`, correction notice, stored grade rows, deterministic
attendance summary, config version, and the stored PDF URL. A released snapshot never reports PDF
as unavailable.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 404 | `not_found` | Unpublished/cross-family publication or snapshot; snapshot not under publication; unknown batch/schedule |
| 409 | `report_card_frozen` | Mutation on published snapshot |
| 409 | `publication_in_progress` | Duplicate immediate/scheduled execution |
| 422 | `report_card_not_ready` | Structured grade/period/attendance blockers |
| 422 | `batch_release_failed` | Snapshot/PDF staging failed; batch released zero students |
| 422 | `republish_reason_required` | Correction lacks an audit reason |

---

## Database

| Entity | Purpose |
|--------|---------|
| `report_card_configs` | Versioned per-school display/template/single-signatory configuration |
| `report_card_publish_batches` | Stable class/period request, atomic status, counts, blockers |
| `report_card_publish_schedules` | Stable scheduled execution id linked one-to-one to a scheduled batch |
| `report_card_publications` | One logical student/period publication with active version |
| `report_card_snapshots` | Append-only versioned grade/attendance/config payload + PDF metadata |
| prerequisite refs | `grade_launches`, `grade_entries`, `academic_periods`, confirmed attendance |

Solid Queue stores transport execution, while the two domain rows above provide stable API ids,
audit, and pollable outcomes; queue job ids are never exposed as product resource ids.
Executable definitions: [`schema.dbml`](../../database/schema.dbml).

---

## Events

| Event | When | Consumers |
|-------|------|-----------|
| `ReportCardPublished` | Newly active snapshot committed; idempotency key `snapshot_id` | Consumer unresolved |
| `ReportCardRepublished` | Correction snapshot committed | Consumer unresolved |

---

## Permissions

| Key | configure | validate/publish/republish | view (staff) | view (guardian) |
|-----|-----------|---------|--------------|-----------------|
| `manage_academic` | yes | yes | yes | — |
| guardian `/me` | — | — | — | linked students |
| teacher | — | — | assigned classes read `[product decision]` | — |

---

## Non-functional requirements

- **[NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains)** — immutable snapshots (BR-RC03); republish versioning; no silent partial publish.
- **[NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy)** — family-scoped guardian routes.
- **[NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit)** — configuration versions, publish, schedule, failed readiness, republish reason, and downloads are auditable.

---

## Acceptance Criteria

AC-RC01 *(NFR-001 immutability)*

- [ ] Given report card is published for period P1, When staff attempts PATCH on snapshot grade value, Then API returns `409 report_card_frozen`.
- Source: NFR-001

AC-RC02 *(guardian access)*

- [ ] Given guardian A linked to student S, When guardian B requests S report card, Then API returns `404`.
- Source: NFR-002

AC-RC03 *(scheduled publish)*

- [ ] Given publish scheduled for Monday 08:00 school TZ, When guardian requests Sunday, Then period not visible; When Monday after 08:00, Then snapshot visible.
- Source: `[product decision]`

AC-RC04 *(attendance snapshot)*

- [ ] Given attendance corrected after publish, When guardian views published boletim, Then attendance summary matches publish-time snapshot.
- Source: BR-RC09

AC-RC05 *(hide discipline)*

- [ ] Given discipline D hidden by config, When boletim renders, Then discipline D absent from guardian view.
- Source: [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md)

AC-RC06 *(prerequisite blockers)*

- [ ] Given a required discipline has no successful grade launch or attendance has pending
      confirmation, When staff validates publication, Then `422 report_card_not_ready` names those
      blockers and creates no snapshot.
- Source: BR-RC05 `[product decision]`

AC-RC07 *(correction version)*

- [ ] Given grades change after version 1 is released, When authorized staff republishes with a
      reason, Then version 2 becomes active and version 1 JSON/PDF remain unchanged.
- Source: NFR-001

AC-RC08 *(atomic class batch)*

- [ ] Given a class of 20 students where one has an invalidated grade launch, when immediate or
      scheduled execution runs, then the batch fails with that blocker, releases zero new
      snapshots, and leaves every prior `active_snapshot_id` unchanged.
- Source: NFR-001 `[product decision]`

AC-RC09 *(explicit resource ids)*

- [ ] Given completed batch 501 returns publication 801 and snapshot 901, when snapshot 901 is read
      under publication 802 or display version `1` is used as `:snapshot_id`, then the API returns
      `404`; the exact 801/901 JSON and PDF routes succeed for an authorized family.
- Source: API resource identity `[product decision]`

AC-RC10 *(published event without assumed consumer)*

- [ ] Given an atomic batch releases two snapshots, when commit succeeds, then exactly two
      `ReportCardPublished` events are emitted keyed by their snapshot ids even when no
      communication consumer is configured.
- Source: NFR-001/NFR-005 `[product decision]`

AC-RC11 *(attendance formula)*

- [ ] Given the attendance totals and late policy in attendance AC-AT07, when a snapshot is
      materialized, then it stores the same denominator, numerator, counts, policy flag, and
      percentage and never recomputes them on read.
- Source: [`attendance.md`](attendance.md) BR-AT14 `[product decision]`

---

## Open items / pending decisions

- [ ] Teacher read access to published boletins before guardian release.
- [ ] Whether communication consumes `ReportCardPublished`, and if so which channel (`grades` vs
      `announcements`) and delivery policy. Event emission itself is decided and required.

---

## Out of Scope

- Official transcript (histórico) — P2 documents domain.
- NFS-e or billing on report card — billing increment 5 unrelated.
