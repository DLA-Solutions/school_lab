# PRD — Billing Module ("Fintech-first" Strategy for Schools)

> Status: implemented in `web/` (billing domain, Cora integration); open items below remain  
> Scope: domain bundle (identity, schools, people, billing, documents)  
> API: [`docs/api/v1/fintech-first.md`](../api/v1/fintech-first.md)  
> Relation to School Lab: derived front — does not replace the MVP order validated in  
> `vision.md` (communication → academic → billing). See **Positioning note** at the end.  
> **Identity & onboarding:** UC-06, UC-08, BR-009, and § Permissions are partially superseded by  
> [`docs/prds/identity-and-onboarding/`](identity-and-onboarding/) — historical billing implementation remains until W1–W4 convergence.

---

## Objective

Eliminate manual work and uncertainty in the school tuition billing flow: from charge
generation through payment confirmation, without secretarial intervention, with full
delinquency visibility for the director.

---

## Context

The partner (director of an early childhood school) reports frequent switches between
school management systems. The recurring pain point is **billing** — specifically
**boleto** (Brazilian bank payment slip) management: manual or unreliable issuance,
manual reconciliation, no delinquency visibility, and collection that depends on human
effort instead of an automated process.

This PRD defines a **fintech-like** product focused on recurring school billing first,
expanding later into academic management and communication.

**Target audience**

- **Initial customer**: the validating partner's school (early childhood).
- **Expansion**: small/medium private schools with manual or poorly served billing.
- **Direct users**: school administration (issuance and tracking); financial guardians
  (receipt and payment).

**Reported pains**

| Pain | Impact |
|------|--------|
| Manual or unreliable boleto issuance | Billing delays, wrong amounts |
| No automatic reconciliation | Secretarial manual write-off, error-prone |
| No collection régua (dunning sequence) | Delinquency discovered late |
| No consolidated delinquency view | Director lacks expected monthly cash flow |
| Discounts negotiated outside the system | No traceability, secretarial rework |

**Prerequisites**

- Anchor docs: `vision.md`, `product-map.md`, `actors-and-surfaces.md`, `web-stack.md`.
- Auth lifecycle: [`docs/modeling/002-api-auth.md`](../modeling/002-api-auth.md).
- Implementation patterns: `docs/guidelines/web/` (services, state machines, auditing,
  multi-tenancy).

**Surfaces (MVP)**

- **School admin**: responsive web SPA (`frontend/app`) — plans, contracts, charges, dashboard.
- **Guardian**: responsive web portal in MVP; Wave 2 API is contract-ready for
  React Native (`mobile/`) when that channel ships. Fintech-first partner validation does
  not block on a dedicated mobile release.

---

## Business Rules

BR-001

Every school-scoped resource belongs to exactly one `school_id`. Queries and policies
must never return data across schools.

BR-002

After JWT validation, auth checks run in order: `users.discarded_at` → `users.status`
disabled → Devise lock → `memberships.discarded_at` → `memberships.status` (invited /
suspended block) → `active` proceeds. See `002-api-auth.md`.

BR-003

Guardian routes under `/schools/:school_id/me/*` are family-scoped. A guardian may
only access charges, payments, students, and documents linked via `student_guardians`
for their `guardians` profile in that school. Cross-family access returns `404`.

BR-004

`charges.status` follows AASM: `pending` (initial) → `paid` | `overdue` | `cancelled`.
Transitions: `pay` (from pending/overdue), `mark_overdue` (from pending),
`cancel` (from pending/overdue). See `ChargeStateMachine` and
`docs/guidelines/web/state-machines.md`.

BR-005

Business cancellation uses `status: cancelled` (`POST /charges/:id/cancel`). Erroneous
or duplicate charge removal uses Discard (`discarded_at`) via `DELETE /charges/:id`.
Never use Discard to represent business cancellation.

BR-006

`payments` and `webhook_events` are immutable financial/ingress records — no Discard.
Duplicate provider webhooks must not create duplicate payments or incorrect write-offs
(idempotent processing via `webhook_events`).

BR-007

On confirmed provider payment, the system creates or updates a `payments` row with
`provider_payment_id`, then transitions the charge to `paid` via the `pay` event.

BR-008

`users.email` and `memberships (user_id, school_id)` are unique among kept records
(partial unique index `WHERE discarded_at IS NULL`).

BR-009

