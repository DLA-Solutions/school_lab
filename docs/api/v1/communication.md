# API v1 — Communication

> PRDs: [`docs/prds/communication/messages.md`](../../prds/communication/messages.md), [`docs/prds/communication/media.md`](../../prds/communication/media.md)  
> Modeling: [`docs/modeling/006-communication.md`](../../modeling/006-communication.md)  
> Routine card: [`academic.md`](academic.md) § Daily routine  
> Conventions: [`docs/api/README.md`](../README.md)

This cut is the family thread: one conversation per school and student, text plus image, audio,
and short video, and a class notice copied into each child's thread. It replaces the earlier W1
draft (message edit, 5 MB images, FCM in the first wave, `403` `family_isolation_violation`).

Push, mobile screens, announcements, service channels, scheduled send, and message edit or delete
are not in this cut. Announcement and notification routes are not specified here.

---

## School year context

Class notices and teacher conversation lists use the student's current class. Pass `school_year_id`
only when a caller must pin the year; otherwise the active enrollment's class is the class.
`X-School-Year-Id` is not required on these routes.

---

## Family thread

Teacher base: `/api/v1/schools/:school_id/communication`  
Guardian base: `/api/v1/schools/:school_id/me`

Paths below are relative to that base. The thread row is created on the first send. Listing
children does not require a conversation yet.

| Method | Path | Who | Description |
|--------|------|-----|-------------|
| `GET` | `/conversations` | teacher | Children in the teacher's current classes. Includes the conversation when one already exists |
| `GET` | `/conversations/:id/messages` | teacher | Messages in that thread |
| `POST` | `/conversations/:id/messages` | teacher | Send text and/or attachments |
| `POST` | `/attachments` | teacher | Multipart upload. Returns an id for the next send |
| `GET` | `/attachments/:id` | teacher, participant | Authorized redirect to the Active Storage blob |
| `POST` | `/class_notices` | teacher | Copy one message into each child's thread. Same `client_request_id` does not duplicate |
| `GET` | `/conversations` | guardian, on `/me` | Threads for linked students |
| `GET` | `/conversations/:id/messages` | guardian, on `/me` | Messages |
| `POST` | `/conversations/:id/messages` | guardian, on `/me` | Reply |
| `POST` | `/attachments` | guardian, on `/me` | Same upload rules, so a reply can carry media |
| `GET` | `/attachments/:id` | guardian, on `/me` | Authorized redirect to the blob |

A guardian reply uses the same body shape as the teacher send.

### `POST .../conversations/:id/messages`

`body` may be omitted when `attachment_ids` is present. `kind` defaults to `text`. Clients do not
send `kind: routine`; that card is created by `POST /academics/daily_routines/:id/send`.

```json
{
  "body": "Segue a foto da rodinha.",
  "attachment_ids": [12],
  "client_request_id": "4f1c0c3e-7b2a-4d1e-9a55-0c1e8b7a6d10"
}
```

Response `201`:

```json
{
  "id": 900,
  "conversation_id": 40,
  "sender_membership_id": 7,
  "body": "Segue a foto da rodinha.",
  "kind": "text",
  "daily_routine_id": null,
  "attachment_ids": [12],
  "sent_at": "2026-10-04T15:00:00Z"
}
```

There is no `PATCH` and no `DELETE` on messages.

### `POST .../attachments`

Multipart field `file`. Response `201`:

```json
{
  "id": 12,
  "content_type": "image/jpeg",
  "byte_size": 240112
}
```

Allow-list: `image/jpeg`, `image/png`, `image/webp`, `audio/webm`, `audio/mp4`, `audio/mpeg`,
`audio/ogg`, `video/mp4`, `video/webm`. Maximum 10 MB per file and 5 files on the message or
routine that later references them. The stored bytes are the upload; nothing is transcoded.
`GET` responds with a redirect to the blob. Production uses the local Active Storage service.

### `POST .../class_notices`

```json
{
  "school_class_id": 14,
  "body": "Amanhã teremos passeio. Cheguem às 8h.",
  "attachment_ids": [],
  "client_request_id": "8a2d1b44-1c09-4e77-9f20-6c5b0a11d2e3"
}
```

One `kind: text` message is inserted on each enrolled child's thread (creating the thread when
needed). Repeating `client_request_id` returns the messages already created and inserts nothing.

### Authorization

A teacher must have membership role `teacher` and a `teaching_assignment` on the student's current
class. This cut does not add `send_messages`. `moderate_messages` does not open a private thread.
`manage_academic` does not read these routes (routines are under Academic).

---

## Errors

| HTTP | `error.code` | When |
|------|--------------|------|
| `404` | `not_found` | Outside the family, the class, or the school. Also when `moderate_messages` requests a private thread. Not `family_isolation_violation` |
| `422` | `empty_content` | No body and no attachment |
| `422` | `unsupported_media_type` | MIME outside the allow-list |
| `422` | `file_too_large` | File over 10 MB |
| `422` | `too_many_files` | More than 5 files |

---

## OpenAPI tags

`Communication`, `Guardian Me`
