# PRD — Communication: Messages (BC1)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `communication.send_direct_message`, `communication.manage_message_inbox`  
> Deferred for this delivery (still catalogued on the parent index): `communication.send_group_message`, `communication.edit_message_content`, `communication.schedule_message_delivery`, `communication.manage_communication_operations`  
> Related BCs: [`channels.md`](channels.md), [`media.md`](media.md), [`notifications.md`](notifications.md)  
> Modeling: [`docs/modeling/006-communication.md`](../../modeling/006-communication.md)  
> API narrative: [`docs/api/v1/communication.md`](../../api/v1/communication.md)

**This delivery** is the family chat: one conversation per child per destination. It supersedes the earlier `direct` / `class_group` thread sketch (stored participants, edit audit, scheduled send) for this delivery. That sketch is not the contract to implement.

---

## Objective

Let a family talk with the school about one child. The family chooses **coordination** (`coordination`), **secretary** (`secretary`), or **one teacher by name**. Every guardian linked to that child shares those conversations. The school side answers according to role. Notice of a new message is the existing in-app bell only.

---

## Context

Parents expect a simple two-way thread with the school ([`DIV-communication-001`](../../ref/divergencias.md)). This delivery is that thread. It is not a class broadcast, not a service ticket ([`channels.md`](channels.md)), and not the infant daily routine ([`../academic/routine.md`](../academic/routine.md) — `daily_routine_entries` stays in academic).

**Dependencies**

- Students: the child, the guardians linked on `student_guardians`, and the child's current class.
- Academic staffing: a teacher is offered, and can keep seeing the thread, only while a kept `teaching_assignment` exists on that current class.
- Identity: `staff_profiles.role_template.system_key` of `secretary`, `coordination`, and `director`, same criterion as incident access for secretary.

The current class and the teaching assignment are the live records (`students.school_class_id`, `teaching_assignments`). The academic DBML sketch still names `classes`, `class_assignments`, and `class_disciplines`. This PRD does not introduce a second assignment table.

**Not real-time:** no WebSocket. The bell is the signal; the client loads the thread when opened.

---

## Competitive grounding

| Capability | `capability_id` | This delivery | Evidence |
|------------|-----------------|---------------|----------|
| Send direct message | `communication.send_direct_message` | yes — family to coordination, secretary, or one named teacher | [`proesc/comunicacao/funcionalidades-por-ator.md`](../../ref/proesc/comunicacao/funcionalidades-por-ator.md) (recados), [`agenda-edu/comunicacao/funcionalidades-por-ator.md`](../../ref/agenda-edu/comunicacao/funcionalidades-por-ator.md), [`classapp/comunicacao/funcionalidades-por-ator.md`](../../ref/classapp/comunicacao/funcionalidades-por-ator.md) |
| Manage message inbox | `communication.manage_message_inbox` | yes — role-scoped inbox | Agenda Edu inbox; ClassApp conversation list |
| Send group message | `communication.send_group_message` | no — class threads are out of this delivery | [`DIV-communication-001`](../../ref/divergencias.md) |
| Edit message content | `communication.edit_message_content` | no — a sent message stays as sent | Agenda Edu, ClassApp edit history (not adopted here) |
| Schedule message delivery | `communication.schedule_message_delivery` | no | ClassApp deferred send (not adopted here) |
| General operations | `communication.manage_communication_operations` | no — this delivery is the four endpoints in the API narrative | Catch-all pending a finer split |

Market evidence justifies a parent↔school thread. The destination list, the shared guardian thread, the role matrix, and the refusal to edit or approve are `[product decision]`.

---

## Actors and surfaces

| Actor | Surfaces | Notes |
|-------|----------|-------|
| guardian (UI: **Responsável**) | Web SPA, API | Chooses coordination, secretary, or a named teacher for one child. Shares each conversation with the other guardians of that child. |
| teacher | Web SPA, API | Sees and replies only where `conversations.teacher_id` is that teacher, and only while they have a kept `teaching_assignment` on the child's current class. |
| secretary (`system_key` `secretary`) | Web SPA, API | Sees and replies only on `audience = secretary`. |
| coordination (`system_key` `coordination`) | Web SPA, API | Inbox "For me" (pt-BR **Para mim**) is `audience = coordination`. Also sees every other conversation and can reply in any of them. |
| director (`system_key` `director`, UI: **Direção**) | Web SPA, API | Not a destination. Reads and replies in every conversation. |
| student | — | No login. |

