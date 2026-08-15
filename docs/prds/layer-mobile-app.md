# Layer PRD — mobile app

> Status: draft  
> Stack reference: `docs/web-stack.md` §3, `mobile/`  
> Domain PRDs: all validated MVP domains — business rules stay in API

## Objective

Deliver **React Native** mobile apps for **guardian** and **teacher** MVP workflows — messages,
attendance, push notifications, boleto view/pay, and document read — consuming the same `/api/v1`
contract as the web SPA.

## Context

[`docs/vision.md`](../vision.md) and Jul 2026 stakeholder validation: **web and app from MVP start**.
Guardians and teachers both use mobile; staff administration remains primarily web.

**Product decisions (Aug 2026 documentation phase):**

- **Guardians:** mobile **primary** for messaging, push, boleto, documents; **web guardian surface
  also in MVP** (responsive `/app` routes) — aligns with mvp-scope "all MVP roles on web + mobile".
- **Teachers:** app for messages + attendance; web for grades and lesson plans
  ([`actors-and-surfaces.md`](../actors-and-surfaces.md)).
- **Students:** no login in MVP — record only.
- **Backoffice:** web only (`frontend/backoffice`).

## Responsibilities

### In scope

- JWT auth with refresh in **Keychain / Keystore** (body refresh, not cookie).
- FCM push registration (`POST /me/device_tokens`).
- Guardian: inbox, announcements, charges, student documents, consent wizard.
- Teacher: class list, attendance session, message threads.
- Shared design tokens (`@school-lab/design-tokens` dark scheme).
- Offline UX: read cached inbox list; queue message send retry (P2 full offline — MVP online-first).

### Out of scope

- Business rules duplication — all validation in `web/` services.
- Backoffice mobile.
- Student portal.
- Real-time WebSocket — poll/refresh on focus (same as web).

## Dependencies

| Depends on | For |
|------------|-----|
| `docs/api/v1/*` | Route narratives + OpenAPI |
| `docs/prds/communication/` | Message MVP |
| `docs/prds/academic/attendance.md` | Attendance MVP |
| `docs/prds/billing/guardian-portal.md` | Charges |
| `docs/prds/documents-and-archive/` | Guardian document read |
| `packages/design-tokens` | Colors, typography |

## Technical constraints

- React Native (locked in `web-stack.md`).
- Secure token storage — never AsyncStorage for refresh token.
- Image attachments: camera/gallery picker; max 5 MB per communication PRD.
- Locale: pt-BR UI strings; English code identifiers.

## MVP screens (minimum)

### Guardian

| Screen | API |
|--------|-----|
| Login / consent | `auth/*`, `consent_records` |
| Home / children switcher | `GET /me` |
| Messages inbox | `GET /communication/conversations` |
| Thread | `POST .../messages` |
| Announcements | `GET /me/announcements` |
| Boletos | `GET /me/charges` |
| Documents | `GET /me/students/:id/documents` |

### Teacher

| Screen | API |
|--------|-----|
| Classes | `GET /classes` |
| Attendance | `attendance_sessions` |
| Messages | same as guardian |

## Non-functional requirements

- Push tap deep-links to thread or charge detail.
- NFR-001: attendance push received when teacher confirms absence batch.
- LGPD: no screenshots of sensitive health incidents in app switcher preview (OS limitation — document).

## Acceptance criteria

AC-M001

```gherkin
Given a guardian on mobile
When they open messages
Then they see only conversations for their linked students
And they cannot access another family thread
```

AC-M002

```gherkin
Given a teacher recording attendance
When they mark a student absent and confirm session
Then guardian receives push within SLA after 15-minute window
```

## Out of scope

- Tablet-optimized layouts (responsive phone first).
- Biometric login (P2).
- Full offline compose queue (P2).

## Domain PRD dependencies

| Domain | PRD folder | MVP mobile workflows |
|--------|------------|----------------------|
| Identity & onboarding | [`identity-and-onboarding/`](identity-and-onboarding/index.md) | Login, invites, profiles |
| Communication | [`communication/`](communication/index.md) | Messages, push, media |
| Academic | [`academic/`](academic/index.md) | Attendance, absence notifications |
| Billing | [`billing/`](billing/index.md) | Guardian boleto view/pay |
| Documents & archive | [`documents-and-archive/`](documents-and-archive/index.md) | Guardian document read |

## Review-ready checklist (stakeholder)

- [ ] Guardian and teacher actor flows match [`actors-and-surfaces.md`](../actors-and-surfaces.md)
- [ ] Push notification policy aligned with [`communication/notifications.md`](communication/notifications.md)
- [ ] FCM token lifecycle and multi-device policy documented
- [ ] No business rules duplicated in app — all via `/api/v1`
