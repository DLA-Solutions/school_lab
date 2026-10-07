# PRD — Platform: School Calendar (BC3)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `platform.manage_school_calendar`  
> Related: [`school-year.md`](school-year.md); communication [`announcements.md`](../communication/announcements.md) (event publish boundary)  
> Modeling: [`009-platform-admin.md`](../../modeling/009-platform-admin.md)  
> API narrative: [`platform-and-admin.md`](../../api/v1/platform-and-admin.md)

---

## Objective

Provide an **institutional school calendar** (unit-wide events) and **staff personal events** so
teachers and secretaries see dates that matter — distinct from academic period boundaries and
communication announcement objects. Institutional events and holidays are also surfaced read-only
to guardians (`Calendário` in [`main-menu-description.md`](../../main-menu-description.md) line 128)
and are merged into the teacher's lesson-plan calendar
([`academic/lesson-plans.md`](../academic/lesson-plans.md)) so every audience sees the same
complete calendar `[product decision 2026-10-07]`.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Manage school calendar | `platform.manage_school_calendar` | [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md) — entity/unit calendar CRUD; [`proesc/comunicacao/funcionalidades-por-ator.md`](../../ref/proesc/comunicacao/funcionalidades-por-ator.md) — Proesc Agenda calendar events |
| Personal vs institutional | *(pattern)* | Proesc: all users see events; admins edit unit calendar |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Pedagogical dates, meetings |
| `fundamental_medio` | yes | Primary use |
| `pj_financeiro` | yes | — |
| `multi_unidade` | partial | Per-school calendar in MVP |

---

## Context

**Holidays** that affect attendance are owned by [`school-year.md`](school-year.md) (`school_holidays`).
**Calendar events** here are informational — meetings, pedagogical days, internal games, exams,
reminders — and may later sync to communication `publish_calendar_event` `[product decision]`.

Teachers view calendar on web and mobile per [`actors-and-surfaces.md`](../../actors-and-surfaces.md).

**Guardian access (resolved 2026-10-07):** guardians get a **read-only** merged feed —
`school`-visibility institutional events (BR-CA01) plus holidays and instructional days from
[`school-year.md`](school-year.md) — under the `Calendário` menu item that
[`main-menu-description.md`](../../main-menu-description.md) line 128 has held hidden pending this
contract. This supersedes the earlier "guardian calendar access remains deferred" framing; see
BR-CA07. Guardians never see `staff_only` events or any staff personal event.

---

## Business Rules

BR-CA01 — `capability_id`: `platform.manage_school_calendar`

**Institutional events** (`calendar_events`): scoped to `school_id`, optional `school_year_id`,
`title`, `description`, `starts_at`, `ends_at`, `all_day`, `visibility` ∈ `school | staff_only`,
`category` ∈ `meeting | pedagogical_day | internal_game | exam | other` (default `other`)
`[product decision 2026-10-07]`. For MVP, `school` visibility means all authenticated staff/teacher
memberships in that school **and** guardians with a kept `student_guardians` link to this school
(read-only, BR-CA07) `[product decision 2026-10-07]` — supersedes the earlier deferred framing.
`staff_only` visibility excludes guardians entirely, for internal meetings and similar.

BR-CA02

**Personal events** use the same `calendar_events` table with non-null `user_id` + `school_id`;
rows are visible only to the owner unless sharing is introduced later `[product decision]` —
MVP: owner only. Institutional events have null `user_id`.

BR-CA03

Institutional event CRUD requires `manage_calendar` permission — director, coordenação, or
secretaria system template, or owner (owner holds every staff key per identity BR-P04)
`[product decision 2026-10-07]`. Teachers may create personal events only.

BR-CA04

Events may reference `school_year_id` for filtering; events outside active year still display if
within list window.

BR-CA05

Deleting institutional event is soft-delete (`discarded_at`) with audit.

BR-CA06

No recurrence engine in MVP — single-occurrence events only; recurring deferred P2.

BR-CA07 *(product decision 2026-10-07)*

Guardians have **read-only** access to `school`-visibility institutional events plus holidays and
instructional days from [`school-year.md`](school-year.md), scoped to the school(s) of their kept
`student_guardians` links — same cross-family isolation rigor as every other guardian-facing
contract ([NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy)). Guardians
never see `staff_only` events, personal events, or write to any calendar entity.

---

## Use Cases

### UC-CA01 — Create institutional event

Input: title, dates, visibility, optional year.

Flow

1. Validate `manage_calendar` permission (BR-CA03).
2. Persist `calendar_events`.
3. Optional: prompt "Publish to guardians?" → manual handoff to comms `[product decision]`.

### UC-CA02 — View school calendar (staff/teacher)

Input: date range, filters (institutional vs personal).

Flow

1. Merge institutional events (`school` + `staff_only` visibility) + user's personal events +
   holidays/instructional days from school-year BC.
2. Return unified feed for SPA/mobile month view.

### UC-CA03 — Manage personal event

Input: CRUD for authenticated staff/teacher.

Flow

1. Scope to current user (BR-CA02).

