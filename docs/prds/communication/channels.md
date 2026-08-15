# PRD — Communication: Channels (BC2)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `communication.manage_communication_groups`, `communication.assign_recipients_to_channel`, `communication.manage_service_channel`, `communication.open_support_ticket`, `communication.collect_channel_csat`, `communication.track_service_inbox`, `communication.manage_channel_permissions`, `communication.escalate_to_human_support`  
> Related BCs: [`messages.md`](messages.md), [`notifications.md`](notifications.md)  
> Modeling: *(pending — `docs/modeling/006-communication.md`)*  
> API narrative: *(pending — `docs/api/v1/communication.md`)*

---

## Objective

Define the **channel model** — groups, service channels, tickets, CSAT, and staff inbox — per
[`DIV-communication-002`](../../ref/divergencias.md), with family-scoped ticket visibility and
human escalation path ([`DIV-communication-006`](../../ref/divergencias.md); AI deferred).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Manage communication groups | `communication.manage_communication_groups` | [`DIV-communication-001`](../../ref/divergencias.md), [`classapp/comunicacao/modelo-de-dominio.md`](../../ref/classapp/comunicacao/modelo-de-dominio.md) |
| Assign recipients to channel | `communication.assign_recipients_to_channel` | ClassApp channel membership |
| Manage service channel | `communication.manage_service_channel` | [`DIV-communication-002`](../../ref/divergencias.md), ClassApp + Agenda Edu canais |
| Open support ticket | `communication.open_support_ticket` | Proesc atendimento, Agenda Edu tickets |
| Collect CSAT | `communication.collect_channel_csat` | [`classapp/comunicacao/funcionalidades-por-ator.md`](../../ref/classapp/comunicacao/funcionalidades-por-ator.md) CSAT article |
| Track service inbox | `communication.track_service_inbox` | Agenda Edu staff inbox |
| Manage channel permissions | `communication.manage_channel_permissions` | ClassApp revoke staff channel access |
| Escalate to human support | `communication.escalate_to_human_support` | [`DIV-communication-006`](../../ref/divergencias.md) — Proesc Lia pattern without AI in MVP |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Secretaria channels for enrollment questions |
| `fundamental_medio` | yes | Coordination + secretariat service channels |
| `pj_financeiro` | partial | Finance questions may use billing surfaces; comms channel optional |
| `multi_unidade` | partial | Channels per school; no cross-unit inbox in MVP |

---

## Context

ClassApp distinguishes **canal de atendimento** (service) from **grupo** and **conversa
individual** ([`classapp/comunicacao/casos-de-borda.md`](../../ref/classapp/comunicacao/casos-de-borda.md) —
channel type choice affects CSAT). Agenda Edu documents **canais de atendimento** with status
and satisfaction surveys.

School Lab models three **channel kinds**:

| Kind | Purpose | CSAT |
|------|---------|------|
| `broadcast_group` | Staff → many guardians (not mass school — see announcements BC) | no |
| `service` | Guardian ↔ school ticket with status/SLA | yes |
| `internal` | Staff-only coordination | no |

**AI out of scope:** Proesc **Lia** routes to human staff — MVP implements human-only ticket
queue; `communication.defer_ai_assistant` is N/A in taxonomy.

---

## Business Rules

BR-C01

A **channel** belongs to one `school_id`, has `channel_kind`, display name, optional description,
and optional `sla_response_hours` for service channels.

BR-C02

**Service channel** tickets are threads with `ticket_status`: `open`, `pending_guardian`,
`pending_staff`, `resolved`, `closed`. Reopen allowed from `closed` within 7 days
`[product decision]`.

BR-C03

Each ticket is **family-scoped**: one guardian initiator, linked `student_id` required,
visible to guardians sharing that student link only (NFR-002). Staff with channel access see
school-wide queue.

BR-C04

**CSAT** prompt fires once when ticket transitions to `resolved` (guardian confirms or auto-close
after 72h). Score 1–5 + optional comment. Aggregate per channel for staff dashboard — no public
leaderboard ([`DIV-communication-005`](../../ref/divergencias.md)).

BR-C05

**Channel staff roster** lists staff user ids with `channel_role`: `agent`, `supervisor`.
Revoking access removes future assignments; does not delete historical messages (BR-C07).

BR-C06

**Recipient assignment** on `broadcast_group` channels uses rules: `all_school`, `class_ids[]`,
`segment_id`, or explicit guardian ids — resolved from students enrollments at send time and on
membership sync events (same as messages UC-M04).

BR-C07

Transforming channel type after creation is **disallowed** — create new channel instead
(ClassApp edge case — [`classapp/comunicacao/casos-de-borda.md`](../../ref/classapp/comunicacao/casos-de-borda.md)).

BR-C08

**Escalation:** staff may reassign ticket to another agent or mark `escalated_to` supervisor.
No automatic AI bot step. Optional SLA breach flag when `sla_response_hours` exceeded without
staff reply `[product decision]` — open item in [`open-questions.md`](../../open-questions.md).

BR-C09

Staff **service inbox** sorts by `last_activity_at`, filters by status, channel, and SLA breach.
Not real-time — refresh on push or poll ([`DIV-communication-007`](../../ref/divergencias.md)).

---

## Use Cases

### UC-C01 — Create service channel

