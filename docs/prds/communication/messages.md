# PRD — Communication: Messages (BC1)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `communication.send_direct_message`, `communication.send_group_message`, `communication.manage_message_inbox`, `communication.edit_message_content`, `communication.schedule_message_delivery`, `communication.manage_communication_operations`  
> Related BCs: [`channels.md`](channels.md), [`media.md`](media.md), [`notifications.md`](notifications.md)  
> Modeling: [`docs/modeling/006-communication.md`](../../modeling/006-communication.md)  
> API narrative: [`docs/api/v1/communication.md`](../../api/v1/communication.md)  
> **This cut** supersedes the thread, edit, schedule, and permission sketch below. See [Family thread slice](#family-thread-slice).

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
| `infantil` | yes | Guardian-primary; teachers send on the child's family thread, including photos, audio, and short video |
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
- Identity: this cut uses role `teacher` plus a `teaching_assignment` (no new `send_messages` key); guardian membership for `/me` routes.
- Channels BC: `thread_kind` distinguishes DM, `class_group`, and `service` origins.

**Not real-time:** clients poll or refresh. This cut does not send push. No WebSocket/Solid Cable
([`open-questions.md`](../../open-questions.md)).

---

## Family thread slice

Locked for the family-communication cut. Where this section disagrees with BR-M01–BR-M08, BR-M10,
the API sketch, or the permission keys below, **this section wins** until a later wave reopens
those rules.

- One kept conversation per `(school_id, student_id)`. Participants are the guardians linked to
  that student and the teachers who hold role `teacher` plus a `teaching_assignment` on the
  student's current class. Someone who leaves loses access; the history stays for whoever remains.
  There is no shared room in which one family sees another.
- A class notice copies the same message into each child's thread. Repeating `client_request_id`
  does not insert a second copy.
- The thread is created on the first send. Another family, another class, or another school
  receives `404` `not_found`. `403` `family_isolation_violation` is not used.
- This cut does not add a `send_messages` permission. `moderate_messages` does not open a private
  thread. Coordination with `manage_academic` reads daily routines and does not read the thread
  ([`daily-routine.md`](../academic/daily-routine.md)).
- A sent message is not edited and not deleted. A correction is a new message. No `edited_at`,
  no `scheduled_for`, no hard delete of sent content. LGPD retention stays open.
- `body` may be empty when the message has an attachment. A send with neither body nor attachment
  is `422` `empty_content`.
- `kind` is `text` or `routine`. A routine card is the single message created by sending a daily
  routine. Audio and short video follow [`media.md`](media.md) BR-D02.
- Push, mobile screens, announcements, service channels, and scheduled send are outside this cut.

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

**Audio and short video** are allowed on a message in this cut when the file matches the media
allow-list (BR-D02 in [`media.md`](media.md)): images `jpeg` / `png` / `webp`, audio `webm` /
`mp4` / `mpeg` / `ogg`, short video `video/mp4` / `video/webm`. Cap is 10 MB and 5 files. No
transcoding. A disallowed type is `422` `unsupported_media_type`. A larger file is `422`
`file_too_large`. Long-form video is out of this cut (the size cap is the rejection; there is
no separate duration pipeline). The Jul 2026 "audio out of scope" note in
[`vision.md`](../../vision.md) is superseded for this cut.

BR-M10

This cut does **not** emit a notification intent and does **not** call FCM. Push stays in
[`notifications.md`](notifications.md) for a later wave.

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

Normative routes for this cut: [`docs/api/v1/communication.md`](../../api/v1/communication.md).

Teacher base `/api/v1/schools/:school_id/communication`: list children (with a thread only after
the first send), read and post messages, upload an attachment, download an attachment, post a
class notice.

Guardian base `/api/v1/schools/:school_id/me`: list threads, read messages, reply.

No `PATCH` edit and no `scheduled_at` in this cut.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 404 | `not_found` | Outside the family, the class, or the school — including `moderate_messages` on a private thread. Not `403` `family_isolation_violation` |
| 422 | `empty_content` | Send with no body and no attachment |
| 422 | `unsupported_media_type` | Type outside BR-D02 (BR-M09) |
| 422 | `file_too_large` | File over 10 MB |
| 422 | `too_many_files` | More than 5 files |

---

## Database

This cut uses `conversations`, `messages`, and `communication_attachments` in
[`docs/modeling/006-communication.md`](../../modeling/006-communication.md) and
[`docs/database/schema.dbml`](../../database/schema.dbml). The entity names below are the later-wave
sketch (edit history, stored participants, scheduled status) and are **not** migrated in this cut.

| Entity group | Purpose |
|--------------|---------|
| `communication_threads` | Later-wave thread metadata |
| `communication_thread_participants` | Later-wave stored participation and inbox state |
| `communication_messages` | Later-wave body and scheduled status |
| `communication_message_edits` | Later-wave edit history |
| `communication_message_attachments` | Later-wave media FK |

| Artifact | Location |
|----------|----------|
| Narrative DSL | [`docs/modeling/006-communication.md`](../../modeling/006-communication.md) |
| DBML | [`docs/database/schema.dbml`](../../database/schema.dbml) |

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

**This cut:** role `teacher` plus a `teaching_assignment` on the student's current class. Guardians
use family scope on `/me` routes. No new `send_messages` key. `moderate_messages` does not open a
private thread (`404`).

The keys below (`send_messages`, `moderate_communication`, `manage_communication`) remain the
later-wave sketch. They are not created for this cut. `send_messages` is named in older PRD text
and is absent from `web/lib/school_lab/permissions.rb`.

| Action | Permission key |
|--------|----------------|
| Send DM / group message | `send_messages` *(later wave — not this cut)* |
| Edit own message (window) | `send_messages` *(later wave — not this cut)* |
| Edit any message / moderation | `moderate_communication` *(later wave)* |
| Archive/delete for others | `manage_communication` *(later wave)* |
| Guardian inbox | membership + family scope (no key) |

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

- [ ] Given a message already sent on the family thread  
      When the author tries to edit or delete it  
      Then the API has no edit or delete route and the original body stays  
- Source: `[product decision]` — family thread slice; edit history (BR-M06) is a later wave

AC-M04

- [ ] Given student moves from class C1 to C2 via enrollment update  
      When `EnrollmentClassChanged` fires  
      Then guardian is removed from C1 group thread and added to C2 group thread  
- Source: [`students-and-enrollments/enrollments.md`](../students-and-enrollments/enrollments.md) Events

AC-M05

- [ ] Given an audio file whose type is `audio/webm`, `audio/mp4`, `audio/mpeg`, or `audio/ogg`, within 10 MB, and within the five-file cap  
      When the teacher attaches it to a family-thread message  
      Then the guardian who is linked to that student can download it  
- [ ] Given a file outside the BR-D02 allow-list, or a file over 10 MB  
      When it is uploaded  
      Then the API returns `422` `unsupported_media_type` or `422` `file_too_large`  
- Source: [`vision.md`](../../vision.md) §3 and §6 — BR-M09, [`media.md`](media.md) BR-D02

AC-M06

- [ ] Scheduled send is not in this cut: the API does not accept `scheduled_at` or `scheduled_for`  
- Source: `[product decision]` — family thread slice. ClassApp deferred send stays a later wave (BR-M07)

---

## Open items / pending decisions

- [x] Message edit and delete — out of this cut. A correction is a new message. Edit-window length stays open only if a later wave adds edit.
- [ ] Edit window duration (24h default vs school setting) — later wave only.
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
- Push, mobile screens, announcements, and scheduled send — later waves.
- Editing or deleting a sent message — later wave; this cut keeps sent content.
