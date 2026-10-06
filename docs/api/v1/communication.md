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
| **This delivery** | Family chat below. In-app bell only. |
| **Later** | Announcements (school + class scope). Service channels stay optional. |
| **Not this delivery** | Class threads, attachments, message edit, FCM for chat. |

---

## Family chat (this delivery)

Frozen contract for [`messages.md`](../../prds/communication/messages.md). Supersedes the earlier direct / class-thread routes in this file for this delivery.

Base: `/api/v1/schools/:school_id/communication`

| Method | Path | Who | Behavior |
|--------|------|-----|----------|
| `GET` | `/destinations?student_id=` | Linked guardian | Coordination, secretary, and the teachers of the child's current class. Each teacher is one object (`teacher_id`, `name`) even with two subjects. No teacher object when the child has no teacher. |
| `GET` | `/conversations` | Actor's inbox | Rows that actor may see. Optional `audience=coordination` is coordination's "For me" list (pt-BR **Para mim**). Omit `audience` for every conversation that actor may see. |
| `GET` | `/conversations/:id/messages` | Actor who may see it | Messages in `sent_at` order. |
| `POST` | `/messages` | Actor who may reply | Find or create the conversation, insert the message, insert bell rows, one transaction. |

`POST /messages` body:

```json
{
  "student_id": 9,
  "audience": "teacher",
  "teacher_id": 12,
  "body": "Hello"
}
```

`teacher_id` is present only when `audience` is `teacher`. `audience` is `coordination`, `secretary`, or `teacher`.

`GET /destinations` items:

```json
{ "audience": "teacher", "teacher_id": 12, "name": "Ana Lima" }
```

Coordination and secretary use `"teacher_id": null` and `"name": null`.

`GET /conversations` items:

```json
{
  "id": 4,
  "student_id": 9,
  "audience": "coordination",
  "teacher_id": null,
  "last_message_at": "2026-10-06T14:00:00.000Z",
  "school_class_id": 310,
  "sender_line": "Diego, pai da Lara — 1º ano"
}
```

`school_class_id` is the child's current class, derived at read time. `sender_line` is the inbox identity, also derived at read time, from whoever sent the last message. When that sender is a linked guardian of this child, the line is that guardian's name, the relationship word on `student_guardians`, the child's name, and the series of the current class. Example: "Diego, pai da Lara — 1º ano". Relationship words: `father` → pai, `mother` → mãe, `other` → responsável. When the last sender is staff, the line is still one short string: the role label (coordenação, secretaria, direção) or the teacher name, then the child and the series. When the conversation has no message yet, `sender_line` is null.

`GET /conversations/:id/messages` items, in `sent_at` order:

```json
{ "id": 8, "sender_membership_id": 3, "body": "Hello", "sent_at": "2026-10-06T14:00:00.000Z" }
```

`201` from `POST /messages`:

```json
{
  "data": {
    "conversation_id": 4,
    "message": {
      "id": 8,
      "sender_membership_id": 3,
      "body": "Hello",
      "sent_at": "2026-10-06T14:00:00.000Z"
    }
  }
}
```

`conversation_id` is the existing conversation or the one just created. A second send with the same child and destination appends; it does not create a second conversation.

Bell: existing notification payload gains `conversation_id` (null when the row is not a chat). Chat rows use `kind` `message`.

Errors for these four routes:

| HTTP | `error.code` | When |
|------|--------------|------|
| `404` | `not_found` | Other family, other school, or a conversation this actor cannot see |
| `422` | `teacher_not_assigned` | Requested teacher has no kept teaching assignment on the child's current class |
| `422` | `empty_content` | Blank `body` |

Policy denies by default. An unlinked guardian does not create a conversation (`404`). Secretary reads only secretary conversations. A teacher reads only conversations whose `teacher_id` is themselves, and only while assigned to the child's current class. Coordination and director read and reply on every audience. Director is not a destination.

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

Family chat does not call this push pipeline. Absence and other channel policies stay in [`notifications.md`](../../prds/communication/notifications.md).

---

## Permissions

Family chat is deny-by-default from role and link, not from `send_messages` or `moderate_messages`. The matrix is in [`messages.md`](../../prds/communication/messages.md) § Permissions.

`publish_announcements` remains the key for the announcements routes above. Catalog: [`identity-and-onboarding/permissions.md`](../../prds/identity-and-onboarding/permissions.md).

---

## Errors

Family chat errors are in the section above (`404` `not_found`, `422` `teacher_not_assigned`, `422` `empty_content`). This delivery does not use `403` `family_isolation_violation` or an attachment size error on those four routes.

---

## OpenAPI tags

`Communication`, `Announcements`, `Guardian Me`
