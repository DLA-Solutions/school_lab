# PRD — Communication: Media (BC5)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `communication.attach_files_to_message`, `communication.share_photo_update`, `communication.manage_photo_album`, `communication.share_video_content`, `communication.distribute_learning_materials`  
> Related BCs: [`messages.md`](messages.md), [`announcements.md`](announcements.md)  
> Modeling: [`docs/modeling/006-communication.md`](../../modeling/006-communication.md)  
> API narrative: [`docs/api/v1/communication.md`](../../api/v1/communication.md)

---

## Objective

Define **media attachments** — images in messages (MVP differentiator), photo albums/mural,
video sharing, and learning material distribution — with LGPD retention hooks and no vanity
social feed ([`DIV-communication-005`](../../ref/divergencias.md)).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Attach files to messages | `communication.attach_files_to_message` | ClassApp attachments — **School Lab differentiator** ([`vision.md`](../../vision.md) §3) |
| Share photo update | `communication.share_photo_update` | Agenda Edu mural, ClassApp Momentos (feed pattern avoided) |
| Manage photo album | `communication.manage_photo_album` | [`DIV-communication-005`](../../ref/divergencias.md), Agenda Edu mural de fotos |
| Share video content | `communication.share_video_content` | ClipEscola/Agenda Edu video in agenda |
| Distribute learning materials | `communication.distribute_learning_materials` | Proesc material distribution — not LMS replacement |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Photos, audio, and short video ride on the family thread; the structured day is [`daily-routine.md`](../academic/daily-routine.md) |
| `fundamental_medio` | yes | Learning materials via attachments |
| `pj_financeiro` | yes | No segment-specific media rules |
| `multi_unidade` | partial | Albums scoped per school |

---

## Context

[`vision.md`](../../vision.md) positions **images, audio, and short video** in the family thread as
the attachment differentiator for this cut. The structured Infantil day is
[`daily-routine.md`](../academic/daily-routine.md), not a photo album.

ClassApp **Momentos** is a social feed — albums and reactions stay a later wave
([`DIV-communication-005`](../../ref/divergencias.md)).

**Storage:** Active Storage. Production today uses the local service. This cut does not transcode.

---

## Business Rules

BR-D01

**Media assets** are school-scoped with `uploaded_by`, `content_type`, byte size, checksum, and
optional `student_id` / `class_id` context for guardian filtering.

BR-D02

**Allow-list for this cut:** `image/jpeg`, `image/png`, `image/webp`; audio `audio/webm`,
`audio/mp4`, `audio/mpeg`, `audio/ogg`; short video `video/mp4`, `video/webm`. No transcoding.
A clip over the size cap is rejected at upload. Long-form video, executables, and archives are
rejected (`422` `unsupported_media_type`). PDF and other document types are not in this cut.

BR-D03

**Max 10 MB per file and 5 files** per message or daily routine `[product decision]`. A larger
file is `422` `file_too_large` (not `413`). More than five files is `422` `too_many_files`.
Any cap above 10 MB, and any resolution cap, stay open
([`open-questions.md`](../../open-questions.md) § Communication).

BR-D04

**Photo update** creates or appends to a **photo album** (`album_kind`: `class`, `event`, `ad_hoc`)
and notifies guardians per push policy `photos` channel.

BR-D05

Guardians download photos they are entitled to via family/class scope only (NFR-002). Download
action logged for future access audit (NFR-005 open item).

BR-D06

**Video** may be uploaded or linked (external URL). Uploaded video same retention as photos;
linked video stores URL metadata only.

BR-D07

**Learning materials** distribution attaches PDF/files to class-scoped announcement or message
with `material_kind` tag — not a full LMS; no completion tracking in MVP.

BR-D08

**Retention:** media rows include `retention_until` nullable. Policy engine TBD (LGPD open item).
Soft-delete after retention job runs; hard purge from object storage with audit.

BR-D09

Album **cover** and ordering are staff-editable; guardians read-only. No guardian upload in MVP
`[product decision]`.

BR-D10

Images may be **reused** across messages via `attachment_id` reference without re-upload if
same school and uploader has rights.

---

## Use Cases

### UC-D01 — Upload attachment

Input: file multipart, optional context (`class_id`, `student_id`).

Flow

1. Validate type and size (BR-D02, BR-D03).
2. Store via Active Storage; create `communication_media_assets` row (BR-D01).
3. Return `attachment_id` for message/announcement compose.

### UC-D02 — Share photo update to class

Input: `class_id`, photo attachment ids, caption.

Flow

1. Create/update album (BR-D04).
2. Create class group message or announcement with photos.
3. Emit notification on `photos` channel.

### UC-D03 — Manage photo album (staff)

Input: album metadata, reorder, set cover, remove photo from album (not necessarily delete asset).

Flow

1. Validate `manage_communication` or teacher class scope.
2. Audit changes (NFR-005).

### UC-D04 — Distribute learning material

Input: `class_id`, PDF attachment ids, title, optional message body.

Flow

1. Tag assets `material_kind: learning` (BR-D07).
2. Publish via announcement or class message.

### UC-D05 — Guardian view/download media

Input: `attachment_id`, optional `student_id` context.