> **Superseded by:** [`docs/prds/identity-and-onboarding/onboarding.md`](identity-and-onboarding/onboarding.md)
> (UC-O04, BR-O07–O08). Token + set-password flow replaces random password stub.

Guardian portal access requires `users` + `memberships` (role `guardian`, status
`active`) + `guardians.user_id` linked after invite acceptance. Invite flow:
create membership `invited` → `POST /auth/invite/accept` → `POST /me/memberships/:id/accept`
→ `active`, set `guardians.user_id`.

BR-010

Active `contracts` drive recurring charge generation per `billing_period`. Each charge
references the financially responsible `guardian_id`, applies `applied_discounts`, and
computes `total_amount_cents` (original − discount + late fees when applicable).

BR-011

A charge becomes `overdue` after `due_date` plus the school's `overdue_grace_days`
(`school_billing_settings`, 0–30, default 3), evaluated in the school timezone against
the national business-day calendar (`Billing::BusinessDayCalendar`).

When a charge is marked overdue the system recomputes
`total_amount_cents = original − discount + late fee` and writes `late_fee_amount_cents`.
**Mora interest is applied by the bank on the registered boleto**, not by
`Billing::LateFeeCalculator` in MVP: the calculator remains a zero-returning placeholder
for internal estimates (phase 2). Each school configures `interest_rate_percent` in
`school_billing_settings` (no platform default — issuance is blocked until set). On
issuance the adapter sends `payment_terms.interest.rate` to Cora; settlement interest is
persisted on `payments.interest_amount_cents`. **Pontualidade** (early payment discount) and
**multa** (fine) are optional per-school settings (PR2): nullable
`early_payment_discount_percent` → Cora `payment_terms.discount` (`type: PERCENT`, Cora default
limit = day before due); `fine_type` `percent`|`fixed` → `payment_terms.fine` (`rate` or
`amount`, Cora default start = due + 1). Guardian UX for these terms is out of scope.

BR-012

`POST /charges/:id/reissue` (school and guardian) requests a new boleto/Pix issuance
via the bank slip gateway (new `charge_issuances` row). Invalid state (e.g. already `paid`) returns `409`.

BR-013

`documents.status`: `pending` → `approved` | `rejected` via `POST .../approve` or
`.../reject`. Rejection requires `rejection_reason`.

BR-014

Passwords and refresh token raw values are never returned by the API. `refresh_tokens`
store `token_digest` only.

BR-015

Platform-wide user disable (`users.status: disabled`) revokes active refresh tokens and
blocks all school access. Per-school suspend uses `memberships.status: suspended`.

BR-016

Phase 2 routes (`communication`, `academic`) documented in OpenAPI return `501 Not
Implemented` until their domain PRDs ship.

BR-017

Changes to tenant domain records (`charges`, `contracts`, `guardians`, `documents`,
etc.) are audited via the `audited` gem with `SchoolAuditable` (`associated_with: :school`).

---

## Use Cases

### UC-01 — Recurring charge generation

Input: active `contract`, billing calendar.

Flow:

1. Scheduled job selects contracts with `status: active` due for the period.
2. Create `charge` with `billing_period`, amount fields (cents), `due_date`, `guardian_id`.
3. Apply `applied_discounts` if any.
4. Enqueue `Billing::IssueChargeJob` — issuance runs outside the DB transaction.
5. Guardian notification deferred — collection régua is out of MVP scope (see UC-03).
6. Emit `ChargeGenerated`.

### UC-02 — Payment reconciliation (provider webhook)

Input: provider webhook at `POST /webhooks/:provider/:token` (school resolved from
`webhook_endpoint_token` on `school_payment_providers`).

Flow:

1. Record a `webhook_events` row (idempotent on `provider` + `provider_event_id`) with the
   event type and resource id from the notification headers. `payload` is NULL for Cora —
   the notification has no body.
2. Enqueue async job.
3. Resolve target `charge_issuance` via `provider_resource_id` (provider invoice id).
4. Call `fetch_invoice` on the bank slip adapter to confirm current invoice state.
5. Create/update `payments` with `provider_payment_id`, `paid_amount_cents`, `paid_at`.
6. Invoke `charge.pay!` when payment confirmed.
7. Record `observed_status` and `processed_at` on the `webhook_events` row.
   Emit `PaymentConfirmed`. Guardian/school notification deferred (UC-03).

Because the notification is only a trigger, a lost or forged webhook cannot corrupt or
silently drop a settlement: `Billing::DailyReconciliationJob` lists the last 14 days of
provider invoices for each school every morning and settles anything the webhook path
missed.

