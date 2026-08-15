# PRD — Academic: Incidents (BC7)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `academic.record_incidents`  
> Related BCs: [`communication/notifications.md`](../communication/notifications.md) *(optional notify)*  
> Modeling: *(pending — `docs/modeling/007-academic.md`)*  
> API narrative: *(pending — `docs/api/v1/academic.md`)*

---

## Objective

Define **disciplinary and pastoral incidents (ocorrências)** with typed records, staff workflow,
and configurable guardian visibility — sensitive fields follow NFR-002 LGPD care.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Record incidents | `academic.record_incidents` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) (ocorrências) |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Often pastoral/health notes; visibility strict |
| `fundamental_medio` | yes | Disciplinary + pastoral |
| `pj_financeiro` | yes | — |
| `multi_unidade` | partial | Per-school incident types |

---

## Context

Distinct from **attendance absence** (BC1) and **comms messages** (BC1 messages). Incidents may
trigger optional guardian notification via comms when `visibility: guardian` and staff publishes.

---

## Business Rules

BR-IN01

**Incident** types are school-configurable: `category` (disciplinary, pastoral, health), `severity`,
default visibility.

BR-IN02

**Visibility:** `staff_only`, `guardian`, `guardian_on_publish`. Default `staff_only` for
health/sensitive categories (NFR-002).

BR-IN03

Teachers create incidents for students in assigned classes; staff with `manage_academic` create
school-wide.

BR-IN04

Published guardian-visible incidents appear on `/me/students/:id/incidents` — family-scoped.

BR-IN05

Incident body and attachments audited on edit; no hard delete — `archived` status only.

BR-IN06

Optional `IncidentPublished` event → comms notification on `announcements` channel when staff
publishes to guardian `[product decision]`.

BR-IN07

Health/medication fields flagged `sensitive: true` for retention policy hook (LGPD open item).

---

## Use Cases

### UC-IN01 — Record incident (teacher)

Input: student_id, type, description, visibility.

Flow

1. Validate roster/assignment.
2. Create incident draft or published per visibility rules.

### UC-IN02 — Publish incident to guardian

Input: incident_id.

Flow

1. Validate staff permission.
2. Set published; emit optional event (BR-IN06).

---

## API

### POST /api/v1/schools/:school_id/incidents

### GET /api/v1/schools/:school_id/me/students/:student_id/incidents

Guardian visible only.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 404 | `not_found` | Cross-family guardian |
| 403 | `forbidden` | Teacher outside assigned class |

---

## Database

Expected entity groups: `incident_types`, `incidents`, `incident_attachments`.

---

## Events

| Event | When | Consumers |
|-------|------|-----------|
| `IncidentPublished` | Guardian publish | Communication (optional) |

---

## Permissions

| Key | create | publish | view guardian |
|-----|--------|---------|---------------|
| teacher (assigned) | yes | staff_only default | — |
| `manage_academic` | yes | yes | — |
| guardian `/me` | — | — | published only |

---

## Non-functional requirements

- **[NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy)** — sensitive fields; family isolation; retention TBD.
- **[NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit)** — edits audited.

---

## Acceptance Criteria

AC-IN01

- [ ] Given health category incident, When teacher creates record, Then default visibility is `staff_only`.
- Source: NFR-002, [`open-questions.md`](../../open-questions.md) § LGPD

AC-IN02

- [ ] Given incident not published, When guardian requests student incidents, Then incident absent from list.
- Source: BR-IN04

AC-IN03

- [ ] Given cross-family guardian, When requesting incidents, Then `404`.
- Source: NFR-002

---

## Open items / pending decisions

- [ ] Default incident type catalog vs fully custom.
- [ ] Push on publish vs in-app only.
- [ ] Retention period for disciplinary records.

---

## Out of Scope

- Daily infantil routine — P2 `academic.log_daily_routine`.
- Ticket-style two-way chat on incident — use comms service channels.
