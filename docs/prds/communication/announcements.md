# PRD — Communication: Announcements (BC3)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `communication.send_individual_announcement`, `communication.manage_announcement_categories`, `communication.manage_announcement_templates`, `communication.approve_pending_communication`, `communication.publish_calendar_event`  
> Related BCs: [`notifications.md`](notifications.md), [`media.md`](media.md)  
> Modeling: *(pending — `docs/modeling/006-communication.md`)*  
> API narrative: *(pending — `docs/api/v1/communication.md`)*

---

## Objective

Define **targeted announcements (comunicados)** and **calendar events** — categories, templates,
moderation queue, individual/family targeting — without mass-blast or vanity feed patterns
([`DIV-communication-005`](../../ref/divergencias.md)). Mass announcements and polls are P2.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Send individual announcement | `communication.send_individual_announcement` | Agenda Edu comunicados individuais |
| Manage announcement categories | `communication.manage_announcement_categories` | Agenda Edu typed comunicados |
| Manage announcement templates | `communication.manage_announcement_templates` | Agenda Edu model comunicados |
| Approve pending communication | `communication.approve_pending_communication` | Agenda Edu moderation |
| Publish calendar event | `communication.publish_calendar_event` | Proesc, Agenda Edu, ClassApp calendar/activities |

**P2 (documented boundary):**

| Capability | Phase | Evidence |
|------------|-------|----------|
| `communication.send_mass_announcement` | P2 | Agenda Edu, ClassApp mass send |
| `communication.send_poll_survey` | P2 | Proesc, Agenda Edu enquetes |
| `communication.manage_social_reactions` | P2 | Proesc optional likes — off by default |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Eventos (excursões, reuniões) via calendar events |
| `fundamental_medio` | yes | Primary comunicado volume |
| `pj_financeiro` | yes | No special rules |
| `multi_unidade` | partial | Per-school announcements only in MVP |

---

## Context

Competitors use **comunicados** for one-to-many school→family pushes with categories and
templates. ClassApp documents per-guardian visibility when multiple guardians share a student
([`classapp/comunicacao/funcionalidades-por-ator.md`](../../ref/classapp/comunicacao/funcionalidades-por-ator.md)).

School Lab MVP limits to **individual or small targeted** sends:

- Single student/family.
- Single class (all guardians in class).
- Explicit guardian list.

Whole-school mass blast is **P2** ([`mvp-scope.md`](../../product/mvp-scope.md);
[`open-questions.md`](../../open-questions.md)).

**Calendar events** are comms objects in MVP — sync with platform/academic calendar is phase 2
(`platform.manage_school_calendar`).

---

## Business Rules

BR-A01

An **announcement** has `target_kind`: `student`, `class`, `guardian_list`. Expansion resolves
guardians via enrollments and `student_guardians` — same isolation as messages BC (NFR-002).

BR-A02

**Categories** are school-defined (`category_id`) with optional retention hint for LGPD policy
(e.g. `event`, `pedagogical`, `administrative`). Required on publish.

BR-A03

**Templates** store reusable title/body/attachment placeholders. Duplicate creates new draft with
audit reference to source template id.

BR-A04

When school setting `teacher_moderation_required` is true, teacher-submitted announcements enter
`pending_approval` until staff with `moderate_communication` approves or rejects.

BR-A05

**Calendar events** extend announcement with `starts_at`, `ends_at`, optional location, optional
RSVP boolean (MVP: RSVP count only — no waitlist). Appear in guardian app events list and trigger
notification per policy.

BR-A06

**Read state** per guardian user is tracked for announcement list UX. **Read receipts as auditable
legal record** are P2 — not digital archive in MVP ([`open-questions.md`](../../open-questions.md)).

BR-A07

Rejected pending announcements return reason to author; no partial publish.

BR-A08

Announcements support attachments via media BC (images, PDF). Video links allowed; inline video
follows media BC limits.

BR-A09

**Social reactions** (likes/comments) disabled in MVP. P2 capability off by default when shipped
([`DIV-communication-005`](../../ref/divergencias.md)).

---

## Use Cases

### UC-A01 — Publish targeted announcement (staff)

Input: target, category_id, title, body, attachment ids, optional schedule.

Flow

1. Validate `manage_communication` or teacher submit (BR-A04).
2. Expand recipients (BR-A01); create announcement rows per recipient or single broadcast record
   with recipient join table `[product decision]`.
