# PRD — Communication: Messages (BC1)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `communication.send_direct_message`, `communication.send_group_message`, `communication.manage_message_inbox`, `communication.edit_message_content`, `communication.schedule_message_delivery`, `communication.manage_communication_operations`  
> Related BCs: [`channels.md`](channels.md), [`media.md`](media.md), [`notifications.md`](notifications.md)  
> Modeling: *(pending — `docs/modeling/006-communication.md`)*  
> API narrative: *(pending — `docs/api/v1/communication.md`)*

---

## Objective

Define **direct and group messaging** — thread model, inbox, edit audit, scheduled delivery —
as the core two-way parent↔teacher and parent↔school channel ([`DIV-communication-001`](../../ref/divergencias.md)),
with per-family isolation and school-scoped recipient resolution from students domain.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Send direct message | `communication.send_direct_message` | [`proesc/comunicacao/funcionalidades-por-ator.md`](../../ref/proesc/comunicacao/funcionalidades-por-ator.md) (recados), [`agenda-edu/comunicacao/funcionalidades-por-ator.md`](../../ref/agenda-edu/comunicacao/funcionalidades-por-ator.md), [`classapp/comunicacao/funcionalidades-por-ator.md`](../../ref/classapp/comunicacao/funcionalidades-por-ator.md) |
| Send group message | `communication.send_group_message` | [`DIV-communication-001`](../../ref/divergencias.md), ClassApp group threads |
| Manage message inbox | `communication.manage_message_inbox` | Agenda Edu inbox; ClassApp conversation list |
| Edit message content | `communication.edit_message_content` | Agenda Edu, ClassApp — edit history visible |
| Schedule message delivery | `communication.schedule_message_delivery` | ClassApp deferred send |
| General operations | `communication.manage_communication_operations` | Catch-all for edge flows pending finer split |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Guardian-primary; teachers send photo-heavy group updates |
| `fundamental_medio` | yes | Class group threads primary pattern |
| `pj_financeiro` | yes | No segment-specific message rules |
| `multi_unidade` | partial | Threads scoped per `school_id` |

---

## Context

Competitors combine **recados** (async messages), **chat** UI, and **canais** (service) in one
inbox ([`classapp/comunicacao/modelo-de-dominio.md`](../../ref/classapp/comunicacao/modelo-de-dominio.md)).
School Lab separates **BC1 messages** (peer/group threads) from **BC2 service channels**
(tickets/CSAT) but presents a unified inbox in clients (layer PRD).

**Dependencies**

- Students: active enrollment → class membership for group expansion (UC-M04).
- Identity: `send_messages` permission; guardian membership for `/me` routes.
- Channels BC: `thread_kind` distinguishes DM, `class_group`, and `service` origins.

**Not real-time:** clients poll or refresh on push tap; no WebSocket/Solid Cable in MVP
([`open-questions.md`](../../open-questions.md)).

---

## Business Rules

BR-M01

A **thread** is school-scoped (`school_id`) and has `thread_kind`: `direct`, `class_group`, or
`internal_staff`. Service ticket threads are owned by channels BC but appear in the same inbox API.

BR-M02

**Direct threads** connect exactly one guardian-side participant set (one or more guardians linked
to the same student context) with one staff/teacher participant set. Duplicate DM for the same
guardian+staff+student tuple reopens existing thread rather than creating parallel threads
`[product decision]`.

BR-M03

**Class group threads** address all guardians of actively enrolled students in a `class_id` plus
assigned teachers. Membership refreshes on `EnrollmentCreated`, `EnrollmentClassChanged`, and
`ClassStructureChanged` events from students domain.

BR-M04

Guardians never see messages for students they are not linked to via `student_guardians` (NFR-002).
Staff listing threads sees school-wide scope per permission keys.

BR-M05

Teachers may send to classes they are assigned to; staff with `manage_communication` may send to
any class in school. Cross-class guardian DMs require explicit staff initiation or guardian reply
to an existing thread.

BR-M06

**Message edits** append an `message_edits` audit row with prior body, editor, timestamp.
Recipients see "edited" indicator and may view history. No silent in-place overwrite.

BR-M07

