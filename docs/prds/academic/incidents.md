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

BR-IN09

On incident **creation**, the staff who still need to act on the BR-IN08 approval gate are notified
via the existing comms notification pipeline (`NotificationIntent` → `ProcessIntentService`, per
[`communication/notifications.md`](../communication/notifications.md)) — mandatory, not the
optional BR-IN06 guardian notice:

- Creator is a **teacher** → notify **all** `coordination`- and `director`-templated staff
  memberships (neither slot can have been filled by the creator, since teachers hold neither
  template).
- Creator is a **`coordination`-templated** membership → notify `director`-templated staff only.
- Creator is a **`director`-templated** membership → notify `coordination`-templated staff only.
- **Teachers are never notification targets**, regardless of who created the incident.

This notification is informational only — it does not fill either BR-IN08 approval slot and does
not change `status`. A staff member who creates the incident still must separately call
`POST .../approve` to fill their own slot if their role template qualifies; creating does not imply
approving `[product decision]`.

BR-IN10 *(coordination list filter — confirmed 2026-10-04)*

`GET /incidents` already returns every school incident for `manage_academic` staff and only the
teacher's own for a `teacher`-role membership (BR-IN03's `policy_scope`, unchanged). This adds a
`reported_by_membership_id` filter param on top of that scope so `manage_academic` staff can narrow
the already-schoolwide list to one author — including their own `membership_id` as a "minhas atas"
shortcut — without changing who is authorized to see what. For a `teacher`-role requester the param
has no effect: their result is already their own incidents only, same defensive pattern as
`lesson-plans.md`'s `teacher_id` filter (a filter narrows what an already-authorized caller sees; it
never widens or substitutes for `policy_scope`).

BR-IN11 *(guardian snapshot on the ata — confirmed 2026-10-04)*

When creating (or editing, per BR-IN05) an incident, the creator may search for the student by the
student's own name, **or** by a linked guardian's name (father/mother/other) — guardian name search
resolves to that guardian's children, to find the right student when only a parent's name is known
(reuses the existing guardian search used elsewhere, e.g. the billing payer picker). Selecting a
student pre-fills the set of guardians to record on the incident from that student's *current*
`student_guardians` (father + mother + any `other` rows); the creator may add or remove individual
guardians from that set before saving (e.g. add a non-default `other` guardian found via search, or
drop one who should not be named in this particular ata).

The selected set is **snapshotted** onto the incident as `incident_guardians` — one row per
guardian, capturing `guardian_id` (nullable: a later guardian deletion nullifies rather than
cascades) plus a **denormalized `name` and `relationship`** taken at save time — not derived live
from the student's `student_guardians` the way `IncidentBlueprint#guardian_names` does today. Once
saved, an incident's recorded guardians do not change if the family's guardian links are edited or
removed later; the ata is the historical record of who was on file for that incident
`[product decision]` — coordination needs the printed/PDF ata to keep showing the same names it
showed on the day it was recorded, not whoever is currently linked to the student.

Existing incidents created before this rule shipped have no `incident_guardians` rows; a one-time
migration backfills each from that incident's student's `student_guardians` *at migration time*, so
already-recorded atas are not left without guardian names. This backfill is itself a snapshot (it
freezes whatever was linked at migration time) — it is not kept in sync afterward, same as every
other incident's `incident_guardians`.

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

### UC-IN04 — Notify staff on incident creation (BR-IN09)

Input: incident_id, creating membership.

Flow

1. Determine the creating membership's role template (`teacher`, `coordination`, `director`, or
   other `manage_academic` staff without either template).
2. Resolve notification targets: both templates if creator is a teacher (or untemplated
   `manage_academic` staff), the other template only if creator is `coordination`- or
   `director`-templated.
3. Emit `IncidentCreated` → `NotificationIntent` fan-out to resolved targets. Never includes
   teacher memberships as targets.

### UC-IN05 — List a school's incidents, filtered by author (coordination)

Input: optional `reported_by_membership_id` (plus existing filters, e.g. `student_id`).

Flow

1. `manage_academic` staff reads across every incident in the school (BR-IN03's existing scope,
   unchanged).
2. If `reported_by_membership_id` is present, narrow to that author — the requester's own
   `membership_id` is the "minhas atas" case, any other staff/teacher membership id shows that
   person's atas (BR-IN10).
3. For a `teacher`-role requester, `reported_by_membership_id` is accepted but has no effect — their
   result is already scoped to their own incidents only.

### UC-IN06 — Search by guardian or student name when recording an incident (BR-IN11)

Input: free-text search term (matched against student names and/or guardian names), then a chosen
`student_id` and a set of `guardian_id`s to record.

Flow

