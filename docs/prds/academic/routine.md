# PRD — Academic: Infant Daily Routine / Rotina Infantil (BC11)

> Status: validated
> Parent PRD: [`index.md`](index.md)
> Capability IDs: `academic.log_daily_routine`
> Related BCs: [`diary.md`](diary.md) (BC4 — previously the placeholder pointer for this
> capability; diary.md does not model any routine fields, see Context),
> [`incidents.md`](incidents.md) (BC7 — PDF preview + guardian notification patterns reused here),
> [`lesson-plans.md`](lesson-plans.md) (BC10 — upsert-by-day pattern reused here)
> Modeling: *(pending — `docs/modeling/007-academic.md`)*
> API narrative: *(pending — `docs/api/v1/academic.md`)*

---

## Objective

Let a teacher record, per child per day, a simple **daily routine** (snack eaten, diaper/bathroom
counts, notes) for early-childhood (`infantil`) classes, save progress as a draft, and send it —
sending notifies that child's guardians in the app the same day.

---

## Context

`academic.log_daily_routine` has been a named P2 capability across this repo for a while
(`docs/actors-and-surfaces.md`, `docs/open-questions.md` § "Early childhood education / Daily
routine (phase 2)", `docs/vision.md`) but was never built — three sibling PRDs
(`diary.md`, `attendance.md`, `incidents.md`) each list it in their own Out of Scope, and
`docs/product/parity-matrix.md`/`capability-map.md`/`mvp-scope.md` all pointed it at `diary.md` as
a stand-in (even though `diary.md` itself only references the gap — it does not model meals,
sleep, hygiene, health, or mood). This PRD is the real file those pointers expected
(`prds/academic/routine.md`, already the literal path in `parity-matrix.md`'s row before this file
existed).

The full phase-2 vision in `open-questions.md` is broader than what's built here: meals, sleep,
hygiene/diaper, health, mood, and photos. The product owner confirmed (2026-10-03) a **narrower
first slice**: only snack (lanche), diaper events (cocô/xixi, as counts not individual timestamped
events), and free-text notes. Sleep, health, mood, and photos remain deferred — see Open items.

No "educational segment" (infantil vs fundamental/médio) exists as an enforced gate anywhere in the
codebase today — `school_class` only has a free-text `grade_level` string (e.g. `infantil_1`), no
`segment` enum or scope. This PRD does not introduce one: the menu entry and roster are not
hard-restricted to infantil classes — they naturally only show a teacher's own assigned classes
(BR-DR07). If a hard segment gate is needed later, `grade_level.start_with?("infantil")` is the
hook (see BR-DR09).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Log early childhood daily routine | `academic.log_daily_routine` | [`DIV-academic-004`](../../ref/divergencias.md); `docs/product/capability-map.md`; Proesc/Agenda Edu routine modules |

---

## Actors and surfaces

| Actor | Surfaces | Notes |
|-------|----------|-------|
| teacher | Web SPA (`/app`) | Records/edits routine entries for students in their assigned classes; sends |
| staff with `manage_academic` | Web SPA (`/app`) | Read/write any entry in the school |
| guardian | Web SPA (`/app`), mobile | Reads **sent** entries only for their own linked children; in-app notified on send |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Primary use case |
| `fundamental_medio` | no | Not the intended audience, but not hard-blocked (BR-DR09) |
| `pj_financeiro` | — | — |
| `multi_unidade` | partial | Per-school, same as the rest of academic |

---

## Business Rules

BR-DR01 — `capability_id`: `academic.log_daily_routine`

A **daily routine entry** (`daily_routine_entries`) belongs to exactly one `student_id` and one
`date`. One entry per `(student_id, date)` — submitting again for the same pair updates the
existing row in place rather than creating a second one (same upsert shape as `lesson-plans.md`
BR-LP04).

BR-DR02 *(scope note)*

This PRD covers only snack, diaper counts, and notes — not sleep, health, mood, or photos. Those
remain the deferred part of `docs/open-questions.md`'s broader phase-2 vision; see Open items.

BR-DR03 *(fields)*

| Field | Template concept | Type |
|-------|-------------------|------|
| `snack_eaten` | Comeu o lanche | boolean, **nullable** — `null` means not yet recorded, distinct from "recorded as not eaten" (`false`) `[product decision]` |
| `poop_count` | Fez cocô — quantas vezes | integer, `>= 0`, default `0` |
| `pee_count` | Fez xixi — quantas vezes | integer, `>= 0`, default `0` |
| `notes` | Observações | text, optional |

Counts are simple daily totals, not individual timestamped events — per-event granularity (one of
`open-questions.md`'s open items for the broader vision) is not built here `[product decision]`.

BR-DR04 *(status — simple two-state, no AASM)*

`status` is `draft` or `sent` (`validates :status, inclusion:` — same plain-column pattern as
`school_year.rb`'s `STATUSES`, not an AASM machine, since this is a simple two-state flag). Every
upsert (icon taps, notes edits) saves immediately as `draft` (or leaves it `sent` if already sent —
editing after sending does not revert it to `draft`, see BR-DR05's idempotency note). A dedicated
`POST .../daily_routine_entries/:id/send` action transitions `draft → sent`. Calling `send` again on
an already-`sent` entry is idempotent — `200`, no error, no second notification (mirrors
`incidents.md` BR-IN08's idempotent re-approval).

BR-DR05 *(notification)*

On the `draft → sent` transition (first time only, per BR-DR04's idempotency), the student's linked
guardians are notified in-app via the existing pipeline (`NotificationIntent` →
`Notifications::ProcessIntentService`, same `student.student_guardians` targeting as
`Incidents::IncidentPublishedJob` — see `incidents.md`), `channel_key: "daily_routine"`. No
notification fires on draft saves. Editing fields after `sent` does **not** re-notify
`[product decision]` — revisit if teachers need a "correct and re-notify" path later.

BR-DR06 *(guardian visibility)*

`GET .../me/students/:id/daily_routine_entries` exposes only `sent` entries for the guardian's own
linked children (`student_guardians`) — drafts are never guardian-visible, same as
`lesson-plans.md`/`incidents.md`'s published-only guardian exposure. Cross-family guardian → `404`.

BR-DR07 *(teacher scope)*

Only a teacher with a `TeachingAssignment` to the student's `school_class`, or staff with
`manage_academic`, may create, update, or send an entry for that student. Wrong teacher → `403`.

BR-DR08

All queries scoped by `school_id` (NFR-003); an entry is never visible across schools.

BR-DR09 *(no segment-level enforcement)*

No code-level "educational segment" gate exists in this codebase (`school_class.grade_level` is a
free-text/enum string, not a segment flag). This version does not add one — the menu entry and
roster are implicitly infantil-relevant because they only ever show the teacher's own assigned
classes. If a hard restriction becomes necessary, gate on
`school_class.grade_level.start_with?("infantil")` `[product decision]`.

BR-DR10 *(web SPA — immutability after send)*

In the teacher-facing web SPA roster (UC-DR01/UC-DR02), once an entry's `status` is `sent`, the
`notes` ("Observações") field and the send/resend control are rendered disabled — the teacher
cannot edit Observações or trigger `send` again from that surface. This supersedes the earlier
assumption in BR-DR04/BR-DR05 that post-send edits were allowed through the UI: they are not.
This is a **client-side UI rule only** — the underlying API endpoints (`PUT
.../daily_routine_entries`, `POST .../send`) are unchanged and remain idempotent per BR-DR04 (e.g.
for other clients or support tooling) `[product decision, 2026-10-05, LUI-5]`. See Open items on
whether a future "unlock to correct" staff action should be added.

---

## Use Cases

### UC-DR01 — Open the daily roster (teacher)

Input: `school_class_id`, `date` (defaults to today).

Flow

1. Resolve the teacher's `TeachingAssignment` rows for `school_class_id` (BR-DR07); `403` if none.
2. List `school_class.students.kept` with each student's existing entry for `date`, if any
   (`null`/unset fields when no entry exists yet).

### UC-DR02 — Record a routine entry (teacher)

Input: `student_id`, `date`, any of `snack_eaten`/`poop_count`/`pee_count`/`notes`.

Flow

1. Verify the requester's `TeachingAssignment` covers this student's `school_class` (BR-DR07).
2. Upsert by `(student_id, date)` (BR-DR01) — each icon tap/notes edit is its own immediate upsert
   call, always leaving `status` as `draft` unless the entry is already `sent` (BR-DR04).

### UC-DR03 — Send a routine entry (teacher)

Input: `daily_routine_entry_id`.

Flow

1. Verify requester scope (BR-DR07).
2. Set `status: sent`, `sent_at`, `sent_by_membership_id`; idempotent if already `sent` (BR-DR04).
3. On the actual `draft → sent` transition, emit `DailyRoutineSent` → notify guardians (BR-DR05).

### UC-DR04 — Read a child's sent routine (guardian)

Input: `student_id`, optional date range.

Flow

1. Verify the requester is a linked guardian of this student (BR-DR06) — `404` otherwise.
2. Return only `sent` entries.

---

## API

Base: `/api/v1/schools/:school_id/academics`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/school_classes/:school_class_id/daily_routine_entries?date=` | Roster + entries for a day (UC-DR01) |
| `PUT` | `/daily_routine_entries` | Upsert by `student_id` + `date` (UC-DR02, BR-DR01) |
| `POST` | `/daily_routine_entries/:id/send` | Send + notify (UC-DR03, BR-DR04/BR-DR05) |
| `GET` | `/me/students/:student_id/daily_routine_entries?from=&to=` | Guardian read, sent-only (UC-DR04, BR-DR06) |

Upsert request:

```json
{
  "daily_routine_entry": {
    "student_id": 9231,
    "date": "2026-10-03",
    "snack_eaten": true,
    "poop_count": 1,
    "pee_count": 3,
    "notes": "Dormiu bem na soneca da tarde."
  }
}
```

---

## Errors

| Status | Code | Description |
|--------|------|--------------|
| 403 | `forbidden` | Teacher without a `TeachingAssignment` to the student's class (BR-DR07) |
| 404 | `not_found` | Cross-school, cross-family guardian, or unknown student/entry |
| 422 | `validation_error` | Negative `poop_count`/`pee_count`, or other field validation failure |

---

## Database

| Entity | Purpose |
|--------|---------|
| `daily_routine_entries` | One row per `(student_id, date)`: `snack_eaten` (boolean, nullable), `poop_count`/`pee_count` (integer, default 0), `notes` (text), `status` (`draft`/`sent`), `sent_at`, `sent_by_membership_id`, `recorded_by_membership_id`, timestamps |
| `students` *(existing)* | Owns the entry |
| `teaching_assignments` *(existing)* | Resolves which classes/students a teacher may record for (BR-DR07) |
| `student_guardians` *(existing)* | Resolves notification/visibility targets (BR-DR05/BR-DR06) |

---

## Events

| Event | When | Consumers |
|-------|------|-----------|
| `DailyRoutineSent` | `draft → sent` transition (first time only) | Communication — notifies the student's linked guardians in-app (BR-DR05) |

---

## Permissions

| Key | create/update own | send own | read own | read all (school) | read (guardian, sent-only) |
|-----|--------------------|----------|----------|--------------------|------------------------------|
| teacher (assigned via `TeachingAssignment`) | yes | yes | yes | — | — |
| `manage_academic` | yes (any) | yes (any) | — | yes | — |
| guardian (`/me`, linked student) | — | — | — | — | yes |

---

## Non-functional requirements

- **[NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy)** — diaper/toileting data is child-sensitive; retention TBD, same open item as [`documents-and-archive/retention.md`](../documents-and-archive/retention.md).
- **[NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy)** — `school_id` scoping (BR-DR08).

---

## Acceptance Criteria

AC-DR01

- [ ] Given teacher T has a `TeachingAssignment` to class C, When T opens C's roster for a date,
      Then every student in C appears, each with their existing entry (or unset fields if none).
- Source: UC-DR01

AC-DR02

- [ ] Given a teacher taps the snack/poop/pee icons or edits notes, When the change is sent, Then
      it is persisted immediately as `draft` (or stays `sent` if already sent).
- Source: BR-DR04

AC-DR03

- [ ] Given an entry in `draft`, When the teacher sends it, Then `status` becomes `sent`,
      `sent_at` is set, and the student's linked guardians receive an in-app notification; a
      `draft` entry never notifies anyone.
- Source: BR-DR04, BR-DR05

AC-DR04

- [ ] Given an entry already `sent`, When `send` is called again, Then the response is `200` and
      no second notification is emitted.
- Source: BR-DR04

AC-DR05

- [ ] Given a guardian not linked to the student, When they request that student's entries, Then
      the API returns `404`.
- Source: BR-DR06

AC-DR06

- [ ] Given an entry still `draft`, When the student's guardian requests their routine entries,
      Then that entry is absent from the list.
- Source: BR-DR06

AC-DR07

- [ ] Given a teacher without a `TeachingAssignment` to the student's class, When they create,
      update, or send an entry for that student, Then the API returns `403`.
- Source: BR-DR07

AC-DR08

- [ ] Given an entry with `status: sent`, When the teacher views it in the web SPA roster, Then the
      Observações field is disabled (read-only) and the Enviar/Reenviar control is disabled, so no
      further edit or resend is possible from that surface.
- Source: BR-DR10

---

## Open items / pending decisions

- [ ] Broader phase-2 fields — sleep, health, mood, photos — remain deferred; same open item as
      [`open-questions.md`](../../open-questions.md) § Early childhood education / Daily routine.
- [ ] Whether a future "unlock to correct" action (e.g. by `manage_academic` staff) should allow
      editing a `sent` entry again from the web SPA, and if so, whether it should re-notify
      guardians (currently: the web SPA blocks all post-send edits, BR-DR10) `[product decision]`.
- [ ] Per-event (timestamped) granularity vs. this PRD's daily counts (BR-DR03) — still open for a
      future increment if finer detail is needed.
- [ ] Segment-level enforcement (BR-DR09) is not built — add a `grade_level` prefix check if a hard
      infantil-only restriction becomes necessary.

---

## Out of Scope

- Sleep, health, mood, and photo logging — future increment of the broader phase-2 vision.
- Real-time per-event push (e.g. notifying at the exact moment of each diaper change) — BR-DR05
  notifies once, on explicit send.
- Any approval/review workflow — none requested, same no-workflow precedent as `lesson-plans.md`.