**Scheduled send** stores `scheduled_at` (school timezone); job publishes at or after that time.
Cancel before publish allowed by author or `manage_communication`. Past-due schedules send on next
job tick (NFR-001 idempotence on publish job).

BR-M08

Inbox supports per-user **read state**, **archive**, and **soft delete** (user-scoped visibilities,
not hard delete of school record). Bulk archive allowed. Hard delete of message content is staff-only
with audit and retention policy hook (LGPD open item).

BR-M09

**Audio attachments** are rejected in MVP (`422 unsupported_media_type`) — Jul 2026 decision
([`vision.md`](../../vision.md) §6).

BR-M10

New message on thread emits notification intent to BC4 per push policy — comms does not push
directly from controller.

---

## Use Cases

### UC-M01 — Send direct message

Input: `recipient_staff_id` or `recipient_guardian_id`, optional `student_id`, body, attachment ids.

Flow

1. Resolve or create direct thread (BR-M02).
2. Validate sender permission and family scope (BR-M04, BR-M05).
3. Persist message; attach media refs from media BC.
4. Emit `MessagePosted` → notifications BC.
5. Return thread + message payload.

### UC-M02 — Send class group message

Input: `class_id`, body, optional `student_id` filter subset, attachment ids.

Flow

1. Expand recipients from active enrollments (BR-M03).
2. Validate teacher class assignment or staff `manage_communication`.
3. Resolve or create `class_group` thread.
4. Persist message; emit `MessagePosted`.

### UC-M03 — Manage inbox (read / archive / delete)

Input: `thread_id`, action (`mark_read`, `archive`, `delete`).

Flow

1. Load thread scoped to actor (guardian family or staff permission).
2. Update per-user inbox state (BR-M08).
3. Audit bulk archive when >50 threads `[product decision]`.

### UC-M04 — Sync group membership from enrollment event

Input: domain event payload (`EnrollmentCreated`, etc.).

Flow

1. For each `class_group` thread tied to `class_id`, recompute guardian participant set.
2. Add/remove participants without deleting message history.
3. Log membership diff for audit (NFR-005).

### UC-M05 — Edit message

Input: `message_id`, new body.

Flow

1. Author within edit window (school setting, default 24h) or staff with `moderate_communication`.
2. Append edit history (BR-M06).
3. Emit `MessageEdited` → optional re-notify per policy.

### UC-M06 — Schedule message

Input: same as UC-M01/UC-M02 plus `scheduled_at`.

Flow

1. Create message in `scheduled` state (BR-M07).
2. Job at `scheduled_at` transitions to `posted` and emits `MessagePosted`.

---

## API

Representative endpoints — full contract in API narrative when written.

### POST /api/v1/schools/:school_id/communication/threads/:id/messages

Request

```json
{
  "body": "Olá, segue orientação sobre a excursão.",
  "attachment_ids": ["uuid-1"],
  "scheduled_at": null
}
```

Response 201

```json
{
  "id": "msg_uuid",
  "thread_id": "thread_uuid",
  "body": "Olá, segue orientação sobre a excursão.",
  "posted_at": "2026-08-15T14:00:00Z",
  "edit_count": 0
}
```

### GET /api/v1/schools/:school_id/me/communication/inbox

Guardian-scoped list; optional `student_id` filter for multi-child context.

### PATCH /api/v1/schools/:school_id/communication/messages/:id

Edit body — returns updated message with `edit_count` incremented.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `forbidden` | Actor cannot send to this class/recipient |
| 404 | `not_found` | Thread or student outside family scope (guardian) |
| 409 | `thread_archived` | Cannot post to archived thread without reopen |
| 422 | `unsupported_media_type` | Audio rejected (BR-M09) |
| 422 | `invalid_schedule` | `scheduled_at` in the past beyond grace window |

---

## Database

| Entity group | Purpose |
|--------------|---------|
| `communication_threads` | Thread metadata, kind, class/student refs |
| `communication_thread_participants` | User/staff/guardian participation, inbox state |
| `communication_messages` | Body, status (`posted`, `scheduled`), author |
| `communication_message_edits` | Edit history |
| `communication_message_attachments` | FK to media assets |

