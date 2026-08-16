# API v1 — Communication

> PRDs: [`docs/prds/communication/`](../../prds/communication/)  
> Modeling: [`docs/modeling/006-communication.md`](../../modeling/006-communication.md)  
> Platform contract: [`platform-and-admin.md`](platform-and-admin.md) — **frozen W1 (4C.1)**  
> Conventions: [`docs/api/README.md`](../README.md)

Messaging, announcements, notifications, and media for MVP communication pillar.

---

## School year context

Where communication features filter by academic cycle (e.g. class-scoped announcements tied to
enrollments), pass `school_year_id` per the frozen Platform contract
([`platform-and-admin.md`](platform-and-admin.md) § Cross-domain contract). Default to
`GET /schools/:school_id/school_years/active` when no year is selected. The header
`X-School-Year-Id` is accepted on the same routes that document query-param year scoping.

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