### UC-CA04 — View school calendar (guardian, BR-CA07, product decision 2026-10-07)

Input: date range.

Flow

1. Resolve the guardian's kept `student_guardians` links to determine in-scope school(s).
2. Merge `school`-visibility institutional events + holidays + instructional days from school-year
   BC for that school — no personal events, no `staff_only` events.
3. Return read-only feed for the guardian's `Calendário` menu item.

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/calendar/events` | Unified feed, staff/teacher (UC-CA02) |
| `POST` | `/calendar/institutional_events` | Create — `manage_calendar` (BR-CA03) |
| `PATCH/DELETE` | `/calendar/institutional_events/:id` | Update/remove — `manage_calendar` |
| `CRUD` | `/calendar/personal_events` | Owner scoped |
| `GET` | `/me/calendar/events` *(new, BR-CA07/UC-CA04, product decision 2026-10-07)* | Unified read-only feed, guardian — family-scoped per [`multi-tenancy`](../../guidelines/web/multi-tenancy.md) `.../me/...` convention |

Query params: `from`, `to`, `school_year_id`.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `forbidden` | Teacher editing institutional event |
| 422 | `invalid_range` | ends_at before starts_at |

---

## Database

| Entity | Purpose |
|--------|---------|
| `calendar_events` | Unified institutional (`user_id` null) and owner-only personal (`user_id` set) events; `category` (BR-CA01) on institutional rows |

| Artifact | Location |
|----------|----------|
| Narrative DSL | [`docs/modeling/009-platform-admin.md`](../../modeling/009-platform-admin.md) |
| DBML | [`docs/database/schema.dbml`](../../database/schema.dbml) |
| DER | [`docs/database/der_009.png`](../../database/der_009.png) |

---

## Events

| Event | Consumers |
|-------|-----------|
| `CalendarEventCreated` | Optional future comms sync |

---

## Permissions

| Action | Key |
|--------|-----|
| Institutional CRUD | `manage_calendar` — director, coordenação, or secretaria system template, or owner |
| Personal CRUD | authenticated staff/teacher |
| Read institutional (`school` + `staff_only`) | authenticated staff/teacher memberships |
| Read institutional (`school` only, read-only) | guardian, via kept `student_guardians` link (BR-CA07) |

---

## Non-functional requirements

- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — school scoped.
- Timezone: display in school timezone; store UTC.

---

## Acceptance Criteria

AC-CA01

- [ ] Given secretary, when creating institutional event, then all staff see it in calendar feed.
- Source: Proesc calendar — [`proesc/gestao-academica/funcionalidades-por-ator.md`](../../ref/proesc/gestao-academica/funcionalidades-por-ator.md)

AC-CA02

- [ ] Given teacher, when creating personal event, then other staff do not see it.
- Source: `[product decision]`

AC-CA03

- [ ] Given date range query, when holidays exist in school-year BC, then feed includes holiday markers.
- Source: cross-link [`school-year.md`](school-year.md)

AC-CA04 *(`manage_calendar`, product decision 2026-10-07)*

- [ ] Given a staff member holds the coordenação or secretaria system template (not director, not
      owner), When they create an institutional event with `category: internal_game` or
      `category: exam`, Then the request succeeds.
- Source: `[product decision 2026-10-07]`

AC-CA05 *(guardian read-only, BR-CA07, product decision 2026-10-07)*

- [ ] Given a guardian linked to a student at school S, When they call
      `GET /me/calendar/events`, Then the response includes S's `school`-visibility institutional
      events and school-year holidays/instructional days, and excludes `staff_only` events and all
      staff personal events.
- [ ] Given that same guardian, When they attempt any write to `/calendar/*` or
      `/me/calendar/events`, Then the API returns `403` or `404` (no mutation route exists for this
      role).
- Source: `[product decision 2026-10-07]`, unhides `Calendário` in
  [`main-menu-description.md`](../../main-menu-description.md) line 128

---

## Open items

- [ ] Auto-sync institutional events to communication announcements.
- [ ] **Not yet implemented:** per [`index.md`](index.md) § Delivery waves, this BC (W2) is
      scheduled **Phase 4C.1b** — no `calendar_events` model, controller, policy, or migration
      exists in `web/` yet; this PRD content is validated ahead of that wave. Shipping
      BR-CA01–BR-CA07 needs: migration (`calendar_events` with `category`), model, policy
      (institutional CRUD on `manage_calendar`, personal CRUD owner-scoped), guardian-scoped
      controller/service for `GET /me/calendar/events` merging with school-year holiday/
      instructional-day data, and blueprints — follow-up for **migration-agent** + **service-agent**
      + **policy-agent** + **api-controller-agent** via **rails-implementer** when 4C.1b starts,
      then **frontend-implementer** for the teacher/guardian calendar UI and unhiding the
      `Calendário` nav item.

---

## Out of Scope

- Communication `publish_calendar_event` — [`communication/announcements.md`](../communication/announcements.md).
- Video call links — P2 comms adapter.
- Recurring events — P2.