1. Search resolves candidates by student name directly, or by guardian name → that guardian's
   children (reuses the existing guardian/student search endpoints — no new search endpoint).
2. On picking a student, pre-fill the guardian set from that student's current `student_guardians`
   (father, mother, any `other`); the creator may add/remove individual guardians from this set
   before saving.
3. On save, persist the chosen set as `incident_guardians` rows (`guardian_id` + snapshotted `name`
   + `relationship`) — a point-in-time record, not a live association (BR-IN11).

---

## API

### GET /api/v1/schools/:school_id/incidents?student_id=&reported_by_membership_id=

UC-IN05 — existing list, `reported_by_membership_id` is the new filter (BR-IN10); scope unchanged.

### POST /api/v1/schools/:school_id/incidents

Request now also accepts `guardian_ids: [...]` (UC-IN06, BR-IN11) — the set of guardians to
snapshot as `incident_guardians`; omitted means "use the student's current guardians at save time"
(the same default the form pre-fills, so a client that never touches the field still gets sane
behavior).

### PATCH /api/v1/schools/:school_id/incidents/:id

Same `guardian_ids` handling as create, per BR-IN05's "audited on edit" — editing an incident may
also re-snapshot its guardians (replaces the prior `incident_guardians` set, does not merge).

### GET /api/v1/schools/:school_id/me/students/:student_id/incidents

Guardian visible only.

### POST /api/v1/schools/:school_id/incidents/:id/approve

UC-IN03 — fills whichever of the two approval slots (BR-IN08) matches the requester's role
template.

No new search endpoint for UC-IN06 — reuses the existing guardian search
(`GET /api/v1/schools/:school_id/people/guardians?q=`) and student search
(`GET /api/v1/schools/:school_id/people/students?q=&guardian_id=`) already used elsewhere (e.g. the
billing payer picker, the incident form's own student field).

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
arbitrary list), `incident_attachments`, `incident_guardians` *(new, BR-IN11 — one row per guardian
snapshotted on an incident: nullable `guardian_id` FK (nullify on guardian destroy), denormalized
`name`, denormalized `relationship`, `incident_id` FK)*.

---

## Events

| Event | When | Consumers |
|-------|------|-----------|
| `IncidentPublished` | Guardian publish | Communication (optional) |
| `IncidentCreated` | Incident created | `coordination`/`director`-templated staff per BR-IN09 (mandatory, never teachers) |

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

AC-IN06 *(creation notification)*

- [ ] Given a teacher creates an incident, When the incident is saved, Then both `coordination`-
      and `director`-templated staff memberships receive a notification and no teacher membership
      does.
- [ ] Given a `coordination`-templated membership creates an incident, When the incident is saved,
      Then only `director`-templated staff are notified (not the creator, not teachers).
- [ ] Given a `director`-templated membership creates an incident, When the incident is saved, Then
      only `coordination`-templated staff are notified (not the creator, not teachers).
- Source: BR-IN09

AC-IN07 *(coordination list filter)*

- [ ] Given a `manage_academic` staff member, When they list incidents with
      `reported_by_membership_id` set to their own membership, Then only incidents they personally
      created are returned.
- [ ] Given the same staff member, When they set `reported_by_membership_id` to another staff or
      teacher membership, Then only that person's incidents are returned.
- [ ] Given a `teacher`-role requester, When they list incidents with any
      `reported_by_membership_id` value, Then the result is unchanged from their normal
      teacher-scoped list (the filter has no effect — BR-IN10).
- Source: BR-IN10

AC-IN08 *(guardian snapshot)*

- [ ] Given a student with a mother and father on file, When staff creates an incident for that
      student without touching the guardian field, Then `incident_guardians` is saved with both,
      each with `name`/`relationship` matching the student's `student_guardians` at that moment.
- [ ] Given staff searches by a guardian's name instead of the student's name, When a matching
      guardian is selected, Then the student picker narrows to that guardian's children.
- [ ] Given an incident already saved with its guardian snapshot, When the family's
      `student_guardians` links later change (e.g. a guardian is removed or reassigned), Then the
      incident's `incident_guardians` rows and displayed names are unchanged.
- [ ] Given incidents that existed before this feature shipped, When the backfill migration runs,
      Then each gets `incident_guardians` rows matching its student's `student_guardians` as they
      stood at migration time.
- Source: BR-IN11

---

## Open items / pending decisions

- [ ] Default incident type catalog vs fully custom.
- [ ] Push on publish vs in-app only.
- [ ] Retention period for disciplinary records.

---

## Out of Scope

- Daily infantil routine — P2 `academic.log_daily_routine`.
- Ticket-style two-way chat on incident — use comms service channels.