Input: name, description, `sla_response_hours`, initial agent staff ids, optional CSAT enabled.

Flow

1. Validate `manage_communication`.
2. Create channel + staff roster (BR-C01, BR-C05).
3. Audit creation.

### UC-C02 — Open support ticket (guardian)

Input: `channel_id`, `student_id`, subject, body, attachment ids.

Flow

1. Validate guardian linked to `student_id` (BR-C03).
2. Create service thread + first message; status `open`.
3. Assign round-robin agent from roster or leave unassigned for inbox pickup.
4. Emit `TicketOpened` → notifications BC.

### UC-C03 — Staff reply and status transition

Input: `ticket_id`, body, optional target status.

Flow

1. Validate channel access (BR-C05).
2. Post message; update status per transition rules (BR-C02).
3. Emit `TicketUpdated`.

### UC-C04 — Resolve ticket and collect CSAT

Input: `ticket_id`, resolution note.

Flow

1. Staff or guardian sets `resolved`.
2. Prompt guardian CSAT (BR-C04); store score linked to ticket.
3. Auto-`closed` after CSAT or timeout.

### UC-C05 — Revoke staff channel access

Input: `channel_id`, `staff_user_id`.

Flow

1. Validate `manage_communication`.
2. Remove from roster (BR-C05); audit.

### UC-C06 — Escalate ticket

Input: `ticket_id`, `escalated_to_staff_id`, reason.

Flow

1. Reassign or flag escalation (BR-C08).
2. Notify supervisor via notifications BC.

---

## API

### POST /api/v1/schools/:school_id/communication/channels

Create channel (staff).

### POST /api/v1/schools/:school_id/communication/channels/:id/tickets

Guardian opens ticket (body includes `student_id`).

### GET /api/v1/schools/:school_id/communication/service-inbox

Staff queue with filters (`status`, `sla_breached`, `channel_id`).

### POST /api/v1/schools/:school_id/me/communication/tickets/:id/csat

Guardian submits CSAT after resolution.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `forbidden` | Staff not on channel roster |
| 404 | `not_found` | Ticket outside guardian family scope |
| 409 | `channel_kind_locked` | Attempt to change channel kind (BR-C07) |
| 422 | `student_required` | Service ticket without `student_id` |

---

## Database

| Entity group | Purpose |
|--------------|---------|
| `communication_channels` | Kind, SLA, CSAT settings |
| `communication_channel_staff` | Roster and roles |
| `communication_channel_recipient_rules` | Assignment rules for broadcast groups |
| `communication_tickets` | Status, student, assignee, escalation |
| `communication_ticket_csat` | Score, comment, submitted_at |

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `TicketOpened` | UC-C02 | Notifications BC, service inbox |
| `TicketUpdated` | UC-C03 | Notifications BC |
| `TicketResolved` | UC-C04 | CSAT prompt, notifications |
| `ChannelStaffChanged` | UC-C05 | Audit |

---

## Permissions

| Action | Permission key |
|--------|----------------|
| Create/configure channels | `manage_communication` |
| Reply on service channel | channel roster OR `manage_communication` |
| Open ticket (guardian) | membership + family scope |
| Submit CSAT | ticket participant guardian |
| View service inbox | `manage_communication` or channel agent |

---

## Non-functional requirements

- [NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy) — ticket family isolation.
- [NFR-004](../../product/non-functional-requirements.md#nfr-004--push-notifications) — ticket updates respect push policy.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — status changes, escalation, CSAT audited.

---

## Acceptance Criteria

AC-C01

- [ ] Given guardian linked to student S  
      When they open ticket on secretariat channel with student_id S  
      Then ticket appears in staff service inbox and not visible to unrelated guardians  
- Source: [`DIV-communication-002`](../../ref/divergencias.md), NFR-002

AC-C02

- [ ] Given ticket resolved  
      When guardian submits CSAT score 4  
      Then aggregate channel CSAT updates and ticket moves to closed  
- Source: [`classapp/comunicacao/funcionalidades-por-ator.md`](../../ref/classapp/comunicacao/funcionalidades-por-ator.md)

AC-C03

- [ ] Given staff removed from channel roster  
      When they attempt to reply on new ticket  
      Then API returns 403  
- Source: ClassApp revoke channel access pattern

AC-C04

- [ ] Given SLA 24h and no staff reply in 25h  
      When staff opens service inbox with sla_breached filter  
      Then ticket appears in breached list  
- Source: `[product decision]` — BR-C08

AC-C05

- [ ] Given ticket escalation to supervisor  
      When supervisor is notified  
      Then notification uses push policy for service channel (not AI bot)  
- Source: [`DIV-communication-006`](../../ref/divergencias.md)

---

## Open items / pending decisions

- [ ] Round-robin vs manual pickup for unassigned tickets.
- [ ] Auto-close resolved tickets without CSAT — timeout duration.
- [ ] SLA breach notifications to coordination.
- [ ] Whether finance channel is separate product surface or comms channel template.

---

## Out of Scope

- AI virtual assistant (`communication.defer_ai_assistant`) — N/A.
- DM and class group threads — [`messages.md`](messages.md).
- Mass school announcements — P2 [`announcements.md`](announcements.md).
- Emergency alert broadcast — blocked (`communication.manage_emergency_contacts`).
