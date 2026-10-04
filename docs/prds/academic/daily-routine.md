# PRD — Academic: Daily Routine (BC11)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `academic.log_daily_routine`  
> Related BCs: [`../communication/messages.md`](../communication/messages.md) (family thread), [`../communication/media.md`](../communication/media.md) (attachments)  
> Modeling: [`docs/modeling/007-academic.md`](../../modeling/007-academic.md)  
> API: [`docs/api/v1/academic.md`](../../api/v1/academic.md)

---

## Objective

Let a teacher record one **daily routine** card per child per day for early-childhood classes, and
let the family read that card on the child's private thread.

---

## Context

The school's paper agenda (agenda de papel) is the **content reference** for which facts belong on
the card: the day's narrative, sleep, meals, and signals. It is not the screen. The web SPA opens
on today, lists the class, and leads with the narrative; sleep, meals, and signals stay collapsed.
This PRD does not specify that layout.

Competitors ship an infant day log (Proesc **rotina escolar** — meals and care, per student or
class). School Lab's cut is narrower: grades `infantil_1` through `infantil_5` only
(`SchoolClass::GRADE_LEVELS`), one row per child per date, no push, and a single card posted into
the family thread defined in [`messages.md`](../communication/messages.md).

`academic.deliver_diary_to_families` (pushing a diary) stays phase 2. Sending the card does not
notify.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Log early childhood daily routine | `academic.log_daily_routine` | [`DIV-academic-004`](../../ref/divergencias.md); Proesc rotina escolar in [`proesc/comunicacao/modelo-de-dominio.md`](../../ref/proesc/comunicacao/modelo-de-dominio.md) |

Field set, same-day lock, and "blank stays hidden" are `[product decision]` for this cut. The
paper agenda supplies the facts; it does not supply the UI.

---

## Actors and surfaces

| Actor | Surfaces | Notes |
|-------|----------|-------|
| teacher | Web SPA (`/app`) | Role `teacher` plus a `teaching_assignment` on the child's current class. Upsert, apply a meal to the class, send |
| staff with `manage_academic` | Web SPA (`/app`) | Read every routine in the school. No write. Does not open the private thread |
| guardian (UI: **Responsável**) | Web SPA (`/app`) | Read sent cards for linked children. Blank fields are omitted. A later comment is a message on the family thread |

`moderate_messages` does not grant routine access and does not open the thread.

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Only classes whose `grade_level` is `infantil_1`, `infantil_2`, `infantil_3`, `infantil_4`, or `infantil_5` |
| `fundamental_medio` | no | `422` `not_infantil` |
| `pj_financeiro` | no | — |
| `multi_unidade` | partial | Scoped by `school_id` |

---

## Business Rules

BR-DR01 — `capability_id`: `academic.log_daily_routine`

