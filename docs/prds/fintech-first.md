# PRD — Billing Module ("Fintech-first" Strategy for Schools)

> Status: draft for partner validation (early childhood school director)  
> Scope: domain bundle (identity, schools, people, billing, documents)  
> API: [`docs/api/v1/fintech-first.md`](../api/v1/fintech-first.md)  
> Relation to School Lab: derived front — does not replace the MVP order validated in  
> `vision.md` (communication → academic → billing). See **Positioning note** at the end.

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

- **School admin**: responsive web (`web-ui/`) — plans, contracts, charges, dashboard.
- **Guardian**: responsive web portal in MVP; Wave 2 API is contract-ready for
  React Native (`app/`) when that channel ships. Fintech-first partner validation does
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

Guardian portal access requires `users` + `memberships` (role `guardian`, status
`active`) + `guardians.user_id` linked after invite acceptance. Invite flow:
create membership `invited` → guardian registers → `active`, set `guardians.user_id`.

BR-010

Active `contracts` drive recurring charge generation per `billing_period`. Each charge
references the financially responsible `guardian_id`, applies `applied_discounts`, and
computes `total_amount_cents` (original − discount + late fees when applicable).

BR-011

Late fee/interest is configurable per school (rule details pending — see Open items).
Overdue charges update `late_fee_amount_cents` and `total_amount_cents` before régua notifications.

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
5. Notify guardian (email/WhatsApp — channel pending).
6. Emit `ChargeGenerated`.

### UC-02 — Payment reconciliation (provider webhook)

Input: provider webhook at `POST /webhooks/:provider/:token` (school resolved from
`webhook_endpoint_token` on `school_payment_providers`).

Flow:

1. Persist raw payload in `webhook_events` (idempotent on `provider` + `provider_event_id`).
2. Enqueue async job.
3. Resolve target `charge_issuance` via `provider_resource_id` (provider invoice id).
4. Call `fetch_invoice` on the bank slip adapter to confirm current invoice state.
5. Create/update `payments` with `provider_payment_id`, `paid_amount_cents`, `paid_at`.
6. Invoke `charge.pay!` when payment confirmed.
7. Notify guardian and school. Emit `PaymentConfirmed`.

### UC-03 — Collection régua (dunning)

Input: overdue `charges`, school régua configuration.

Flow:

1. Daily job marks eligible `pending` charges past `due_date` as `overdue`.
2. Apply late fee/interest per BR-011.
3. Send reminders (D−N before due, on due date, D+1, D+3, D+7 — configurable).
4. Reflect counts and amounts on `GET /billing/summary`.

### UC-04 — Guardian views and pays charges

Input: authenticated guardian, `school_id`.

Flow:

1. List open charges (`pending`, `overdue`) at `GET /me/charges`.
2. View detail with `payment_methods` (boleto URL, Pix copy-paste).
3. Optionally `POST /me/charges/:id/reissue` for second copy.
4. Payment history at `GET /me/charges/history` and `GET /me/payments`.

### UC-05 — School delinquency dashboard

Input: school admin with `role: school`.

Flow:

1. `GET /billing/summary` returns open/overdue counts and amounts, paid-this-month,
   expected collection.
2. `GET /billing/charges` with filters (`status`, `guardian_id`, `due_date` range).

### UC-06 — Membership invite (guardian or staff)

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
| `POST` | `/webhooks/:provider/:token` | Secret token in URL (per-school `webhook_endpoint_token`) |

### Key endpoints by role

| Role | Base path | Operations |
|------|-----------|------------|
| — (auth) | `/api/v1/auth/*`, `/api/v1/me` | Login, refresh, profile |
| backoffice | `/api/v1/schools`, `/api/v1/users/:id/disable` | Tenant CRUD, platform disable |
| school | `.../people/*`, `.../billing/*`, `.../documents/*` | CRUD + billing ops |
| guardian | `.../me/*` | Read family billing; reissue; documents read |

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
| School | `school_groups`, `schools`, `guardians`, `students`, `teachers`, `student_guardians` |
| Billing | `billing_plans`, `school_payment_providers`, `school_billing_settings`, `contracts`, `charges`, `charge_issuances`, `applied_discounts`, `payments`, `webhook_events` |
| Documents (enrollment/KYC) | `documents` |
| Auditing | `audits` (audited gem — not a domain entity) |

**Pending schema work** (see Open items): migrated payment history storage.

Any PRD entity change must be reflected in `schema.dbml` before `web/` implementation.

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `ChargeGenerated` | Job creates charge + enqueues issuance | Notifications, audit |
| `ChargeOverdue` | Daily job marks overdue | Régua notifications, dashboard |
| `ChargeCancelled` | `Billing::CancelCharge` | Provider void (if applicable), audit |
| `PaymentConfirmed` | Webhook job completes | Guardian + school notifications |
| `WebhookReceived` | `POST /webhooks/:provider/:token` | Async job enqueue |
| `WebhookProcessed` | Job success/failure | Monitoring/alerting on failure |
| `MembershipInvited` | Create/resend invite | Email job |
| `UserDisabled` | Backoffice disable | Revoke refresh tokens |
| `DocumentUploaded` | `POST /documents` | School review queue |
| `DocumentApproved` / `DocumentRejected` | Review actions | Guardian notification (optional) |

Payloads are internal (Solid Queue jobs / future event bus). No public event API in MVP.

---

## Permissions

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
- [ ] Migrated payment history (`source: migrated`, `external_reference`) — column or
      join table when import scope is defined.
- [ ] Collection régua channel: email, WhatsApp, SMS, or combination per school.
- [ ] Late fee/interest rule: per school or per billing plan.
- [ ] Manually negotiated discount approval flow (scholarship, one-off agreement).
- [ ] Invoice issuance (NFS-e) in MVP or later phase.
- [ ] Platform SaaS billing model for schools.
- [x] **Guardian access — decided:** Devise account (`users` + `memberships` +
      `guardians.user_id`). Magic link per charge is a future alternative.
- [ ] Fintech-first vs School Lab monorepo convergence — see Positioning note.

---

## Positioning note — relation to School Lab

This PRD proposes an **inverted** build order relative to School Lab's validated MVP
(communication as priority #1, Jul 2026). That is intentional for the billing-first partner.

Foundational modeling has started in this monorepo: `docs/database/schema.dbml`,
`docs/modeling/001-fintech-first.md`.

Two readings still open (`open-questions.md` — MVP and scope):

1. **Separate products** — School Lab ("communication pain #1") vs this billing module.
2. **Same codebase, two entry points** — schema must converge with School Lab entities
   (`School`, `User`, `Membership`, `Student`, `StudentGuardian`) without parallel tables.

Decide before full implementation — it affects repository boundaries and entity naming.