School routes and the bell deep link are specified with the SPA work. This PRD freezes who may read and write.

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Same destinations. Daily routine entries are a separate academic record. |
| `fundamental_medio` | yes | Series label on the sender line comes from the child's current class. |
| `pj_financeiro` | yes | No billing rule in this chat. |
| `multi_unidade` | partial | Every row is scoped by `school_id`. |

---

## Business Rules

BR-M01 — `capability_id`: `communication.send_direct_message`

A **conversation** belongs to one school and one student. `audience` is `coordination`, `secretary`, or `teacher`. A message sent to secretary is a different conversation from one sent to coordination or to a teacher, and from one sent to another teacher of the same child.

BR-M02

`teacher_id` is required when `audience` is `teacher` and null otherwise. There is at most one conversation per `(school_id, student_id, audience)` when `teacher_id` is null, and at most one per `(school_id, student_id, teacher_id)` when `audience` is `teacher`. The first successful send creates the row. A later send appends a message on that same row.

BR-M03

The family chooses the destination. The destination list is coordination, secretary, and the teachers of the child's **current class**. A teacher who teaches two subjects in that class appears once. When the child has no teacher, the teacher destination is absent. Coordination and director do not receive an empty teacher conversation.

BR-M04

Every kept `student_guardians` link for that child shares the child's conversations. Participants are not stored. Who may open a conversation is derived at read time from the link and the role, so a guardian who is linked later sees the history already there, and a teacher who leaves the class stops seeing it.

The sender line is derived, not stored. When the sender is a guardian of that child, the line is the guardian's name, the relationship word, the child's name, and the series of the current class. Example shape: "Diego, pai da Lara — 1º ano". Relationship words: `father` → pai, `mother` → mãe, `other` → responsável. The series is the grade label of the child's current class. Live `student_guardians.relationship` is `father`, `mother`, or `other`.

BR-M05 — `capability_id`: `communication.manage_message_inbox`

Who can read and reply:

| Actor | Conversations |
|-------|----------------|
| Linked guardians | All conversations of that child |
| Secretary | `audience = secretary` only |
| Teacher | `audience = teacher` and `teacher_id` is that teacher, and only while a kept `teaching_assignment` exists on the child's current class |
| Coordination | `audience = coordination` ("For me") and every other conversation; may reply in any |
| Director | Every conversation; may reply in any. Director is not an `audience` value |

A teacher who no longer has that assignment does not see or reply, including on a conversation that already exists. The row stays for the family, coordination, and director.

BR-M06

Nobody approves a send. A sent message is not edited and not deleted. A correction is a new message. Messages have no `edited_at` and no discard.

BR-M07

The only notice is a row in the existing in-app bell (`notifications`), with `conversation_id` set so the bell can open that chat. Push, email, WhatsApp, and the mobile app are out of this delivery. The bell payload includes `conversation_id`. `kind` is `message`.

Recipients are every user who can see the conversation, except the sender. Rows are inserted in the same transaction as the message.

- Linked guardians of the child, except the sender.
- Secretary: active kept staff memberships whose role template `system_key` is `secretary`, only when `audience` is `secretary`.
- The named teacher: the user of `teacher_id`, only while that teacher still has a kept `teaching_assignment` on the child's current class.
- Coordination (`system_key` `coordination`) and director (`system_key` `director`) on every audience, because both can see every conversation.

Secretary memberships are notified only for secretary conversations. A teacher is notified only for the conversation where they are `teacher_id`, and only while the assignment still holds.

BR-M08

