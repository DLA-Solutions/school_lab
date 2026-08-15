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
communication announcement objects.

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
**Calendar events** here are informational — meetings, pedagogical days, reminders — and may later
sync to communication `publish_calendar_event` `[product decision]`.

Teachers view calendar on web and mobile per [`actors-and-surfaces.md`](../../actors-and-surfaces.md).

---

## Business Rules

BR-CA01 — `capability_id`: `platform.manage_school_calendar`

**Institutional events** (`calendar_events`): scoped to `school_id`, optional `school_year_id`,
`title`, `description`, `starts_at`, `ends_at`, `all_day`, `visibility` ∈ `school | staff_only`.
For MVP, `school` visibility means all authenticated staff/teacher memberships in that school;
guardian calendar access remains deferred.

BR-CA02

**Personal events** use the same `calendar_events` table with non-null `user_id` + `school_id`;
rows are visible only to the owner unless sharing is introduced later `[product decision]` —
MVP: owner only. Institutional events have null `user_id`.

BR-CA03

Institutional event CRUD requires `manage_school_settings` or `manage_calendar` permission.
Teachers may create personal events only.

BR-CA04

Events may reference `school_year_id` for filtering; events outside active year still display if
within list window.

BR-CA05

Deleting institutional event is soft-delete (`discarded_at`) with audit.

BR-CA06

No recurrence engine in MVP — single-occurrence events only; recurring deferred P2.

---

## Use Cases

### UC-CA01 — Create institutional event

Input: title, dates, visibility, optional year.

Flow

1. Validate secretary permission.
2. Persist `calendar_events`.
3. Optional: prompt "Publish to guardians?" → manual handoff to comms `[product decision]`.

### UC-CA02 — View school calendar

Input: date range, filters (institutional vs personal).

Flow

1. Merge institutional events + user's personal events + holidays from school-year BC.
2. Return unified feed for SPA/mobile month view.

### UC-CA03 — Manage personal event

Input: CRUD for authenticated staff/teacher.

Flow

1. Scope to current user (BR-CA02).

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/calendar/events` | Unified feed (UC-CA02) |
| `POST` | `/calendar/institutional_events` | Secretary create |
| `PATCH/DELETE` | `/calendar/institutional_events/:id` | Update/remove |
| `CRUD` | `/calendar/personal_events` | Owner scoped |

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
| `calendar_events` | Unified institutional (`user_id` null) and owner-only personal (`user_id` set) events |

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
| Institutional CRUD | `manage_calendar` or `manage_school_settings` |
| Personal CRUD | authenticated staff/teacher |
| Read institutional | authenticated staff/teacher memberships; guardian access deferred |

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

---

## Open items

- [ ] Auto-sync institutional events to communication announcements.
- [ ] Guardian read-only calendar view — P2 or comms-owned.

---

## Out of Scope

- Communication `publish_calendar_event` — [`communication/announcements.md`](../communication/announcements.md).
- Video call links — P2 comms adapter.
- Recurring events — P2.