A **daily routine** (`daily_routines`) belongs to one `school_id`, one `student_id`, one
`school_class_id` (the child's current class; DBML table `classes`), one `date`, and one
`author_id` (the `teachers` row of the teacher who writes it). At most one row per
`(school_id, student_id, date)`. The row is not discarded; sent content is not hard-deleted
(BR-DR09).

BR-DR02

The class `grade_level` must be `infantil_1` … `infantil_5`. Any other class is `422`
`not_infantil`.

BR-DR03

Authorization to write matches Preceptoria's teacher rule: membership role `teacher` and a
`teaching_assignment` on that class. A teacher outside the class, another school, or another
family receives `404` `not_found`. This cut does not add a permission key. `manage_academic` is
read-only on these rows and cannot read the family thread.

BR-DR04

Columns, all optional except the identity in BR-DR01:

| Group | Columns | Values |
|-------|---------|--------|
| Narrative | `narrative` | text, nullable |
| Sleep | `sleep_morning`, `sleep_after_lunch`, `sleep_afternoon` | null, `yes`, `no` |
| Signals | `interaction`, `evacuation`, `discomfort` | null, `yes`, `no` |
| Discomfort note | `discomfort_detail` | text; **sensitive** |
| Meals | `meal_breakfast`, `meal_lunch`, `meal_afternoon_snack`, `meal_dinner`, `meal_hydration` | null, `great`, `regular`, `refused` |
| Lifecycle | `status`, `sent_at` | `draft` or `sent`; `sent_at` set on send |

`discomfort_detail` is required when `discomfort` is `yes`, and must be empty otherwise (`422`
`discomfort_detail_required`). Null fields are omitted from the guardian payload.

BR-DR05

The card may change on the same civil day in `America/Sao_Paulo` (the date equals today in that
zone). On a later civil day, a write returns `409` `routine_day_locked`. A comment after that
lock is a new message on the family thread, not a change to this row.

BR-DR06

`PUT` upserts by student and date, in the same spirit as `PUT /lesson_plans`. It does not post a
thread card. `POST .../apply_meals` sets **one** meal column for the class, only where that
column is still null. It does not send, and it does not replace a value already stored. Children
with no row yet receive a `draft` with only that meal filled.

BR-DR07

`POST .../send` requires a narrative, at least one non-null field, or at least one attachment.
It sets `status` to `sent`, sets `sent_at`, and posts **one** message with `kind: routine` and
`daily_routine_id` on the child's family thread (the thread is created then if it does not exist).
A second send does not post a second card (`409` `routine_already_sent`). Same-day edits after
send update this row; the existing card still points at it.

BR-DR08

Attachments use `communication_attachments` ([`media.md`](../communication/media.md) BR-D02):
jpeg, png, webp, audio (`webm`, `mp4`, `mpeg`, `ogg`), short video (`video/mp4`, `video/webm`),
10 MB, 5 files, no transcoding. They may hang on the routine before send and move with the card.

BR-DR09

Sent content is not hard-deleted. Retention length stays open
([`open-questions.md`](../../open-questions.md) § LGPD). Guardian reads are family-scoped.
Cross-family and cross-school ids return `404` `not_found`.

---

## Use Cases

### UC-DR01 — Upsert today's card

Input: `student_id`, `date`, any BR-DR04 fields, optional `attachment_ids`.

Flow

1. Resolve the child's current class; reject unless `infantil_1` … `infantil_5` (BR-DR02).
2. Authorize the teacher by role and `teaching_assignment` (BR-DR03).
3. Reject when `date` is before today in `America/Sao_Paulo` (BR-DR05).
4. Insert or update the single row for that student and date. Leave `status` as it is (`draft`
   until the first send).

### UC-DR02 — Apply one meal to the class

Input: `school_class_id`, `date`, one meal field name, one meal value.

Flow

1. Authorize as in UC-DR01 for that class.
2. For each child in the class, set that meal column only when it is null (BR-DR06).
3. Do not post messages and do not change `status` to `sent`.

### UC-DR03 — Send the card

Input: `daily_routine` id.

Flow

1. Reject an empty card (BR-DR07) and a card already sent.
2. Post one `kind: routine` message on the family thread.
3. Mark the row `sent`.

### UC-DR04 — Coordination reads the school

Input: optional `school_class_id`, `date`.

Flow

1. `manage_academic` lists routines in the school, including drafts.
2. The same actor receives `404` on the family thread.

### UC-DR05 — Guardian reads the day

Input: linked `student_id`, optional `date`.

Flow

1. Return `sent` rows only, with null fields omitted (BR-DR04).
2. Another family's id returns `404`.

---

## API

Base (teacher and coordination): `/api/v1/schools/:school_id/academics`  
Base (guardian): `/api/v1/schools/:school_id/me`

| Method | Path | Purpose |
|--------|------|---------|
| `PUT` | `/daily_routines` | Upsert by `student_id` + `date` (UC-DR01) |
| `POST` | `/daily_routines/apply_meals` | One meal field for the class (UC-DR02) |
| `POST` | `/daily_routines/:id/send` | One routine card on the family thread (UC-DR03) |
| `GET` | `/daily_routines` | Teacher: assigned Infantil classes. `manage_academic`: school, read-only (UC-DR04) |
| `GET` | `/me/daily_routines` | Guardian, sent cards, nulls omitted (UC-DR05) |

Upsert request:

```json
{
  "daily_routine": {
    "student_id": 88,
    "date": "2026-10-04",
    "narrative": "Manhã tranquila na rodinha.",
    "sleep_morning": "yes",
    "sleep_after_lunch": "yes",
    "sleep_afternoon": null,
    "interaction": "yes",
    "evacuation": "no",
    "discomfort": "yes",
    "discomfort_detail": "Queixou-se da barriga depois do almoço.",
    "meal_breakfast": "great",
    "meal_lunch": "regular",
    "meal_afternoon_snack": null,
    "meal_dinner": null,
    "meal_hydration": "great",
    "attachment_ids": [12]
  }
}
```

Apply meals request:

```json
{
  "school_class_id": 14,
  "date": "2026-10-04",
  "field": "meal_lunch",
  "value": "great"
}
```

`field` is one of `meal_breakfast`, `meal_lunch`, `meal_afternoon_snack`, `meal_dinner`,
`meal_hydration`.

The thread routes that receive the card are in
[`docs/api/v1/communication.md`](../../api/v1/communication.md).

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 404 | `not_found` | Outside the family, the class, or the school |
| 403 | `forbidden` | `manage_academic` attempting to write |
| 409 | `routine_day_locked` | Write on a date before today in `America/Sao_Paulo` |
| 409 | `routine_already_sent` | Second send |
| 422 | `empty_content` | Send with no narrative, no filled field, and no attachment |
| 422 | `discomfort_detail_required` | Detail missing when discomfort is `yes`, or present otherwise |
| 422 | `not_infantil` | Class is not `infantil_1` … `infantil_5` |
| 422 | `unsupported_media_type` | Attachment outside the media allow-list |
| 422 | `file_too_large` | Attachment over 10 MB |
| 422 | `too_many_files` | More than 5 attachments |

---

## Database

Entity groups only. Columns and indexes: [`007-academic.md`](../../modeling/007-academic.md) and
[`schema.dbml`](../../database/schema.dbml).

| Artifact | Location |
|----------|----------|
| Narrative DSL | [`docs/modeling/007-academic.md`](../../modeling/007-academic.md) |
| DBML | [`docs/database/schema.dbml`](../../database/schema.dbml) |
| DER | `docs/database/der_007.png` *(not re-exported in this pass)* |

`daily_routines` is the card. `communication_attachments` may point at the card or at the routine
message. `messages.daily_routine_id` is unique and identifies the one card on the thread.

---

## Events

None in this cut. Send writes the routine message directly. It does not emit a push intent.

---

## Permissions

| Actor | Upsert / apply meals / send | Read routines | Read family thread |
|-------|-----------------------------|---------------|--------------------|
| `teacher` with `teaching_assignment` on the class | yes | own classes | yes, as a thread participant |
| `manage_academic` | no (`403`) | school | no (`404`) |
| guardian linked to the student | no | sent cards for linked children | yes, as a thread participant |
| `moderate_messages` | no | no | no (`404`) |

No new permission key.

---

## Non-functional requirements

Cross-cutting catalog: [`docs/product/non-functional-requirements.md`](../../product/non-functional-requirements.md).

- [NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy) — `discomfort_detail` is health data. Guardian reads are family-scoped. Retention is open; sent rows are not hard-deleted.
- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — every row has `school_id`.
- Same-day boundary uses `America/Sao_Paulo`, not the server's UTC date alone.

---

## Acceptance Criteria

AC-DR01

- [ ] Given a teacher assigned to class `infantil_3`  
      When they PUT a routine for a child in that class for today in `America/Sao_Paulo`  
      Then one draft row exists for that student and date  
- Source: `[product decision]` — BR-DR01, BR-DR02

AC-DR02

- [ ] Given `discomfort` is `yes` and `discomfort_detail` is blank  
      When the teacher saves  
      Then the API returns `422` `discomfort_detail_required`  
- Source: `[product decision]` — BR-DR04

AC-DR03

- [ ] Given a routine dated yesterday in `America/Sao_Paulo`  
      When the teacher PUTs again  
      Then the API returns `409` `routine_day_locked` and the stored row is unchanged  
- Source: `[product decision]` — BR-DR05

AC-DR04

- [ ] Given lunch is already `regular` for one child and blank for another  
      When the teacher applies `meal_lunch` = `great` to the class  
      Then only the blank child becomes `great`, nothing is sent, and no thread card is created  
- Source: `[product decision]` — BR-DR06

AC-DR05

- [ ] Given a draft with a narrative  
      When the teacher sends it  
      Then `status` is `sent` and the family thread has exactly one message with `kind: routine` pointing at that row  
- [ ] Given the same routine is sent again  
      When the second request arrives  
      Then the API returns `409` `routine_already_sent` and the thread still has one card  
- Source: `[product decision]` — BR-DR07

AC-DR06

- [ ] Given a sent routine with `sleep_afternoon` null  
      When the linked guardian reads `/me/daily_routines`  
      Then `sleep_afternoon` is absent from the payload  
- [ ] Given another family's guardian requests that id  
      When the API responds  
      Then the status is `404` `not_found`  
- Source: `[product decision]` — BR-DR04, BR-DR09

AC-DR07

- [ ] Given a staff member with `manage_academic` and without a teaching assignment  
      When they GET `/academics/daily_routines`  
      Then they receive the school's cards  
- [ ] Given that same staff member opens the child's conversation  
      When the API responds  
      Then the status is `404` `not_found`  
- Source: `[product decision]` — BR-DR03

AC-DR08

- [ ] Given a class whose `grade_level` is not `infantil_1` … `infantil_5`  
      When a teacher PUTs a routine for a child in that class  
      Then the API returns `422` `not_infantil`  
- Source: `[product decision]` — BR-DR02

---

## Open items / pending decisions

- [x] Field set, one card per child per date, Infantil grade keys, same-day edit, blank fields hidden — this cut ([`open-questions.md`](../../open-questions.md) § Early childhood).
- [ ] How long routine history stays available ([`open-questions.md`](../../open-questions.md) § LGPD and § Early childhood).
- [ ] Differentiated retention for `discomfort_detail` versus other child data.

---

## Out of Scope

- Reproducing the paper agenda as the screen.
- Hygiene, diaper, mood, or a general health form beyond `discomfort` / `discomfort_detail`.
- Push, mobile screens, and `academic.deliver_diary_to_families`.
- Classes outside `infantil_1` … `infantil_5`.
- Editing or deleting the routine message. A later comment is a new thread message.
- More than one card per child per date.
- Transcoding attachments, or files outside the communication allow-list.
