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
| `GET` | `/destinations?student_id=` | Linked guardian | Coordination, secretary, Direção (`director`), and the teachers of the child's current class, in that order. Direção is always present, even with no active director membership. Each teacher is one object (`teacher_id`, `name`) even with two subjects. No teacher object when the child has no teacher. |
| `GET` | `/roster?school_class_id=` | Teacher, secretary, coordination, or director | Children of that class. A teacher sees only a class they have a kept teaching assignment for. Teachers do not use `GET /students` and do not need `manage_people`. Secretary, coordination, and director see any class in the school. |
| `GET` | `/search?q=` | Teacher, secretary, coordination, or director | Type-ahead, cross-class roster lookup matched by the student's name or any of their guardians' names. Same visibility as `/roster`, widened from one class to every class the actor may see: a teacher only gets hits from classes they currently teach; secretary, coordination, and director get school-wide hits. |
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

`teacher_id` is present only when `audience` is `teacher`. `audience` is `coordination`, `secretary`, `director`, or `teacher`. `director` is the school's Direção (UI label Direção); it is one conversation per child, with `teacher_id` null.

`GET /destinations` items:

```json
{ "audience": "teacher", "teacher_id": 12, "name": "Ana Lima" }
```

Coordination, secretary, and director use `"teacher_id": null` and `"name": null`. The list is always in this order: coordination, secretary, director, then each teacher of the current class once, ordered by teacher id. The director item is always present, for every child:

```json
{
  "data": [
    { "audience": "coordination", "teacher_id": null, "name": null },
    { "audience": "secretary", "teacher_id": null, "name": null },
    { "audience": "director", "teacher_id": null, "name": null },
    { "audience": "teacher", "teacher_id": 12, "name": "Ana Lima" }
  ]
}
```

A child with no teaching assignment returns coordination, secretary, and director only. `director` is a destination (an audience), not a person, so it does not depend on whether the school currently has a director membership.

`GET /roster` items for a teacher, secretary, or coordination. `conversation_id` and `sender_line` are null when that actor's conversation has no message yet, including when no conversation row exists. Once a message exists, those two fields are the attached conversation: teacher → audience `teacher` with that teacher's `teacher_id`; secretary → audience `secretary`; coordination → audience `coordination`. Director conversations (`audience` `director`) are never attached to a roster or search row, for any actor; the roster does not show them (follow-up tracked in `messages.md` § Open items).

Each teacher row includes `teacher_id` set to the acting teacher's id, including when `conversation_id` and `sender_line` are null, so the school SPA can send the first message from an empty inbox. Secretary and coordination rows set `teacher_id` to null.

Teacher item:

```json
{
  "conversation_id": null,
  "school_class_id": 310,
  "sender_line": null,
  "student_active": true,
  "student_id": 9,
  "student_name": "Lara Costa",
  "teacher_id": 12
}
```

`student_active` (boolean) is on every `/roster` and `/search` row: `false` when the child was transferred (`status` `transferred`). The row stays listed so staff can open the history, but the chat is closed and `POST /messages` is rejected with `409` `student_inactive`. Children removed from the roll (discarded) are not listed by `/roster` or `/search` at all.

A director-role viewer does not attach one conversation. `conversation_id` and `sender_line` stay null, the item omits `teacher_id`, and the item includes `destinations` (coordination, secretary, then each class teacher once). Unlike `GET /destinations`, this list omits `director`: the staff-side roster does not offer the Direção destination yet (see `messages.md` § Open items).

```json
{
  "conversation_id": null,
  "destinations": [
    { "audience": "coordination", "name": null, "teacher_id": null },
    { "audience": "secretary", "name": null, "teacher_id": null },
    { "audience": "teacher", "name": "Ana Lima", "teacher_id": 12 }
  ],
  "school_class_id": 310,
  "sender_line": null,
  "student_active": true,
  "student_id": 9,
  "student_name": "Lara Costa"
}
```

An empty class that actor may see returns `200` with `{ "data": [] }`.

`GET /search?q=` — additive UX improvement on top of the roster above, not a change to family-chat
visibility or business rules (see `messages.md` § Open items). `q` under 2 characters (including
blank or omitted) returns `200` with `{ "data": [] }` rather than a `422` — this is a type-ahead,
not a form field. Matching is case-insensitive, on the student's own name or the name of any of
their kept guardians (reusing the same `name`/`cpf` search behavior as `GET /people/students` and
`GET /people/guardians`). Results are capped at 20 rows, ordered by student name — this is a
type-ahead list, not a paginated one, so there is no Pagy envelope.

Each item has the same shape as a `/roster` item for that actor (teacher rows keep `teacher_id`;
director rows swap it for `destinations`, computed per hit against that hit's own
`school_class_id` since a search page can mix classes), plus `guardians`: that student's kept
guardians, each `{ "name": "...", "relationship": "father" | "mother" | "other" }`, ordered
father, then mother, then other.

