# PRD — Academic: Incidents (BC7)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `academic.record_incidents`  
> Related BCs: [`communication/notifications.md`](../communication/notifications.md) *(optional notify)*  
> Modeling: [`007-academic.md`](../../modeling/007-academic.md) § Incidents (BC7)  
> API narrative: [`academic.md`](../../api/v1/academic.md) § Incidents

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

Surfaced in the product menu as **"Ata"** (the stakeholder's own label for "something that
happened at school" — [`main-menu-description.md`](../../main-menu-description.md)). The product
owner confirmed (2026-10-02) an approval gate on top of BR-IN02/BR-IN03: an incident needs sign-off
from **both** a `coordination` role-template membership and a `director` role-template membership
(role templates per [`identity-and-onboarding/permissions.md`](../identity-and-onboarding/permissions.md)
§ Appendix — `manage_academic` alone does not distinguish the two, since both templates hold it) —
see BR-IN08.

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

BR-IN08

An incident requires **two separate approvals** before `status: approved` — one from a membership
whose `role_template.system_key == "coordination"`, one from `"director"` — tracked as two
distinct fields (`coordination_approved_at`/`coordination_approved_by_membership_id` and
`director_approved_at`/`director_approved_by_membership_id`), not a single generic approval. Either
may arrive first; the incident is `approved` only once both are present. `manage_academic` alone
does not satisfy either slot — the approving membership's role template must specifically be
`coordination` or `director`. An incident with either slot still empty is `pending_approval`. This
gate is independent of BR-IN02's guardian-visibility publish step — an incident can be published to
guardians (or stay `staff_only`) regardless of its approval state; approval is an internal
sign-off, not a guardian-facing state `[product decision]`.

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

### UC-IN03 — Approve incident (coordination or director)

Input: incident_id.

Flow

1. Validate the approving membership's `role_template.system_key` is `coordination` or `director`
   (BR-IN08) — `403` otherwise, even for `manage_academic` staff without that specific template.
2. Record that slot's `*_approved_at`/`*_approved_by_membership_id`; re-approving the same slot is
   idempotent (no second row, no error).
3. Once both slots are present, incident status becomes `approved`.

---

## API

### POST /api/v1/schools/:school_id/incidents

### GET /api/v1/schools/:school_id/me/students/:student_id/incidents

Guardian visible only.

### POST /api/v1/schools/:school_id/incidents/:id/approve

UC-IN03 — fills whichever of the two approval slots (BR-IN08) matches the requester's role
template.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 404 | `not_found` | Cross-family guardian |
| 403 | `forbidden` | Teacher outside assigned class; approver without a `coordination`/`director` role template (BR-IN08) |

---

## Database

Expected entity groups: `incident_types`, `incidents` (carries the two BR-IN08 approval slots
directly — no separate approvals table, since there are always exactly two fixed slots, not an
arbitrary list), `incident_attachments`.

---

## Events

| Event | When | Consumers |
|-------|------|-----------|
| `IncidentPublished` | Guardian publish | Communication (optional) |

---

## Permissions

| Key | create | publish | view guardian | approve (BR-IN08) |
|-----|--------|---------|----------------|--------------------|
| teacher (assigned) | yes | staff_only default | — | — |
| `manage_academic` | yes | yes | — | only if also `coordination`/`director` templated |
| role template `coordination` | — | — | — | fills coordination slot |
| role template `director` | — | — | — | fills director slot |
| guardian `/me` | — | — | published only | — |

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

AC-IN04 *(two-slot approval)*

- [ ] Given an incident with neither slot filled, When a `coordination`-templated membership
      approves, Then status is `pending_approval` (not `approved`) with only the coordination slot
      set; When a `director`-templated membership then approves, Then status becomes `approved`
      with both slots set.
- Source: BR-IN08

AC-IN05

- [ ] Given a `manage_academic` staff member whose role template is neither `coordination` nor
      `director`, When they call the approve endpoint, Then the API returns `403`.
- Source: BR-IN08

---

## Open items / pending decisions

- [ ] Default incident type catalog vs fully custom.
- [ ] Push on publish vs in-app only.
- [ ] Retention period for disciplinary records.

---

## Out of Scope

- Daily infantil routine — P2 `academic.log_daily_routine`.
- Ticket-style two-way chat on incident — use comms service channels.