### UC-03 — Collection régua (dunning)

Input: overdue `charges`, school régua configuration.

Flow:

1. Daily job marks eligible `pending` charges past `due_date` + grace days as `overdue`
   (`Billing::MarkOverdueChargesService`). **Implemented.**
2. Recompute amounts per BR-011 — `late_fee_amount_cents` stays 0 in MVP; mora is on
   the bank slip via Cora `interest.rate` configured per school. **Implemented (bank-side).**
3. Send reminders — **out of MVP scope.** `Billing::CollectionReguaNotifier` is invoked
   on each overdue transition but only writes a log line. Platform email régua (future
   channel) and Cora `notification` payload on issuance are **not** implemented in MVP;
   any pre/post-due reminders are the bank's native behaviour until phase 2.
4. Reflect counts and amounts on `GET /billing/summary`. **Implemented.**

MVP delivery covers overdue *detection and visibility* plus mora on the boleto once
`interest_rate_percent` is configured. Automated platform dunning is phase 2.

### UC-04 — Guardian views and pays charges

Input: authenticated guardian, `school_id`.

Flow:

1. List open charges (`pending`, `overdue`) at `GET /me/charges`.
2. View detail with `payment_methods` (boleto URL, Pix copy-paste).
3. Optionally `POST /me/charges/:id/reissue` for second copy.
4. Payment history at `GET /me/charges/history` and `GET /me/payments`.

### UC-05 — School delinquency dashboard

Input: school staff with `role: staff` (legacy `school`) and `view_billing_summary` or
`manage_billing` permission.

Flow:

1. `GET /billing/summary` returns open/overdue counts and amounts, paid-this-month,
   expected collection.
2. `GET /billing/charges` with filters (`status`, `guardian_id`, `due_date` range).

### UC-06 — Membership invite (guardian or staff)

> **Superseded by:** [`docs/prds/identity-and-onboarding/onboarding.md`](identity-and-onboarding/onboarding.md)
> (UC-O04, UC-O07) and [`permissions.md`](identity-and-onboarding/permissions.md) (presets).
> Token + set-password flow replaces random password stub.

Input: school admin, email, role.

Flow:

1. `POST /people/memberships` creates membership `status: invited`.
2. System sends invite (email — provider pending).
3. User registers or logs in, accepts invite → `active`.
4. For guardians: link `guardians.user_id`. Resend via `POST .../invite`.

### UC-07 — Document upload and review (enrollment/KYC)

Input: school staff upload; guardian read-only via `/me/documents`.

Flow:

1. `POST /documents` (multipart) attaches to `School`, `Guardian`, or `Student`.
2. School reviews: `approve` or `reject` with reason.
3. Guardian sees approved/pending docs for linked children only.

### UC-08 — Backoffice school onboarding

> **Superseded by:** [`docs/prds/identity-and-onboarding/onboarding.md`](identity-and-onboarding/onboarding.md)
> (UC-O01–UC-O05). Extended with onboarding modes, owner invite, and handoff.

Input: backoffice user.

Flow:

1. `POST /api/v1/schools` creates tenant.
2. School admin membership provisioned (Wave 6 / onboarding flow).
3. Soft delete via `DELETE /schools/:id` (Discard).

---

## API

Full route map, request/response examples, and rswag layout:
[`docs/api/v1/fintech-first.md`](../api/v1/fintech-first.md).

Auth contract: [`docs/modeling/002-api-auth.md`](../modeling/002-api-auth.md).

### Delivery waves (OpenAPI / rswag priority)

| Wave | Scope |
|------|--------|
| **1** | `auth/*`, `GET /me`, `POST /me/device_tokens` |
| **2** | Guardian `me/charges`, `me/payments`, `me/students`, `me/documents` |
| **3** | School `billing/*`, `billing/summary` |
| **4** | `people/*`, `memberships` |
| **5** | `documents/*` (school write) |
| **6** | Backoffice `schools`, user disable/enable |

### Implementation dependency order

Waves 2–3 require people and billing master data. Implement in this order:

**1 → 6 → 4 → 3 → 2 → 5**

(Wave 1 auth first; Wave 6 minimal school tenant; Wave 4 people; then billing school,
guardian, documents.)

### Webhook (not under `/api/v1`)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/webhooks/:provider/:token` | Secret token in URL (per-school `webhook_endpoint_token`) — no HMAC signature |

