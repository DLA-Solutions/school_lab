# PRD — Communication: Notifications (BC4)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `communication.configure_push_policy`, `communication.send_email_notification`, `communication.send_whatsapp_notification`, `communication.manage_notification_inbox`, `communication.manage_message_templates`, `communication.track_delivery_status`  
> Related BCs: [`messages.md`](messages.md), [`channels.md`](channels.md), [`announcements.md`](announcements.md)  
> Modeling: *(pending — `docs/modeling/006-communication.md`)*  
> API narrative: *(pending — `docs/api/v1/communication.md`)*

---

## Objective

Define **notification delivery** — FCM push, email adapter, WhatsApp adapter, per-channel policy
([`DIV-communication-007`](../../ref/divergencias.md)), delivery tracking, and user notification
inbox — without real-time transport. Business rules live in API services; adapters are pluggable.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Configure push policy | `communication.configure_push_policy` | [`DIV-communication-007`](../../ref/divergencias.md), Agenda Edu push articles |
| Send email notification | `communication.send_email_notification` | Standard adapter pattern |
| Send WhatsApp notification | `communication.send_whatsapp_notification` | [`DIV-communication-003`](../../ref/divergencias.md), Proesc trilha resend, Agenda Edu payment notify |
| Manage notification inbox | `communication.manage_notification_inbox` | ClassApp notification list |
| Manage message templates | `communication.manage_message_templates` | Agenda Edu templates; WhatsApp approved templates |
| Track delivery status | `communication.track_delivery_status` | Agenda Edu delivery tracking |

**Cross-domain:** `billing.send_payment_reminder` and `billing.configure_billing_notifications`
reuse adapter infrastructure; billing owns finance rules ([`fintech-first.md`](../fintech-first.md)).

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Push for messages and photo updates |
| `fundamental_medio` | yes | Same policy engine |
| `pj_financeiro` | partial | Billing notifications separate policy namespace |
| `multi_unidade` | partial | Policy per school |

---

## Context

Jul 2026 decision: **FCM push parity** with legacy system; **not real-time**
([`open-questions.md`](../../open-questions.md)). Proesc limits push categories (rotina, recados,
finance) — School Lab uses **explicit per-channel policy** instead of competitor defaults
([`DIV-communication-007`](../../ref/divergencias.md)).

WhatsApp is an **adapter** — template content approved with provider; API decides when to send
([`DIV-communication-003`](../../ref/divergencias.md)). Same pattern as billing resend-boleto slice.

**Academic absence handoff:** notifications BC subscribes to `AbsenceRecorded` from academic
domain (increment 4). Delivery uses `attendance` channel policy. **Correctness of absence**
is academic + [NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains) —
this BC only enqueues after event receipt.

---

## Business Rules

BR-N01

**Notification intents** are created by domain events (`MessagePosted`, `AnnouncementPublished`,
`TicketOpened`, `AbsenceRecorded`, …) with `source_type`, `source_id`, `school_id`, and
target user ids.

BR-N02

**Push policy** is configured per school and `channel_key`: e.g. `messages`, `announcements`,
`service_tickets`, `attendance`, `photos`. Each maps to: `push_enabled`, `email_enabled`,
`whatsapp_enabled`, `in_app_only`.

BR-N03

Default MVP policy `[product decision]`:

| channel_key | push | email | whatsapp |
|-------------|------|-------|----------|
| `messages` | on | off | off |
| `announcements` | on | off | off |
| `service_tickets` | on | off | off |
| `attendance` | on | off | off |
| `photos` | on | off | off |

Staff may override via `configure_push_policy` (UC-N02).

BR-N04

**Delivery pipeline:** intent → Solid Queue job → adapter calls (FCM, Postmark, WhatsApp) →
`notification_deliveries` row with status `queued`, `sent`, `failed`, `skipped` (policy off).

BR-N05

Failed deliveries retry with exponential backoff; idempotent on `(intent_id, channel, user_id)`
(NFR-001).

BR-N06

**Notification inbox** (in-app list) is user-scoped: dismiss/clear affects UI only; does not
delete source message/announcement.

BR-N07

**WhatsApp** sends require approved template id + merge fields. Ad hoc free text not allowed.
Templates managed via `communication.manage_message_templates` (shared namespace with billing
where merge fields overlap).

BR-N08

**Quiet hours** (optional school setting from index module settings): non-urgent intents queue
until window opens. `attendance` channel may bypass quiet hours when school enables
`[product decision]` — open item.

BR-N09

Guardian **device tokens** stored per user with `platform` (ios/android/web). Invalid FCM token
marks inactive on bounce.

BR-N10

Email uses transactional provider (Postmark when configured — same open item as identity invites).

---

## Use Cases

### UC-N01 — Process notification intent

Input: domain event payload.

Flow