3. Emit `AnnouncementPublished` → notifications BC.

### UC-A02 — Teacher submit for approval

Input: same as UC-A01 without publish permission.

Flow

1. Create `pending_approval` record.
2. Notify moderators.

### UC-A03 — Moderate pending announcement

Input: `announcement_id`, `approve` | `reject`, optional reason.

Flow

1. Validate `moderate_communication`.
2. On approve → publish (UC-A01); on reject → BR-A07.

### UC-A04 — Manage categories and templates

CRUD for school-scoped categories and templates (BR-A02, BR-A03).

### UC-A05 — Publish calendar event

Input: UC-A01 fields plus schedule window, location, rsvp_enabled.

Flow

1. Create announcement with `kind: calendar_event` (BR-A05).
2. Show in events feed; optional RSVP tallies.

---

## API

### POST /api/v1/schools/:school_id/communication/announcements

Staff publish or teacher submit (status derived from permission).

### GET /api/v1/schools/:school_id/me/communication/announcements

Guardian list with read state; filter by `student_id`.

### GET /api/v1/schools/:school_id/communication/announcements/pending

Moderation queue.

### POST /api/v1/schools/:school_id/me/communication/events/:id/rsvp

Optional RSVP for calendar events.

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 403 | `forbidden` | Teacher publish when moderation required |
| 422 | `empty_recipients` | Target expansion yields zero guardians |
| 422 | `category_required` | Missing category_id |

---

## Database

| Entity group | Purpose |
|--------------|---------|
| `communication_announcement_categories` | School categories |
| `communication_announcement_templates` | Reusable templates |
| `communication_announcements` | Content, status, target, kind |
| `communication_announcement_recipients` | Per-guardian delivery/read state |
| `communication_event_rsvps` | Optional RSVP rows |

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `AnnouncementPublished` | UC-A01, approve | Notifications BC |
| `AnnouncementPending` | UC-A02 | Notify moderators |
| `CalendarEventPublished` | UC-A05 | Notifications BC, events feed |

---

## Permissions

| Action | Permission key |
|--------|----------------|
| Publish announcement | `manage_communication` |
| Submit for approval | `send_messages` (teachers) |
| Moderate | `moderate_communication` |
| Manage categories/templates | `manage_communication` |
| Guardian read/RSVP | membership + family scope |

---

## Non-functional requirements

- [NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy) — recipient expansion respects family links only.
- [NFR-004](../../product/non-functional-requirements.md#nfr-004--push-notifications) — publish triggers notification per channel policy.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — moderation actions audited.

---

## Acceptance Criteria

AC-A01

- [ ] Given staff targets class C  
      When announcement published  
      Then all guardians with active enrollment in C receive it; others do not  
- Source: Agenda Edu comunicados pattern

AC-A02

- [ ] Given teacher_moderation_required true  
      When teacher submits announcement  
      Then status is pending_approval and guardians do not see it until approved  
- Source: [`agenda-edu/comunicacao/funcionalidades-por-ator.md`](../../ref/agenda-edu/comunicacao/funcionalidades-por-ator.md)

AC-A03

- [ ] Given calendar event with RSVP enabled  
      When guardian RSVPs yes  
      Then staff see RSVP count on event detail  
- Source: `[product decision]` — ClassApp/Agenda Edu events

AC-A04

- [ ] Given staff attempts whole-school target without mass permission  
      When target_kind is all_school  
      Then API returns 403 or 422 in MVP (mass P2)  
- Source: [`mvp-scope.md`](../../product/mvp-scope.md) — `send_mass_announcement` P2

AC-A05

- [ ] Given announcement with category pedagogical  
      When guardian views in app  
      Then no like/comment UI is shown  
- Source: [`DIV-communication-005`](../../ref/divergencias.md), BR-A09

---

## Open items / pending decisions

- [ ] Recipient storage model — one row vs join table at scale.
- [ ] Calendar sync with `platform.manage_school_calendar`.
- [ ] RSVP limits and guardian-visible attendee list.
- [ ] Duplicate template — which fields copy.

---

## Out of Scope

- Mass announcement (`communication.send_mass_announcement`) — P2.
- Polls/surveys (`communication.send_poll_survey`) — P2.
- Social reactions — P2.
- Read receipts as legal audit record — P2.
- Academic calendar authoritative source — platform/academic increment 4+.
