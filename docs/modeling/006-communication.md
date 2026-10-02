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
| `notification_policies` | Per school × `channel_key` toggles (push/email/whatsapp); no row = hardcoded MVP default |
| `notification_intents` | One row per domain event fan-out (`source_type`/`source_id`/`channel_key`) |
| `notification_deliveries` | Per user × channel adapter state — links to `notification_intents` |

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

Event → `Notifications::ProcessIntentService` creates a `notification_intents` row (idempotent on
`source_type`/`source_id`/`channel_key`) → resolves the effective `notification_policies` row for
`school_id` + `channel_key` (hardcoded MVP default when no override exists) → one
`notification_deliveries` row per target user per enabled channel. `notification_deliveries` AASM:
`queued` → `sent` | `failed` | `skipped` (policy disabled); idempotent on
`(notification_intent_id, channel, user_id)` — Solid Queue job sends via the `Gateways::Push` FCM
adapter and transitions the row.

First wired trigger (MVP): `ReportCards::ReportCardPublishedJob` (channel_key `report_cards` —
extends the BR-N02 list, which is explicitly non-exhaustive) fans out to each guardian's
`device_tokens` when a report card snapshot is released. `MessagePosted` (BC1) is still the
PRD's reference trigger once `messages` ships.

## LGPD

Message body and attachments — retention default **7 years** after student leaves school
([`retention.md`](../prds/documents-and-archive/retention.md) hooks P2); access audit on staff
reads of guardian threads (P2).
