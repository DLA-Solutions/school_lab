# Data Model — Communication (006)

> PRD: [`docs/prds/communication/`](../prds/communication/)  
> Depends on: [`005-students-enrollments.md`](005-students-enrollments.md)  
> Executable schema: [`docs/database/schema.dbml`](../database/schema.dbml) · DER: `der_006.png` (TBD)

## Entity groups

### Messages (BC1) — this delivery

Family chat from [`messages.md`](../prds/communication/messages.md). One conversation per child per destination. Participants are not stored.

| Table | Role |
|-------|------|
| `conversations` | Child + destination. `audience` is `coordination`, `secretary`, or `teacher`. `teacher_id` only for `teacher`. |
| `messages` | Immutable body, `sender_membership_id`, `sent_at`. No `edited_at`, no discard. |
| `notifications` | Existing in-app bell. This delivery adds nullable `conversation_id`. |

There is no `conversation_participants` table and no `message_attachments` table in this cut.

### Channels (BC2)

| Table | Role |
|-------|------|
| `service_channels` | School↔family tickets — optional MVP W3 |
| `channel_messages` | Thread on service channel |

### Announcements (BC3)

| Table | Role |
|-------|------|
| `announcements` | Targeted comunicados — class/school scope |
| `announcement_recipients` | Per-guardian delivery/read state |

### Notifications (BC4)

| Table | Role |
|-------|------|
| `notification_policies` | Per school × `channel_key` toggles (push/email/whatsapp); no row = hardcoded MVP default |
| `notification_intents` | One row per domain event fan-out (`source_type`/`source_id`/`channel_key`) |
| `notification_deliveries` | Per user × channel adapter state — links to `notification_intents` |

### Media (BC5)

Not part of this messages cut. Future attachments stay with the documents archive contract in
[`008-documents-archive.md`](008-documents-archive.md). This delivery stores no attachment rows.

## conversations

| Column | Notes |
|--------|-------|
| `school_id` | Required. Tenant scope. |
| `student_id` | Required. The child the thread is about. |
| `audience` | `coordination` \| `secretary` \| `teacher` |
| `teacher_id` | Required when `audience` is `teacher`; null otherwise. FK `teachers.id`. |
| `last_message_at` | Set when a message is inserted. Inbox sort. |

Uniqueness (partial indexes):

- `(school_id, student_id, audience)` where `teacher_id` is null — one coordination row and one secretary row per child.
- `(school_id, student_id, teacher_id)` where `audience` is `teacher` — one row per teacher per child, even when that teacher has two subjects.

No `discarded_at`. A conversation is created on the first successful send and kept. The child's class is not a column: the series label and the teacher's right to see the row are derived from the child's current class at read time.

## messages

| Column | Notes |
|--------|-------|
| `conversation_id` | Required |
| `school_id` | Required. Same school as the conversation. |
| `sender_membership_id` | Required. The membership that sent. |
| `body` | Required text. LGPD: communication about a child. |
| `sent_at` | Required |

No `edited_at`, no `scheduled_for`, no `discarded_at`. A correction is another row.

## notifications.conversation_id

The bell table already exists in `web/db/schema.rb` (`kind`, `title`, `body`, `read_at`, `user_id`, `school_id`, optional `contract_id`). This cut adds nullable `conversation_id`. Billing bell rows leave it null. A message bell uses `kind = message` and sets `conversation_id`.

## Who can see a conversation

Derived, not stored:

- Linked guardians (`student_guardians` kept) of `student_id`.
- Secretary: `audience = secretary` only (`staff_profiles` → role template `system_key = secretary`).
- Teacher: `audience = teacher` and `teacher_id` is that teacher, and only while a kept `teaching_assignment` exists on the child's current class (`students.school_class_id` in the running schema).
- Coordination (`system_key = coordination`): every audience, including `coordination`.
- Director (`system_key = director`): every audience. Director is not a destination.

Another family or another school is `404`. A hidden conversation is `404` as well.

The academic DBML sketch names the class offering `class_disciplines` and the class `classes`. The running assignment table the rule uses is `teaching_assignments`. This note does not add that table.

## Family isolation

Guardian queries start from kept `student_guardians` for the current guardian — never from a stored participant list, and never another family's `student_id` (NFR-002). `school_id` scopes every query (NFR-003).

## Bell recipients

On send, one `notifications` row per user who can see the conversation, except the sender, in the same transaction as the message:

- Linked guardians, except the sender.
- Secretary memberships (`system_key` `secretary`) only when `audience` is `secretary`.
- The teacher user only when `audience` is `teacher`, they are `teacher_id`, and the assignment on the child's current class still holds.
- Coordination (`system_key` `coordination`) and director (`system_key` `director`) on every audience, because both can see every conversation.

## Push pipeline

Event → `Notifications::ProcessIntentService` creates a `notification_intents` row (idempotent on
`source_type`/`source_id`/`channel_key`) → resolves the effective `notification_policies` row for
`school_id` + `channel_key` (hardcoded MVP default when no override exists) → one
`notification_deliveries` row per target user per enabled channel. `notification_deliveries` AASM:
`queued` → `sent` | `failed` | `skipped` (policy disabled); idempotent on
`(notification_intent_id, channel, user_id)` — Solid Queue job sends via the `Gateways::Push` FCM
adapter and transitions the row.

First wired trigger (MVP): `ReportCards::ReportCardPublishedJob` (channel_key `report_cards` —
extends the BR-N02 list, which is explicitly non-exhaustive) fans out to each guardian's
`device_tokens` when a report card snapshot is released. The family-chat delivery does not
enter this pipeline and does not emit `MessagePosted`. It writes in-app `notifications` rows
only.

## LGPD

`messages.body` is communication about a child. This delivery does not discard messages and does
not set a retention window: how long bodies are kept after the child leaves is still open
([`open-questions.md`](../open-questions.md) LGPD). Staff read-audit of a family thread is the
same open item. A message bell stores `kind`, `title`, `body`, and `conversation_id` on the
existing `notifications` row.
