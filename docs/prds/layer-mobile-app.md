# Layer PRD — mobile app

> Status: draft  
> Stack reference: `docs/web-stack.md` §3, `mobile/`  
> Domain PRDs: all validated MVP domains — business rules stay in API

## Objective

Deliver **React Native** mobile apps for **guardian** and **teacher** MVP workflows — messages,
attendance, push notifications, boleto view/pay, and document read — consuming the same `/api/v1`
contract as the web SPA. Guardian portal domains are delivered **web first**; mobile ports only
stable API/web contracts and never becomes a second source of business rules.

## Context

[`docs/vision.md`](../vision.md) and Jul 2026 stakeholder validation: **web and app from MVP start**.
Guardians and teachers both use mobile; staff administration remains primarily web.

**Product decisions (Aug 2026 documentation phase):**

- **Guardians:** product UI says **Responsável** while technical identifiers remain `guardian`.
  The web portal ships first; mobile remains the primary eventual surface for push-driven messaging
  and receives billing/document/academic parity after each domain contract is accepted.
- **Teachers:** app for messages + attendance; web for grades and lesson plans
  ([`actors-and-surfaces.md`](../actors-and-surfaces.md)).
- **Students:** no login in MVP — record only.
- **Backoffice:** web only in the separate `frontend/backoffice/` SPA; never routed through
  `frontend/app/` or mobile.

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
- Active context is an explicitly selected `membership.id` from `GET /me`. Store only that
  non-sensitive identifier, never school names, student lists, CPF, or financial data.
- Dual-role or multi-school users select profile and school explicitly. Switching context clears
  school-scoped caches, re-evaluates navigation/deep links, and returns to the selected audience's
  home. The app must not merge staff/teacher and Responsável menus.

## MVP screens (minimum)

### Guardian

| Screen | API |
|--------|-----|
| Login / consent | `auth/*`, `consent_records` |
| Home / children switcher | `GET /me` |
| Messages inbox | `GET /communication/conversations` |
| Thread | `POST .../messages` |
| Announcements | `GET /me/announcements` |
| Meus boletos | `GET /me/charges` |
| Boletins | `GET /me/report_cards` *(after web contract acceptance)* |
| Preceptoria | `GET /me/preceptorship_reports` *(after web contract acceptance)* |
| Meus pedidos | `GET /me/requests` *(after web contract acceptance)* |
| Imposto de renda | `GET /me/tax_declarations` *(after web contract acceptance)* |
| Documents | `GET /me/students/:id/documents` |

Guardian navigation uses the same audience matrix as
[`layer-web-spa.md`](layer-web-spa.md) and shows only implemented destinations. Staff-only
registries, grade entry, staff billing, plans/settings, contracts, and the staff Solicitações queue
must not appear or resolve from a Responsável context.

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
- [ ] Product labels render **Responsável**; no raw `guardian`, `staff`, or `teacher` value is
      displayed in pt-BR UI
- [ ] Profile/school switching validates an active `membership.id` and clears stale scoped state
- [ ] Guardian portal domains port only after their web/API contracts are accepted
- [ ] Push notification policy aligned with [`communication/notifications.md`](communication/notifications.md)
- [ ] FCM token lifecycle and multi-device policy documented
- [ ] No business rules duplicated in app — all via `/api/v1`
