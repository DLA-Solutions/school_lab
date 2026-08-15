# API v1 — Communication

> PRDs: [`docs/prds/communication/`](../../prds/communication/)  
> Modeling: [`docs/modeling/006-communication.md`](../../modeling/006-communication.md)  
> Conventions: [`docs/api/README.md`](../README.md)

Messaging, announcements, notifications, and media for MVP communication pillar.

---

## Delivery waves

| Wave | Scope |
|------|--------|
| **W1** | Direct messages, inbox, attachments, FCM push |
| **W2** | Class threads, announcements (school + class scope) |
| **W3** | Service channels / tickets (optional MVP) |

---

## Conversations & messages (W1)

Base: `/api/v1/schools/:school_id/communication`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/conversations` | Inbox — guardian sees family threads only |
| `POST` | `/conversations` | Start DM (teacher↔guardian) |
| `GET` | `/conversations/:id/messages` | Paginated messages |
| `POST` | `/conversations/:id/messages` | Send text + attachments |
| `PATCH` | `/messages/:id` | Edit within window — audit trail |
| `POST` | `/conversations/:id/read` | Mark read |

### `POST /conversations/:id/messages`

```json
{
  "body": "Olá, tudo bem?",
  "attachment_ids": ["signed-blob-id"]
}
```

Multipart upload: `POST /communication/attachments` → returns blob id (max 5 MB image MVP).

---

## Announcements (W2)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/announcements` | Staff list |
| `POST` | `/announcements` | Publish to school or class |
| `GET` | `/me/announcements` | Guardian feed |

MVP includes **targeted announcements** to school and class — not full mass régua.

---

## Notifications

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/me/device_tokens` | Register FCM token (existing) |
| `GET` | `/notification_policies` | Staff read policy |
| `PATCH` | `/notification_policies` | Configure channels |

Push: immediate for messages and absence alerts; digest for non-urgent (P2).

---

## Permissions

| Action | Key |
|--------|-----|
| Send message | `send_messages` |
| Moderate / view all threads | `moderate_messages` |
| Publish announcement | `publish_announcements` |

Full matrix: [`identity-and-onboarding/permissions.md`](../../prds/identity-and-onboarding/permissions.md).

---

## Errors

| HTTP | `error.code` | When |
|------|--------------|------|
| `403` | `family_isolation_violation` | Cross-family access attempt |
| `413` | `attachment_too_large` | Image > 5 MB MVP limit |

---

## OpenAPI tags

`Communication`, `Announcements`, `Guardian Me`