| Artifact | Location |
|----------|----------|
| Narrative DSL | `docs/modeling/006-communication.md` *(pending)* |
| DBML | `docs/database/database_dml.md` |

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `MessagePosted` | UC-M01, UC-M02, schedule publish | Notifications BC (push/email/WhatsApp), audit |
| `MessageEdited` | UC-M05 | Notifications BC (optional), audit |
| `ThreadMembershipChanged` | UC-M04 | Audit |

**Consumed from students domain:**

| Event | Handler |
|-------|---------|
| `EnrollmentCreated` | UC-M04 — add guardian to class group threads |
| `EnrollmentClassChanged` | UC-M04 — move guardian between class threads |
| `ClassStructureChanged` | UC-M04 — refresh thread metadata |
| `GuardianLinkChanged` | UC-M04 — add/remove guardian participants |

---

## Permissions

| Action | Permission key |
|--------|----------------|
| Send DM / group message | `send_messages` |
| Edit own message (window) | `send_messages` |
| Edit any message / moderation | `moderate_communication` |
| Archive/delete for others | `manage_communication` |
| Guardian inbox | membership + family scope (no key) |

Default system templates: `teacher` includes `send_messages`; `secretary`, `director` include
`manage_communication` ([`identity-and-onboarding/permissions.md`](../identity-and-onboarding/permissions.md)).

---

## Non-functional requirements

- [NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy) — family isolation on `/me` inbox and thread detail.
- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — all queries scoped by `school_id`.
- [NFR-004](../../product/non-functional-requirements.md#nfr-004--push-notifications) — `MessagePosted` enqueues notification job; no controller push.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — edits and moderation audited.
- [NFR-006](../../product/non-functional-requirements.md#nfr-006--availability-and-performance-baseline) — not real-time; poll/refresh acceptable.

**Academic handoff:** this BC does not emit absence notifications. When academic emits
`AbsenceRecorded` (increment 4), notifications BC handles delivery — reliability rules in
academic PRD cite [NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains) only.

---

## Acceptance Criteria

AC-M01

- [ ] Given guardian A linked to student S in class C  
      When teacher sends class group message to C  
      Then guardian A sees message in inbox and guardian B (not linked to S) does not  
- Source: [`DIV-communication-001`](../../ref/divergencias.md), NFR-002

AC-M02

- [ ] Given an existing DM thread between guardian and teacher for student S  
      When guardian sends another DM to same teacher for S  
      Then message appends to existing thread  
- Source: `[product decision]` — BR-M02

AC-M03

- [ ] Given teacher edits message within edit window  
      When guardian opens thread  
      Then edited indicator and history entry are visible  
- Source: [`agenda-edu/comunicacao/funcionalidades-por-ator.md`](../../ref/agenda-edu/comunicacao/funcionalidades-por-ator.md)

AC-M04

- [ ] Given student moves from class C1 to C2 via enrollment update  
      When `EnrollmentClassChanged` fires  
      Then guardian is removed from C1 group thread and added to C2 group thread  
- Source: [`students-and-enrollments/enrollments.md`](../students-and-enrollments/enrollments.md) Events

AC-M05

- [ ] Given message with audio attachment  
      When POST messages  
      Then API returns 422 `unsupported_media_type`  
- Source: [`vision.md`](../../vision.md) §6 — BR-M09

AC-M06

- [ ] Given scheduled message with future `scheduled_at`  
      When time passes and job runs  
      Then message becomes visible to participants exactly once  
- Source: [`classapp/comunicacao/funcionalidades-por-ator.md`](../../ref/classapp/comunicacao/funcionalidades-por-ator.md), NFR-001 idempotence

---

## Open items / pending decisions

- [ ] Edit window duration (24h default vs school setting).
- [ ] Whether guardians can initiate DM to any teacher or only assigned class teachers.
- [ ] Unified inbox UX merging service tickets — layer SPA PRD.
- [ ] Thread reopen rules after archive.

---

## Out of Scope

- Service channel tickets — [`channels.md`](channels.md).
- Announcements/comunicados — [`announcements.md`](announcements.md).
- Push/email delivery — [`notifications.md`](notifications.md).
- Attachment upload/storage — [`media.md`](media.md).
- Read receipts — P2.
- Real-time typing indicators — phase 2.