Cora's notification has no body and no signature, so there is nothing to sign. Security
comes from the secret URL token plus the rule that reconciliation is decided by an
authenticated `fetch_invoice` read, never by the notification content (see
`docs/api/README.md`).

### Key endpoints by role

| Role | Base path | Operations |
|------|-----------|------------|
| — (auth) | `/api/v1/auth/*`, `/api/v1/me` | Login, refresh, profile |
| backoffice | `/api/v1/schools`, `/api/v1/users/:id/disable` | Tenant CRUD, platform disable |
| staff | `.../people/*`, `.../billing/*`, `.../documents/*` | CRUD + billing ops (preset permissions) |
| guardian | `.../me/*` | Read family billing; reissue; documents read |

> **Note:** `school` role in historical implementations maps to `staff`. Permission keys
> supersede the binary staff gate — see identity permissions PRD.

---

## Errors

Standard envelope per `docs/api/README.md`:

```json
{ "error": { "code": "invalid_state_transition", "message": "..." } }
```

| HTTP | `error.code` (examples) | When |
|------|-------------------------|------|
| `400` | `bad_request` | Malformed JSON or params |
| `401` | `unauthorized` | Missing/invalid access token |
| `403` | `forbidden` | Valid token, policy denies action |
| `404` | `not_found` | Resource missing or cross-tenant/family scope |
| `409` | `duplicate_email`, `invalid_state_transition` | Unique violation; invalid AASM transition |
| `422` | `validation_error` | Model validation failed (`details` per field) |
| `501` | `not_implemented` | Phase 2 routes (communication, academic) |
| `500` | `internal_error` | Unexpected failure |

Invalid charge cancel/reissue on `paid` or `cancelled` charge → `409`
`invalid_state_transition`.

---

## Database

Do not duplicate full table definitions here. Update `schema.dbml` before migrations.

| Artifact | Location |
|----------|----------|
| Executable schema (DBML) | [`docs/database/schema.dbml`](../database/schema.dbml) |
| Edit workflow | [`docs/database/database_dml.md`](../database/database_dml.md) |
| DER export (PNG) | [`docs/database/der_001.png`](../database/der_001.png) |
| Narrative DSL + LGPD | [`docs/modeling/001-fintech-first.md`](../modeling/001-fintech-first.md) |
| API auth | [`docs/modeling/002-api-auth.md`](../modeling/002-api-auth.md) |

**Entity groups**

| Group | Tables |
|-------|--------|
| Identity | `users`, `memberships`, `refresh_tokens`, `device_tokens` |
| School | `school_groups`, `schools`, `guardians`, `students`, `student_guardians` (plus `teachers`, modeled in DBML but not migrated) |
| Billing | `billing_plans`, `school_payment_providers`, `school_billing_settings`, `contracts`, `charges`, `charge_issuances`, `applied_discounts`, `payments`, `webhook_events` |
| Documents (enrollment/KYC) | `documents` |
| Auditing | `audits` (audited gem — not a domain entity) |

**Pending schema work** (see Open items): `interest_rate_percent` on
`school_billing_settings`; migrated payment history storage (phase 2).

Any PRD entity change must be reflected in `schema.dbml` before `web/` implementation.

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `ChargeGenerated` | Job creates charge + enqueues issuance | Notifications, audit |
| `ChargeOverdue` | Daily job marks overdue | Régua notifications, dashboard |
| `ChargeCancelled` | `Billing::CancelChargeService` | Provider void (if applicable), audit |
| `PaymentConfirmed` | Webhook job completes | Guardian + school notifications |
| `WebhookReceived` | `POST /webhooks/:provider/:token` | Async job enqueue |
| `WebhookProcessed` | Job success/failure | Monitoring/alerting on failure |
| `MembershipInvited` | Create/resend invite | Email job |
| `UserDisabled` | Backoffice disable | Revoke refresh tokens |
| `DocumentUploaded` | `POST /documents` | School review queue |
| `DocumentApproved` / `DocumentRejected` | Review actions | Guardian notification (optional) |

Payloads are internal (Solid Queue jobs / future event bus). No public event API in MVP.

---

## Scheduled jobs

Configured in `web/config/recurring.yml` (Solid Queue), all on the `billing` queue.