```json
{
  "data": [
    {
      "student_id": 9,
      "student_name": "Lara Costa",
      "school_class_id": 310,
      "conversation_id": null,
      "sender_line": null,
      "teacher_id": 12,
      "guardians": [
        { "name": "Diego Costa", "relationship": "father" }
      ]
    }
  ]
}
```

`/roster` items never include `guardians` — this field is specific to `/search`.

`GET /conversations` items:

```json
{
  "id": 4,
  "student_id": 9,
  "student_name": "Lara Costa",
  "audience": "coordination",
  "teacher_id": null,
  "teacher_name": null,
  "last_message_at": "2026-10-06T14:00:00.000Z",
  "last_message_body": "Pode buscar mais cedo?",
  "school_class_id": 310,
  "sender_line": "Diego, pai da Lara — 1º ano",
  "student_active": true
}
```

`student_active` is `false` when the child is no longer enrolled (removed from the roll or transferred). Those conversations stay listed and readable to staff who could see them before; the school SPA should show a closed-chat notice and disable the composer. `student_name` is the child's name. `teacher_name` is the teacher name when `audience` is `teacher`, and null otherwise. `last_message_body` is the full body of the latest message, and null only when the conversation has no message. `school_class_id` is the child's current class, derived at read time.

`sender_line` on a conversation is always the family identity, derived at read time, never the staff role of the last speaker. If a linked guardian has sent in the conversation, the line is the guardian who sent most recently: that guardian's name, the relationship word on `student_guardians`, the child's name, and the series of the current class. Example: "Diego, pai da Lara — 1º ano". Relationship words: `father` → pai, `mother` → mãe, `other` → responsável. If only staff has written, the line uses the primary kept guardian link (`primary_guardian`), otherwise the first kept link, with the same shape. If there is no kept guardian link, the line is the child's name and the series only. When the conversation has no message yet, `sender_line` is null.

`GET /conversations/:id/messages` returns `meta.student_active` (boolean, same meaning as on the conversation) next to `page`, `per_page` and `total`, so a thread opened by id knows whether it is closed. History of a closed thread is still returned. Items are in `sent_at` order. `sender_line` on a message names who spoke on that row: the guardian line above, or the staff line (coordenação, secretaria, direção, or the teacher name), then the child and the series.

```json
{ "id": 8, "sender_membership_id": 3, "sender_line": "Diego, pai da Lara — 1º ano", "body": "Hello", "sent_at": "2026-10-06T14:00:00.000Z" }
```

`201` from `POST /messages` includes the same `sender_line` on `message`:

```json
{
  "data": {
    "conversation_id": 4,
    "message": {
      "id": 8,
      "sender_membership_id": 3,
      "sender_line": "Diego, pai da Lara — 1º ano",
      "body": "Hello",
      "sent_at": "2026-10-06T14:00:00.000Z"
    }
  }
}
```

`conversation_id` is the existing conversation or the one just created. A second send with the same child and destination appends; it does not create a second conversation.

Bell: existing notification payload gains `conversation_id` (null when the row is not a chat). Chat rows use `kind` `message`.

Errors for these five routes:

| HTTP | `error.code` | When |
|------|--------------|------|
| `404` | `not_found` | Other family, other school, a conversation this actor cannot see, or a class the teacher does not teach |
| `403` | `forbidden` | A guardian, or other staff who cannot open the roster |
| `422` | `teacher_not_assigned` | Requested teacher has no kept teaching assignment on the child's current class |
| `422` | `empty_content` | Blank `body` |
| `409` | `student_inactive` | `POST /messages` for a child who is no longer enrolled (removed from the roll or transferred). Only returned to an actor who could otherwise write to that child (checked after destination and teacher-assignment rules); anyone else still gets `404`. No conversation or message is created. |

`GET /search` uses the same `403 forbidden` as the roster for a guardian or other staff who may
not browse it. It never `404`s or `422`s — a query with no visible match (short query, no hit, a
foreign school) is simply `200` with `{ "data": [] }`.

Policy denies by default. An unlinked guardian does not create a conversation (`404`). Secretary reads only secretary conversations. A teacher reads only conversations whose `teacher_id` is themselves, and only while assigned to the child's current class. Coordination and director read and reply on every audience. Linked guardians read every conversation of their child, including `director`. A `director` conversation is hidden with `404` from secretary and from teachers. Bell rows for `audience` `director` go to linked guardians (except the sender), coordination, and director memberships only.

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

Family chat errors are in the section above (`404` `not_found`, `403` `forbidden`, `422` `teacher_not_assigned`, `422` `empty_content`, `409` `student_inactive`). This delivery does not use `403` `family_isolation_violation` or an attachment size error on those five routes. The roster uses the existing `forbidden` code.

---

## OpenAPI tags

`Communication`, `Announcements`, `Guardian Me`