Another family or another school receives `404`. A conversation the actor cannot see (wrong audience, other teacher's thread, unlinked guardian) is also `404`, so the id does not confirm that the row exists. Policy denies by default. An unlinked family does not create a conversation. A requested teacher who does not teach the child's current class does not create one (`422` `teacher_not_assigned`). A blank body does not create one (`422` `empty_content`).

---

## Use Cases

### UC-M01 — List destinations

`capability_id`: `communication.send_direct_message`

Input: `student_id` for a guardian linked to that child.

Flow

1. Confirm the guardian link and the school. Otherwise `404`.
2. Always include coordination and secretary.
3. Include each teacher who has a kept `teaching_assignment` on the child's current class, once per teacher, with id and name.
4. Omit the teacher destination when that set is empty.

### UC-M02 — Send a message

`capability_id`: `communication.send_direct_message`

Input: `student_id`, `audience`, `teacher_id` (only when `audience` is `teacher`), `body`.

Flow

1. Reject a blank body with `422` `empty_content`.
2. Resolve the actor. Guardian must be linked to the student. Secretary may send only `audience = secretary`. A teacher may send only `audience = teacher` with their own `teacher_id`, and only while assigned to the current class. Coordination and director may send on any audience the rules allow.
3. When `audience` is `teacher`, the `teacher_id` must have a kept `teaching_assignment` on the child's current class. Otherwise `422` `teacher_not_assigned` and no row is created.
4. Find or create the conversation (BR-M02).
5. Insert the message (`sender_membership_id`, `body`, `sent_at`) and the bell rows (BR-M07) in one transaction.
6. Set `last_message_at`.

### UC-M03 — Read the inbox

`capability_id`: `communication.manage_message_inbox`

Input: optional `audience` filter.

Flow

1. List conversations the actor can see (BR-M05), newest `last_message_at` first.
2. Coordination may pass `audience=coordination` ("For me") or omit the filter (all).
3. Director's list is all visible conversations.
4. A filter never returns a conversation BR-M05 hides.

### UC-M04 — Read messages

Input: conversation id.

Flow

1. Load the conversation in the actor's school.
2. If BR-M05 hides it, return `404`.
3. Return messages in `sent_at` order. Each message identifies the sender; guardian senders use the BR-M04 line.

---

## API

Base: `/api/v1/schools/:school_id/communication`

Frozen narrative: [`docs/api/v1/communication.md`](../../api/v1/communication.md) § Family chat (this delivery).

| Method | Path | Use |
|--------|------|-----|
| `GET` | `/destinations?student_id=` | UC-M01 |
| `GET` | `/conversations` | UC-M03. Optional `audience`. |
| `GET` | `/conversations/:id/messages` | UC-M04 |
| `POST` | `/messages` | UC-M02. Body: `student_id`, `audience`, `teacher_id` (teacher only), `body`. |

The bell resource already exists. Its payload gains `conversation_id` for `kind = message`. No new notification route in this delivery.

---

## Errors

| Status | Code | When |
|--------|------|------|
| 404 | `not_found` | Other family, other school, unknown student for this actor, or a conversation BR-M05 hides |
| 422 | `teacher_not_assigned` | `audience` is `teacher` and that teacher has no kept `teaching_assignment` on the child's current class |
| 422 | `empty_content` | `body` is blank |

---

## Database

Entity groups only. Columns, partial unique indexes, and the bell foreign key are in the modeling note and the DBML.

| Entity group | Purpose |
|--------------|---------|
| `conversations` | One row per child per destination (`audience`, optional `teacher_id`) |
| `messages` | Immutable body, sender membership, `sent_at` |
| `notifications.conversation_id` | Optional link from the existing bell row to the chat |

No `conversation_participants`. No `edited_at`. No discard on messages.

| Artifact | Location |
|----------|----------|
| Narrative DSL | [`docs/modeling/006-communication.md`](../../modeling/006-communication.md) |
| DBML | [`docs/database/schema.dbml`](../../database/schema.dbml) |
| DER | `docs/database/der_006.png` *(not exported in this cut)* |

---

## Events

This delivery does not emit `MessagePosted` onto the push pipeline in [`notifications.md`](notifications.md). The send transaction writes `messages` and in-app `notifications` together.

No enrollment event recomputes a participant set. There is nothing to recompute. Visibility is the current guardian link and the current teaching assignment (BR-M04, BR-M05).

---

## Permissions

Deny by default. This delivery does not gate on `send_messages`, `moderate_messages`, or `manage_communication`.

| Actor | List destinations | Read / reply |
|-------|-------------------|--------------|
| Linked guardian | Own child | That child's conversations |
| `secretary` | — | Secretary conversations |
| Teacher with a current-class assignment | — | Own `teacher_id` only |
| `coordination` | — | All; may limit the list to `audience=coordination` |
| `director` | — | All |
| Anyone else | no | no |

An active kept membership is `memberships.status = active` and `discarded_at` null. Secretary, coordination, and director match `staff_profiles.role_template.system_key`.

---

## Non-functional requirements

- [NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy) — family isolation. Message body is communication about a child. Cross-family access is `404`.
- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — `school_id` on conversations, messages, and bell rows.
- [NFR-006](../../product/non-functional-requirements.md#nfr-006--availability-and-performance-baseline) — not real-time.

Push ([NFR-004](../../product/non-functional-requirements.md#nfr-004--push-notifications)) is out of this delivery. Retention of message bodies and access-audit of reads stay open in [`open-questions.md`](../../open-questions.md) (LGPD). This cut does not discard messages while that decision is open.

---

## Acceptance Criteria

AC-M01

- [ ] Given two guardians linked to Lara, and a third guardian linked only to another child  
      When the first guardian sends to secretary about Lara  
      Then both of Lara's guardians see that message, and the third guardian receives `404` on that conversation  
- Source: `[product decision]` BR-M04, BR-M08; NFR-002

AC-M02

- [ ] Given Lara's class has teacher Ana (two subjects) and teacher Bruno  
      When a linked guardian loads destinations  
      Then Ana appears once, Bruno appears once, and coordination and secretary are present  
- Source: `[product decision]` BR-M03

AC-M03

- [ ] Given Lara has no teaching assignment  
      When a linked guardian loads destinations  
      Then coordination and secretary are present and there is no teacher destination  
- Source: `[product decision]` BR-M03

AC-M04

- [ ] Given a secretary conversation and a teacher conversation for Lara  
      When a secretary membership reads them  
      Then the secretary conversation is visible and the teacher conversation is `404`  
- Source: `[product decision]` BR-M05

AC-M05

- [ ] Given Ana's conversation and Bruno's conversation for Lara  
      When Ana reads Bruno's conversation  
      Then the response is `404`  
- Source: `[product decision]` BR-M05

AC-M06

- [ ] Given Ana's conversation for Lara  
      When Ana's teaching assignment on Lara's current class is removed  
      Then Ana receives `404` on that conversation, and coordination still reads it  
- Source: `[product decision]` BR-M05

AC-M07

- [ ] Given coordination and director memberships  
      When each reads and replies on secretary, coordination, and teacher conversations for Lara  
      Then all three reads succeed and the replies append  
- Source: `[product decision]` BR-M05

AC-M08

- [ ] Given an existing teacher conversation for Ana and Lara  
      When a linked guardian sends a second message to Ana  
      Then the message appends and no second conversation row exists  
- Source: `[product decision]` BR-M02

AC-M09

- [ ] Given a send with a blank body  
      When the client posts it  
      Then the response is `422` `empty_content` and no message or bell row is created  
- Source: `[product decision]` BR-M08

AC-M10

- [ ] Given a teacher id that does not teach Lara's current class  
      When a linked guardian posts `audience=teacher` with that id  
      Then the response is `422` `teacher_not_assigned` and no conversation is created  
- Source: `[product decision]` BR-M08

AC-M11

- [ ] Given a guardian sends to secretary  
      When the transaction commits  
      Then bell rows with `kind=message` and that `conversation_id` exist for the other linked guardians, secretary memberships, coordination memberships, and director memberships, and not for the sender and not for a teacher  
- Source: `[product decision]` BR-M07

AC-M12

- [ ] Given a guardian sends to coordination  
      When the transaction commits  
      Then bell rows exist for the other linked guardians, coordination memberships, and director memberships, and not for the sender and not for secretary  
- Source: `[product decision]` BR-M07

---

## Open items / pending decisions

- [ ] How long message bodies are kept, and what happens when the child leaves — [`open-questions.md`](../../open-questions.md) LGPD retention. This delivery does not discard messages in the meantime.
- [ ] Whether staff reads of a family thread are access-audited — same LGPD section. Not built here.
- [ ] `student_guardians.relationship` in `schema.dbml` still says `parent | guardian | other`. Live rows and BR-M04 use `father | mother | other`. This cut does not migrate that column.
- [x] Bell recipients are every user who can see the conversation, except the sender. Coordination and director are notified on every audience. Secretary only when `audience` is `secretary`. The named teacher only while they still have a kept `teaching_assignment` on the child's current class. Linked guardians always, except the sender.

---

## Out of Scope

- Class or group threads, stored participants, and enrollment-driven participant sync.
- Editing or deleting a sent message; scheduled send; approval before send.
- Attachments, audio, photos, read receipts, typing indicators.
- Push, email, WhatsApp, and a mobile client for this chat.
- Announcements ([`announcements.md`](announcements.md)) and service-channel tickets ([`channels.md`](channels.md)).
- Infant daily routine (`daily_routine_entries` in [`../academic/routine.md`](../academic/routine.md)).
- The FCM pipeline in [`notifications.md`](notifications.md). This delivery only inserts the in-app bell row.
