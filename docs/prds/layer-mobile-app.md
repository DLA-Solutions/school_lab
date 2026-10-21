# Layer PRD — mobile app

> Status: validated
> Stack reference: `docs/web-stack.md` §5 and §11, `mobile/`
> Domain PRDs: guardian workflows only — business rules stay in the API

## Objective

Deliver the React Native app for guardians (product UI: **Responsável**; technical role
`guardian`) on **iOS and Android**. Teachers and staff stay on the school SPA (`frontend/app/`).
The app consumes `/api/v1` and never becomes a second source of business rules.

## Context

**Decided Oct 2026** ([`actors-and-surfaces.md`](../actors-and-surfaces.md)): `mobile/` is
guardian-only. One active `membership.id` with role `guardian`. A staff or teacher membership
never builds a menu in this app.

Guardians also keep the school SPA. Students have no login in the MVP. Backoffice stays on
`frontend/backoffice/` and is never routed through this app.

Navigation is four tabs — **Início**, **Mensagens**, **Boletos**, **Filho** — not a drawer
cloned from the school SPA. The active child is an explicit `student_id`. Today's sent routine
is on Início; history is on Filho.

## Responsibilities

### In scope

- JWT auth: access token in memory; refresh in Keychain/Keystore.
- FCM push registration (`POST /api/v1/me/device_tokens`).
- Four-tab information architecture at product level: Início, Mensagens, Boletos, Filho.
- Active child: explicit `student_id`.
- Guardian read of the sent infant routine:
  `GET /api/v1/schools/:school_id/me/students/:student_id/daily_routine_entries`
  (snack eaten, poop count, pee count, notes; **sent only** — [`academic/routine.md`](academic/routine.md)
  BR-DR02, BR-DR03, BR-DR06).
- Messages, announcements, boletos, report cards, preceptorship, and documents.
- pt-BR through i18n. The visible role label is **Responsável**, never the raw `guardian` string.
- Shared design tokens (`@school-lab/design-tokens`, dark scheme).

### Out of scope

- Teacher attendance, class lists, and any teacher or staff menu.
- Income-tax declaration, school requests, atas, health records, pickups, and tablet layouts.
- Business-rule duplication — validation stays in `web/` services.
- Backoffice mobile and a student portal.
- Expo web as a product target.
- The broader early-childhood diary (sleep, mood, health, photos, per-event records). Those
  questions stay open in [`open-questions.md`](../open-questions.md).
- Real-time WebSocket — poll or refresh on focus.

## Dependencies

| Depends on | For |
|------------|-----|
| `docs/api/v1/*` | Route narratives + OpenAPI |
| `docs/prds/communication/` | Messages and announcements |
| `docs/prds/academic/routine.md` | Sent routine read |
| `docs/prds/billing/guardian-portal.md` | Charges |
| `docs/prds/documents-and-archive/` | Guardian document read |
| `packages/design-tokens` | Colors, typography |

## Technical constraints

- React Native on iOS and Android (locked in `web-stack.md`). No Expo web target.
- Secure token storage — never AsyncStorage or `localStorage` for the refresh token.
- Image attachments: camera/gallery picker; max 5 MB per the communication PRD.
- Locale: pt-BR UI strings; English code identifiers.
- Active context is an explicitly selected `membership.id` from `GET /me`, and that membership's
  role must be `guardian`. Store only that non-sensitive identifier.
- A dual-role user who also holds staff or teacher memberships does not get those menus here.
  Switching context clears school-scoped caches. Authorization stays server-side.

## Information architecture

| Tab | What the guardian finds |
|-----|-------------------------|
| Início | Active child and today's sent routine |
| Mensagens | Message threads and announcements |
| Boletos | Charges for the active context |
| Filho | Report cards, sent routine history, preceptorship, documents |

### Guardian surfaces

| Surface | API |
|---------|-----|
| Login | `auth/*` |
| Home / active child | `GET /me` plus an explicit `student_id` |
| Today's routine and history | `GET /api/v1/schools/:school_id/me/students/:student_id/daily_routine_entries` |
| Messages inbox and thread | communication conversation routes |
| Announcements | `GET /me/announcements` |
| Boletos | `GET /me/charges` |
| Report cards | `GET /me/report_cards` |
| Preceptoria | `GET /me/preceptorship_reports` |
| Documents | `GET /me/students/:id/documents` |

Staff registries, grade entry, teacher attendance, staff billing, plans, contracts, requests,
and income-tax declaration do not appear in a Responsável context.

Recording the routine stays on the school SPA ([`academic/routine.md`](academic/routine.md)).

## Non-functional requirements

- A push tap can deep-link to a thread or a charge. Absence pushes, when sent, are received by
  the guardian; the teacher confirms attendance on the school SPA.
- LGPD: do not surface sensitive health text in the app-switcher preview when the OS allows a
  generic label instead.

## Acceptance criteria

AC-M001

```gherkin
Given a guardian on the mobile app
When they open messages
Then they see only conversations for their linked students
And they cannot access another family thread
```

AC-M002 (teacher confirming absence on this app) is withdrawn. Attendance stays on the school SPA.

AC-M003

```gherkin
Given a guardian with an explicit active student_id
When they open today's routine on Início
Then the app reads GET /api/v1/schools/:school_id/me/students/:student_id/daily_routine_entries
And they see only sent entries
And the fields shown are snack eaten, poop count, pee count, and notes
And draft entries are absent
```

## Out of scope (delivery)

- Tablet-optimized layouts (phone first).
- Biometric login.
- A full offline compose queue.

## Domain PRD dependencies

| Domain | PRD folder | Mobile workflows |
|--------|------------|------------------|
| Identity & onboarding | [`identity-and-onboarding/`](identity-and-onboarding/index.md) | Guardian login and one active membership |
| Communication | [`communication/`](communication/index.md) | Messages, announcements, push receive |
| Academic | [`academic/routine.md`](academic/routine.md) | Sent routine read only |
| Billing | [`billing/`](billing/index.md) | Guardian boleto view |
| Documents & archive | [`documents-and-archive/`](documents-and-archive/index.md) | Guardian document read |

## Review-ready checklist (stakeholder)

- [x] Audience is guardian-only and matches [`actors-and-surfaces.md`](../actors-and-surfaces.md)
- [x] Product label is **Responsável**; the raw `guardian` string is not a visible role label
- [x] Four tabs: Início, Mensagens, Boletos, Filho
- [x] Teacher attendance is not a screen in this app
- [ ] Profile switch accepts only an active guardian `membership.id`
- [ ] Push notification policy aligned with [`communication/notifications.md`](communication/notifications.md)
- [ ] No business rules duplicated in the app — all via `/api/v1`
