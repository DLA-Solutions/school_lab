# PRD — Communication: Media (BC5)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `communication.attach_files_to_message`, `communication.share_photo_update`, `communication.manage_photo_album`, `communication.share_video_content`, `communication.distribute_learning_materials`  
> Related BCs: [`messages.md`](messages.md), [`announcements.md`](announcements.md)  
> Modeling: *(pending — `docs/modeling/006-communication.md`)*  
> API narrative: *(pending — `docs/api/v1/communication.md`)*

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
| `infantil` | yes | Photo updates substitute for P2 daily routine module |
| `fundamental_medio` | yes | Learning materials via attachments |
| `pj_financeiro` | yes | No segment-specific media rules |
| `multi_unidade` | partial | Albums scoped per school |

---

## Context

[`vision.md`](../../vision.md) positions **images in messages** as a differentiator vs
competitors. Early childhood **structured routine** (meals, sleep) is P2 academic module;
MVP infantil needs are met via **photo updates and messaging** (Jul 2026 decision in
[`open-questions.md`](../../open-questions.md)).

ClassApp **Momentos** is a social feed — School Lab uses **album/timeline per class or event**
without public reactions ([`DIV-communication-005`](../../ref/divergencias.md)). Likes/comments
are P2 and off by default.

**Storage:** Active Storage with S3 target per [`web-stack.md`](../../web-stack.md) — production
backend open item in [`open-questions.md`](../../open-questions.md) Infrastructure.

---

## Business Rules

BR-D01

**Media assets** are school-scoped with `uploaded_by`, `content_type`, byte size, checksum, and
optional `student_id` / `class_id` context for guardian filtering.

BR-D02

**Allowed types in MVP:** images (`image/jpeg`, `image/png`, `image/webp`), PDF, common video
(`video/mp4`) with size caps. **Audio rejected** (BR-M09). Executable and archive types rejected.

BR-D03

Default **max attachment size** 10 MB per file; max 5 attachments per message
`[product decision]` — pending open question on exact limits.

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
| 413 | `file_too_large` | Exceeds BR-D03 |
| 422 | `unsupported_media_type` | Type not allowed (BR-D02) |
| 404 | `not_found` | Asset outside guardian scope |

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

- [ ] Given audio file upload  
      When POST media/uploads  
      Then API returns 422 unsupported_media_type  
- Source: BR-D02, [`vision.md`](../../vision.md) §6

---

## Open items / pending decisions

- [ ] Exact MB/resolution limits ([`open-questions.md`](../../open-questions.md) § Communication).
- [ ] Retention windows and post-withdrawal deletion ([`open-questions.md`](../../open-questions.md) § LGPD).
- [ ] S3 migration from local Active Storage in production.
- [ ] Image compression/transcoding pipeline.
- [ ] Guardian-initiated photo upload — defer MVP.

---

## Out of Scope

- Structured infantil daily routine fields — academic P2 (`academic.log_daily_routine`).
- Social reactions on photos — P2.
- Semantic search on media — documents/archive phase 2.
- Native in-app video hosting at scale — prefer link adapter for long-form P2.