| Job | Schedule | Purpose |
|-----|----------|---------|
| `Billing::MonthlyChargeGenerationJob` | 6:00 on the 1st | Fan out charges for active contracts (manual trigger: `POST /billing/charge_generations`) |
| `Billing::PurgeWebhookEventsJob` | 5:30 daily | Delete processed `webhook_events` older than the retention window (180 days) |
| `Billing::DailyReconciliationJob` | 6:00 daily | List provider invoices from the last 14 days per active config and settle any paid invoice the webhook path missed; also reports charges still unissued |
| `Billing::MarkOverdueChargesJob` | 6:30 daily | Apply grace days and transition charges to `overdue` |
| `Billing::MonitorBillingHealthJob` | 7:00 daily | Surface issuance/reconciliation failures for alerting |

---

## Permissions

> **Superseded by:** [`docs/prds/identity-and-onboarding/permissions.md`](identity-and-onboarding/permissions.md)
> for staff presets and granular permission keys. Table below remains the fintech-first
> implementation snapshot until W1 migration.

Pundit policies enforce role × action. Controller calls `authorize` before services.

| Resource | backoffice | school | guardian | teacher |
|----------|:----------:|:------:|:--------:|:-------:|
| `schools` CRUD | ✓ | — | — | — |
| `users` disable/enable | ✓ | — | — | — |
| `people/guardians`, `students` | — | ✓ | — | — |
| `student_guardians` | — | ✓ | — | — |
| `people/memberships` | — | ✓ | — | — |
| `billing/*` | — | ✓ | — | — |
| `me/charges`, `me/payments` | — | — | ✓ | — |
| `me/students`, `me/documents` | — | — | ✓ | — |
| `documents` write/review | — | ✓ | — | — |
| `auth/*`, `GET /me` | ✓ | ✓ | ✓ | ✓ |

Guardian policies scope through `guardians.user_id = current_user` and
`student_guardians` links. Teachers are schema stubs in this PRD — no teacher MVP flows.

Audit history (`audits`) is exposed only to backoffice/school roles, not guardians by default.

---

## Acceptance Criteria

### Wave 1 — Auth and profile

```gherkin
Given a registered user with active membership
When they POST /api/v1/auth/login with valid credentials
Then they receive access and refresh tokens
And GET /api/v1/me returns user, memberships, and guardian_profiles when applicable

Given an authenticated user on mobile
When they POST /api/v1/me/device_tokens with a valid FCM token
Then the token is stored for push delivery
```

### Wave 6 — Backoffice (implement before billing data)

```gherkin
Given a backoffice user
When they POST /api/v1/schools with valid payload
Then a new school tenant is created

Given a backoffice user and a platform user
When they POST /api/v1/users/:user_id/disable
Then users.status becomes disabled and refresh tokens are revoked
```

### Wave 4 — People

```gherkin
Given a school admin and an existing school
When they POST /people/guardians and POST /people/students
And link them via POST /students/:id/guardians
Then guardians and students are visible only within that school_id

Given a school admin
When they POST /people/memberships with role guardian and status invited
Then the invitee can activate membership and link guardians.user_id
```

### Wave 3 — School billing

```gherkin
Given active billing_plans and contracts
When the charge generation job runs for the billing period
Then charges are created with correct amounts and guardian_id

Given a pending charge
When the school POST /billing/charges/:id/cancel
Then charge status becomes cancelled
And a subsequent cancel attempt returns 409 invalid_state_transition

Given paid and open charges
When the school GET /billing/summary
Then open_count, overdue_count, and amount fields match kept charges
```

### Wave 2 — Guardian billing

```gherkin
Given a guardian with student_guardians links
When they GET /schools/:school_id/me/charges
Then only their family's open charges are returned
And another guardian's charges are not visible (404 on direct id access)

Given a pending charge with a bank slip issuance
When the guardian GET /me/charges/:id
Then payment_methods includes boleto_url and pix_copy_paste

Given a paid charge
When the guardian GET /me/charges/history
Then paid records appear with source platform
```

### Wave 5 — Documents

```gherkin
Given a school admin
When they POST /documents with a file for a student
Then document status is pending

Given a pending document
When the school POST /documents/:id/approve
Then status becomes approved
And the guardian sees it via GET /me/documents for linked children
```

### Webhooks

```gherkin
Given a valid provider payment webhook
When POST /webhooks/:provider/:token is called with the school's endpoint token
Then a webhook_event row is stored
And async processing fetches the invoice, creates payment, and marks charge paid

Given the same provider event id delivered twice
When the webhook is processed again
Then no duplicate payment is created
```

### Phase 2 skeleton

```gherkin
Given communication or academic routes are called
When the domain PRD does not exist
Then the API returns 501 not_implemented
```

