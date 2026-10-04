# Data Model — Communication (006)

> PRD: [`docs/prds/communication/`](../prds/communication/)  
> Depends on: [`005-students-enrollments.md`](005-students-enrollments.md)  
> Executable schema: [`docs/database/schema.dbml`](../database/schema.dbml) · DER: `der_006.png` (not re-exported in this pass)

## This cut

Family thread and attachments only. Announcements, notification policies, and service channels stay
in the DBML as a later sketch. This pass does not add implementation requirements for them, and it
does not migrate them.

## Entity groups

### Family thread (this cut)

| Table | Role |
|-------|------|
| `conversations` | One private thread per school and student |
| `messages` | Text or a single routine card. No edit, no schedule, no delete |
| `communication_attachments` | Active Storage file owned by a membership, linked to a message or a daily routine |

Participants are **not** stored. A guardian sees the thread when `student_guardians` still links
them to `conversations.student_id`. A teacher sees it when the membership role is `teacher` and a
`teaching_assignment` covers the student's current class. Someone who leaves loses access; rows
stay for whoever remains.

### Channels, announcements, notifications (later — not this cut)

| Table | Role |
|-------|------|
| `service_channels` | Not in the DBML yet; service tickets stay out of this cut |
| `announcements` | Sketch only. Not migrated and not required by this cut |
| `notification_policies` | Sketch only |
| `notification_intents` | Sketch only |
| `notification_deliveries` | Sketch only |

## conversations

| Column | Notes |
|--------|-------|
| `school_id` | Required |
| `student_id` | The subject. There is no thread that is only between two people |
| `last_message_at` | Denormalized for inbox sort |
| `discarded_at` | Uniqueness is among kept rows: one `(school_id, student_id)` where `discarded_at` is null |

No `conversation_type`. No polymorphic subject. No `conversation_participants`.

The thread row is created on the first send.

## messages

| Column | Notes |
|--------|-------|
| `conversation_id` | Required |
| `school_id` | Required. Must match the conversation |
| `sender_membership_id` | Required. Teacher or guardian membership |
| `body` | Nullable when the message has an attachment |
| `kind` | `text` or `routine` |
| `daily_routine_id` | Nullable. Unique when set — one card per routine |
| `client_request_id` | Nullable. Unique per conversation when set, so a repeated class-notice id does not copy twice into the same thread |
| `sent_at` | Required |

No `edited_at`. No `scheduled_for`. No `discarded_at`. Sent rows are not hard-deleted while LGPD
retention is open.

A class notice inserts one `kind: text` row per child in the class, each carrying the same
`client_request_id`.

## communication_attachments

| Column | Notes |
|--------|-------|
| `school_id` | Required |
| `uploaded_by_membership_id` | Required |
| `message_id` | Nullable until the file is sent on a message |
| `daily_routine_id` | Nullable until the file is attached to a routine |

The bytes are Active Storage (`has_one_attached`), the same mechanism incidents already declare.
This table is the first upload route. Both foreign keys may be null while the client holds the id
for the next send. They must not both be set. Allow-list and the 10 MB / 5-file cap are service
checks: images `image/jpeg`, `image/png`, `image/webp`; audio `audio/webm`, `audio/mp4`,
`audio/mpeg`, `audio/ogg`; video `video/mp4`, `video/webm`. No transcoding. `content_type` and
`byte_size` live on the blob.

## Family isolation

Guardian queries resolve through the linked student, not through a participant table. Another
family, another class, or another school is `404` `not_found`. `moderate_messages` is not a
participant and does not open the thread. `manage_academic` does not read `conversations`.

## Push pipeline

Not used by this cut. No `MessagePosted` intent is written when a family message or routine card
is sent. The notification tables below stay a later sketch; report-card push, when it ships, is
unchanged by this model and is not a requirement of this cut.

## LGPD

Message `body` and attachment bytes are children's communication content. Retention length is
**open** ([`open-questions.md`](../open-questions.md) § LGPD). Sent messages, attachments, and
sent routine cards are not hard-deleted. Access audit of who read a thread stays open.
