# PRD — Academic: Report Cards (BC3)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `academic.publish_report_card`, `academic.view_report_card`, `academic.configure_report_card`  
> Related BCs: [`grades.md`](grades.md), [`attendance.md`](attendance.md), [`periods.md`](periods.md)  
> Modeling: *(pending — `docs/modeling/007-academic.md`)*  
> API narrative: *(pending — `docs/api/v1/academic.md`)*

---

## Objective

Define **report card (boletim) configuration**, **scheduled publish**, and **guardian/staff view**
with immutable publish snapshots (NFR-001) and family-scoped guardian access (NFR-002).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Publish report card | `academic.publish_report_card` | Proesc boletim release workflow — **differentiator** |
| View report card | `academic.view_report_card` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) guardian view |
| Configure report card | `academic.configure_report_card` | Proesc hide discipline or final grade rules |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | partial | Simplified layout; concept/descriptive fields |
| `fundamental_medio` | yes | Full discipline grid + frequency |
| `pj_financeiro` | yes | Same view; no payer-specific boletim |
| `multi_unidade` | partial | Per-school templates |

---

## Context

Report cards aggregate **launched grades** (grades BC), **attendance summaries** (attendance BC),
and **discipline visibility rules**. Publish creates an **immutable snapshot** per student per period.

Open: per-school template vs standard ([`open-questions.md`](../../open-questions.md) § Academic).

---

## Business Rules

BR-RC01

**Report card configuration** per school defines: visible columns, hide discipline rules,
show/hide numeric vs concept, attendance display mode, and header/footer text.

BR-RC02

**Hide discipline** rules: by `discipline_id`, by student opt-out flag, or by incomplete diary
block `[product decision]`.

BR-RC03

**Publish** creates `report_card_snapshots` rows — append-only; no in-place mutation after publish
(NFR-001). Corrections require `republish` with new snapshot version and audit reason.

BR-RC04

**Scheduled publish** accepts `publish_at` (school timezone); job materializes snapshots at time.
Guardian visibility starts at `publish_at`, not draft compute time.

BR-RC05

Pre-publish **validation** warns on missing grades or open diary items; staff may block or force
with `force_publish_reason` (audit).

BR-RC06

Guardian **view** via `/me/students/:id/report_cards` returns only linked students (NFR-002).
Staff views school-scoped with permission keys.

BR-RC07

Student portal (P2) reuses same snapshot API with student auth.

BR-RC08

`ReportCardPublished` event triggers comms notification on `grades` or `announcements` channel
`[product decision]`.

BR-RC09

Snapshots include `attendance_summary` computed from attendance BC at publish time — later
attendance edits do not alter published boletim.

BR-RC10

PDF generation async job; guardian downloads token-scoped URL with expiry.

---

## Use Cases

### UC-RC01 — Configure report card display (coordination)

Input: layout options, hide rules, template id.

Flow

1. Validate `manage_academic`.
2. Upsert configuration (BR-RC01, BR-RC02).

### UC-RC02 — Publish report cards (period)

Input: `class_id` or school-wide, `academic_period_id`, optional schedule, force flag.

Flow

1. Compute draft snapshots from launched grades + attendance (BR-RC09).
2. Run validation (BR-RC05).
3. On publish, write immutable snapshots (BR-RC03).
4. Emit `ReportCardPublished` (BR-RC08).

### UC-RC03 — View report card (guardian)

Input: `student_id`, `academic_period_id`.

Flow

1. Verify guardian link.
2. Return latest published snapshot for period if `publish_at <= now`.

---

## API

### GET /api/v1/schools/:school_id/me/students/:student_id/report_cards

Guardian list published periods.

### GET /api/v1/schools/:school_id/me/students/:student_id/report_cards/:period_id

Snapshot JSON + PDF link.

### POST /api/v1/schools/:school_id/report_card_publish

Schedule or immediate publish.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 404 | `not_found` | Unpublished period or cross-family |
| 409 | `report_card_frozen` | Mutation on published snapshot |
| 422 | `validation_failed` | Missing grades without force |

---

## Database

Expected entity groups: `report_card_configs`, `report_card_snapshots`, `report_card_publish_jobs`.

---

## Events

| Event | When | Consumers |
|-------|------|-----------|
| `ReportCardPublished` | Snapshot materialized | Communication notifications |
| `ReportCardRepublished` | Correction version | Communication (optional) |

---

## Permissions

| Key | configure | publish | view (staff) | view (guardian) |
|-----|-----------|---------|--------------|-----------------|
| `manage_academic` | yes | yes | yes | — |
| guardian `/me` | — | — | — | linked students |
| teacher | — | — | assigned classes read `[product decision]` | — |

---

## Non-functional requirements

- **[NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains)** — immutable snapshots (BR-RC03); republish versioning; no silent partial publish.
- **[NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy)** — family-scoped guardian routes.

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

---

## Open items / pending decisions

- [ ] Standard vs per-school PDF template engine.
- [ ] Teacher read access to published boletins before guardian release.
- [ ] Notification channel for publish (`grades` vs `announcements`).

---

## Out of Scope

- Official transcript (histórico) — P2 documents domain.
- NFS-e or billing on report card — billing increment 5 unrelated.