1. Resolve target users and effective policy (BR-N02, BR-N03).
2. Create delivery rows per channel enabled.
3. Enqueue adapter jobs (BR-N04).

### UC-N02 — Configure push policy (staff)

Input: `channel_key`, channel toggles.

Flow

1. Validate `manage_communication`.
2. Upsert school policy; audit change (NFR-005).

### UC-N03 — Register FCM device token (guardian/staff)

Input: token, platform.

Flow

1. Associate with authenticated user (BR-N09).

### UC-N04 — Manage notification inbox (user)

Input: dismiss/clear notification ids.

Flow

1. Update user notification state (BR-N06).

### UC-N05 — Track delivery status

Staff/guardian views delivery status on source object (message, announcement) — `sent`, `failed`,
`pending` aggregates per [`communication.track_delivery_status`].

### UC-N06 — Send WhatsApp via template

Input: template_id, recipient phone, merge fields.

Flow

1. Validate template approved and policy allows whatsapp (BR-N07).
2. Call adapter; record delivery.

---

## API

### GET/PATCH /api/v1/schools/:school_id/communication/notification-policy

Staff read/update push policy.

### POST /api/v1/me/device-tokens

Register FCM token.

### GET /api/v1/schools/:school_id/me/notifications

In-app notification inbox.

### GET /api/v1/schools/:school_id/communication/deliveries

Staff delivery status for a source object (optional admin view).

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 422 | `template_not_approved` | WhatsApp template missing provider approval |
| 422 | `invalid_channel_key` | Unknown policy channel |
| 503 | `adapter_unavailable` | Provider down after retries — surfaced in delivery status |

---

## Database

| Entity group | Purpose |
|--------------|---------|
| `communication_notification_policies` | Per school × channel_key toggles |
| `communication_notification_intents` | Source event fan-out |
| `communication_notification_deliveries` | Per user × channel status |
| `communication_message_templates` | Email/WhatsApp template registry |
| `device_tokens` | FCM tokens (may live in identity — TBD modeling) |
| `user_notifications` | In-app inbox state |

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| *(consumes)* `MessagePosted`, `AnnouncementPublished`, `TicketOpened`, `TicketUpdated`, `AbsenceRecorded` | upstream BCs | UC-N01 |
| `NotificationDelivered` | adapter success | Analytics (P2), audit |

**Academic consumer note:** `AbsenceRecorded` subscription documented here for handoff; event
schema owned by academic PRD increment 4.

---

## Permissions

| Action | Permission key |
|--------|----------------|
| Configure policy | `manage_communication` |
| View delivery admin | `manage_communication` |
| Register device token | authenticated user |
| Manage inbox | authenticated user |

---

## Non-functional requirements

- [NFR-004](../../product/non-functional-requirements.md#nfr-004--push-notifications) — FCM, queue pipeline, per-channel policy.
- [NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains) — idempotent delivery jobs; **absence correctness** owned by academic, not this BC.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — policy changes and delivery failures logged.

---

## Acceptance Criteria

AC-N01

- [ ] Given push enabled for messages channel  
      When MessagePosted fires  
      Then FCM job enqueued for each participant device token  
- Source: [`DIV-communication-007`](../../ref/divergencias.md), NFR-004

AC-N02

- [ ] Given push disabled and email enabled for announcements  
      When announcement published  
      Then email adapter invoked and no FCM job created  
- Source: `[product decision]` — BR-N03

AC-N03

- [ ] Given duplicate MessagePosted retry  
      When notification job runs twice  
      Then at most one sent delivery per user per channel  
- Source: NFR-001

AC-N04

- [ ] Given WhatsApp template not provider-approved  
      When staff triggers WhatsApp send  
      Then API returns 422 template_not_approved  
- Source: [`DIV-communication-003`](../../ref/divergencias.md)

AC-N05

- [ ] Given AbsenceRecorded event from academic domain  
      When attendance channel push enabled  
      Then guardian receives push with student context  
- Source: [`vision.md`](../../vision.md) §6 — handoff only; absence rules in academic PRD + NFR-001

AC-N06

- [ ] Given guardian dismisses in-app notification  
      When they open source message  
      Then message content still available in thread  
- Source: BR-N06 — ClassApp inbox pattern

---

## Open items / pending decisions

- [ ] Push immediacy vs digest for non-urgent messages ([`open-questions.md`](../../open-questions.md)).
- [ ] Quiet hours default and attendance bypass.
- [ ] WhatsApp provider and template approval workflow.
- [ ] Web push scope in MVP vs mobile-only.
- [ ] Shared `device_tokens` table ownership (identity vs communication modeling).

---

## Out of Scope

- Billing régua automation depth — billing domain (stub in fintech-first).
- Real-time WebSocket delivery — phase 2.
- In-app AI notification bots — AI deferred.
- SMS adapter — not in taxonomy MVP.
