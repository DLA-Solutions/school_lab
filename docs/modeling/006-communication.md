# Data Model — Communication (006)

> PRD: [`docs/prds/communication/`](../prds/communication/)  
> Depends on: [`005-students-enrollments.md`](005-students-enrollments.md)  
> Executable schema: [`docs/database/schema.dbml`](../database/schema.dbml) · DER: `der_006.png` (TBD)

## Entity groups

### Messages (BC1)

| Table | Role |
|-------|------|
| `conversations` | DM, class, or group thread — `school_id`, `conversation_type` |
| `conversation_participants` | Membership or guardian participation |
| `messages` | Body, sender, `sent_at`, edit audit |
| `message_attachments` | FK to Active Storage blob |

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
| `notification_deliveries` | FCM/email adapter state — links to source message/event |
| `notification_policies` | Per-school channel rules |

### Media (BC5)

Reuses `message_attachments` and shared blob storage contract from
[`008-documents-archive.md`](008-documents-archive.md).

## conversations

| Column | Notes |
|--------|-------|
| `school_id` | Required |
| `conversation_type` | `direct` \| `class` \| `group` |
| `subject_type/id` | Polymorphic — `Class`, `Student`, etc. |
| `last_message_at` | Denormalized for inbox sort |

## Family isolation

Every guardian query joins `conversation_participants` where participant is the guardian's user or
guardian id — **never** expose another family's threads (NFR-002, NFR-004).

## Push pipeline

`notification_deliveries` state machine: `pending` → `sent` → `failed`; Solid Queue job;
idempotent on `(source_type, source_id, device_token_id)`.

## LGPD

Message body and attachments — retention default **7 years** after student leaves school
([`retention.md`](../prds/documents-and-archive/retention.md) hooks P2); access audit on staff
reads of guardian threads (P2).