Flow

1. Verify family/class entitlement (BR-D05).
2. Serve signed URL or redirect; log access `[product decision]` pending access audit policy.

---

## API

This cut: `POST /api/v1/schools/:school_id/communication/attachments` (multipart) returns an id
for the next message or routine send. `GET` of that attachment redirects to the blob only for a
participant. Contract: [`docs/api/v1/communication.md`](../../api/v1/communication.md).

Album, photo-update, and learning-material routes below are a later wave. They are not this cut.

### POST /api/v1/schools/:school_id/communication/media/uploads

Multipart upload → returns `attachment_id`.

### GET /api/v1/schools/:school_id/communication/albums

Staff list; guardian `/me` variant filtered by linked students/classes.

### POST /api/v1/schools/:school_id/communication/photo-updates

UC-D02 composite endpoint (album + notify).

### GET /api/v1/schools/:school_id/communication/media/:id/download

Signed download URL with authorization check.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 422 | `file_too_large` | Exceeds 10 MB (BR-D03). Not HTTP 413 |
| 422 | `too_many_files` | More than 5 files (BR-D03) |
| 422 | `unsupported_media_type` | Type not on the BR-D02 allow-list |
| 404 | `not_found` | Asset outside the participant's family, class, or school |

---

## Database

| Entity group | Purpose |
|--------------|---------|
| `communication_media_assets` | Metadata, retention, uploader, context |
| `communication_photo_albums` | Album kind, class/event refs |
| `communication_album_items` | Ordering, cover flag |
| Active Storage blobs | Binary storage |

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `PhotoUpdateShared` | UC-D02 | Notifications BC |
| `MediaAssetCreated` | UC-D01 | Audit |
| `MediaRetentionDue` | scheduled job | Purge pipeline (policy TBD) |

---

## Permissions

| Action | Permission key |
|--------|----------------|
| Upload / photo update | `send_messages` + class scope |
| Manage albums | `manage_communication` or teacher class scope |
| Download (guardian) | membership + family/class scope |
| Distribute materials | `send_messages` or `manage_communication` |

---

## Non-functional requirements

- [NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy) — children's photos; retention open item; family-scoped access.
- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — assets scoped by `school_id`.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — upload and album mutations audited; download access audit pending.
- [NFR-006](../../product/non-functional-requirements.md#nfr-006--availability-and-performance-baseline) — video bandwidth limits; mobile may show compressed preview.

---

## Acceptance Criteria

AC-D01

- [ ] Given teacher uploads JPEG within size limit  
      When attached to class group message  
      Then guardian in class sees image inline in thread  
- Source: [`vision.md`](../../vision.md) §3 — differentiator

AC-D02

- [ ] Given guardian B not linked to any student in class C  
      When they request download URL for class C album photo  
      Then API returns 404  
- Source: NFR-002

AC-D03

- [ ] Given photo update shared to class C  
      When push policy photos enabled  
      Then guardians in C receive push notification  
- Source: [`DIV-communication-005`](../../ref/divergencias.md), [`notifications.md`](notifications.md)

AC-D04

- [ ] Given PDF learning material distributed to class  
      When guardian opens material list  
      Then file downloads without LMS progress tracking  
- Source: [`proesc/comunicacao/funcionalidades-por-ator.md`](../../ref/proesc/comunicacao/funcionalidades-por-ator.md) — BR-D07

AC-D05

- [ ] Given album UI for guardians  
      When viewing photo update  
      Then no like/comment controls are shown  
- Source: [`DIV-communication-005`](../../ref/divergencias.md)

AC-D06

- [ ] Given an allowed audio or short-video file within 10 MB  
      When the teacher uploads it and attaches it to a family-thread message  
      Then the linked guardian can open it, and the bytes are the original file (no transcoding)  
- [ ] Given an audio or video type outside BR-D02, or a file over 10 MB  
      When POST attachments  
      Then the API returns `422` `unsupported_media_type` or `422` `file_too_large`  
- Source: BR-D02, BR-D03, [`vision.md`](../../vision.md) §6

---

## Open items / pending decisions

- [x] This cut: 10 MB per file, 5 files, allow-list in BR-D02, no transcoding ([`open-questions.md`](../../open-questions.md) § Communication).
- [ ] Resolution limit, and any cap above 10 MB ([`open-questions.md`](../../open-questions.md) § Communication).
- [ ] Retention windows and post-withdrawal deletion ([`open-questions.md`](../../open-questions.md) § LGPD). Sent bytes are not hard-deleted while that item is open.
- [ ] S3 migration from local Active Storage in production.
- [x] Transcoding — none in this cut.
- [ ] Guardian-initiated photo upload on albums — later wave. Guardian reply on the family thread may attach the same allow-list.

---

## Out of Scope

- Structured Infantil daily routine fields — [`daily-routine.md`](../academic/daily-routine.md). Attachments on that card use this allow-list.
- Social reactions on photos — P2.
- Semantic search on media — documents/archive phase 2.
- Long-form video and any transcoding pipeline.
- Photo albums, learning-material distribution, and PDF attachments — later wave (BR-D04, BR-D07). This cut's upload route is `POST /communication/attachments` only.