---

## Non-functional requirements

- **Billing reliability**: charge generation or issuance failures must alert/monitor —
  billing errors have legal and reputational impact.
- **Webhook idempotency**: duplicate or out-of-order provider events must not corrupt payments.
- **Audit trail**: changes to `charges`, `contracts`, `guardians`, `documents`, etc. via
  `audited` + `SchoolAuditable`; `payments` are immutable facts.
- **LGPD**: `guardians.cpf`, email, phone; `students.birth_date` (child data). Retention
  windows pending legal validation — see `open-questions.md`.
- **Per-school isolation** (`school_id`) and **per-family isolation** for guardian routes.

---

## Out of Scope

- Academic management (grades, classes, attendance, lesson plans).
- Structured parent↔teacher↔school communication (messages, images).
- Full digital archive / student document repository (enrollment/KYC only in MVP).
- Livro Ata and digital signature.
- Receivables anticipation (school receives early; platform assumes risk).
- Multi-unit school network product UX (`school_groups` schema ready; flow deferred).
- Phase 2 API domains until PRDs exist: `communication`, `academic` (OpenAPI skeleton only).
- Teacher-facing surfaces in this PRD (schema stub only).

---

## Open items / pending decisions

Tracked here and in [`docs/open-questions.md`](../open-questions.md). Do not invent
answers in implementation.

- [x] **Bank slip provider — decided:** Cora Direct Integration on the school's own
      Cora account (mTLS, registered boleto with embedded Pix). Alternatives considered:
      Asaas, Iugu, Pagar.me — rejected for MVP because the partner uses a direct bank
      relationship and Cora supports invoice APIs without acting as a payment aggregator.
- [x] **Provider invoice reference — decided:** `charge_issuances` holds canonical
      issuance history (`provider_invoice_id`, idempotency key, slip artifacts); `charges`
      caches the active invoice id and display URLs for guardian APIs.
- [x] **Migrated payment history — decided (MVP):** forward-only; guardian history returns
      `source: platform` for charges paid in this system. Column/join table for
      `source: migrated` / `external_reference` deferred until import scope is defined.
- [x] **Collection régua — decided:** MVP platform régua **not implemented** (stub
      notifier only). Future channel: **email** via platform mailer +
      `notification_schedule`. WhatsApp/SMS out of MVP. Cora `notification` on issuance
      not sent by platform in MVP.
- [x] **Late fee/interest — decided:** mora **interest only**, per school
      (`interest_rate_percent`, no default); Cora `payment_terms.interest.rate` on issuance.
      **Pontualidade** and **multa** ship in PR2 via school settings → Cora payment terms.
      `LateFeeCalculator` stays zero until portal interest estimate (phase 2). Issuance blocked
      when rate unset.
- [ ] Manually negotiated discount approval flow (scholarship, one-off agreement).
- [x] **Plan discount band at charge generation (PR1)** — `contracts.plan_discount_id`
      applies `PlanDiscount#apply_to` against `billing_plan.base_amount_cents` when monthly
      charges are generated (`GenerateChargesService`, `BulkGenerateChargesService`);
      writes `applied_discounts` with `discount_type: plan_discount`. Negotiated amount
      is ignored when a band is present. Boleto **multa** and **pontualidade** are configured in
      school billing settings (PR2) and sent to Cora on issuance.
- [ ] Invoice issuance (NFS-e) in MVP or later phase.
- [ ] Platform SaaS billing model for schools.
- [x] **Guardian access — decided:** Devise account (`users` + `memberships` +
      `guardians.user_id`). Magic link per charge is a future alternative.
- [x] **Fintech-first vs School Lab monorepo — decided:** single **School Lab** product;
      billing is the first live module; communication and academic join the same codebase
      and shared entities later. See Positioning note.

---

## Positioning note — relation to School Lab

This PRD proposes an **inverted** build order relative to School Lab's validated MVP
(communication as priority #1, Jul 2026). That is intentional for the billing-first partner.

The billing domain is now implemented in this monorepo (`web/`), on the schema in
`docs/database/schema.dbml` and the narrative in `docs/modeling/001-fintech-first.md`.

**Decided (Aug 2026, discovery #21):** School Lab is a **single product**. The
billing-first partner slice ships first; communication and academic domains join the same
`web/` API, shared entities (`School`, `User`, `Membership`, `Student`, `StudentGuardian`),
and client surfaces — without parallel tables or a separate repository.
