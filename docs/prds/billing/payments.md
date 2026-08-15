# PRD — Billing: Payments (BC3)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `billing.accept_pix_payment`, `billing.accept_card_payment`, `billing.pay_online`, `billing.configure_payment_gateway`, `billing.onboard_payment_gateway`, `billing.record_manual_payment`, `billing.process_batch_payment`, `billing.manage_payment_links`, `billing.manage_recurring_card`  
> Divergence: [`DIV-financial-002`](../../ref/divergencias.md) — abstract gateway; ClassPay/ClipPag as reference only  
> Related BCs: [`boletos.md`](boletos.md), [`guardian-portal.md`](guardian-portal.md)  
> Modeling: [`001-fintech-first.md`](../../modeling/001-fintech-first.md) — `payments`, `school_payment_providers`  
> API baseline: [`fintech-first.md`](../../api/v1/fintech-first.md) — read-only `/payments`, `bank_credentials`

---

## Objective

Define **payment instruments and settlement** — Pix, card, boleto settlement, manual receipts,
batch operations, payment links, recurring card, and gateway onboarding — through an
**abstract payment gateway** per [`DIV-financial-002`](../../ref/divergencias.md).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Accept Pix | `billing.accept_pix_payment` | Sponte Pay, Agenda Edu Pagamentos Digitais, Proesc app pay |
| Accept card | `billing.accept_card_payment` | Sponte recurring card, ClassApp ClassPay |
| Pay online | `billing.pay_online` | Agenda Edu native checkout |
| Configure gateway | `billing.configure_payment_gateway` | Proesc gateway settings |
| Onboard gateway | `billing.onboard_payment_gateway` | KYC / Receba Fácil patterns |
| Manual payment | `billing.record_manual_payment` | ClassApp manual receipt |
| Batch payment | `billing.process_batch_payment` | Agenda Edu batch settlement |
| Payment links | `billing.manage_payment_links` | Sponte/Agenda Edu payment links |
| Recurring card | `billing.manage_recurring_card` | Proesc, Agenda Edu card recurrence |

---

## Implementation status

| Feature | Status | Notes |
|---------|--------|-------|
| Boleto + embedded Pix settlement | **implemented** | Via Cora invoice + webhooks |
| `payments` immutable records | **implemented** | BR-006 fintech-first |
| Bank slip provider onboarding (Cora mTLS) | **implemented** | `instrument: bank_slip` |
| Staff/guardian payment read APIs | **implemented** | `/billing/payments`, `/me/payments` |
| Standalone Pix QR checkout | **planned** | Beyond slip-embedded Pix |
| Card checkout + tokenization | **planned** | Second `instrument: card` row |
| Manual payment recording | **planned** | Cash, external transfer |
| Batch payment processing | **planned** | Staff multi-select settle |
| Shareable payment links | **planned** | Overdue/ad-hoc |
| Recurring card with consent | **planned** | Opt-in per guardian |

---

## Business Rules

BR-P01

`payments` and settlement ingress are **immutable** — no Discard, no in-place edits
([`fintech-first.md`](../fintech-first.md) BR-006). **Implemented.**

BR-P02

MVP Pix for guardians is **embedded on registered boleto** (copy-paste + QR in
`payment_methods`). Standalone Pix checkout is an extension sharing the same reconciliation
path. **Partial.**

BR-P03

`school_payment_providers` is keyed by `(school_id, instrument)` with one active row per
instrument. MVP instruments: `bank_slip` (Cora), `fake` (test). Card adds `instrument: card`
without changing bank slip port. **Implemented** for bank_slip.

BR-P04

**Planned:** Manual payment creates `payments` with `source: manual`, `recorded_by_id`, optional
`external_reference`; triggers `charge.pay!` with audit.

BR-P05

**Planned:** Batch payment accepts array of `{ charge_id, paid_amount_cents, paid_at, method }`
in one transaction; partial failures roll back entire batch (NFR-001).

BR-P06

**Planned:** Payment links are signed tokens mapping to one charge or ad-hoc amount; expire after
`expires_at`; same gateway checkout as guardian portal.

BR-P07

**Planned:** Recurring card requires guardian consent record (`recurring_mandate_id`); charges
auto-debit on due date via gateway; failure notifies guardian and staff.

BR-P08

Gateway onboarding collects KYC fields per provider adapter; credentials stored encrypted;
webhook token generated server-side. **Partial** — Cora cert upload only.

BR-P09

Duplicate provider events must not double-settle — same idempotency as boletos (NFR-001).
**Implemented.**

---

## Use Cases

### UC-P01 — Settle boleto/Pix via provider

Flow: webhook/reconciliation → `payments` row → `charge.pay!`.

**Status:** **implemented** ([`fintech-first.md`](../fintech-first.md) UC-02).

### UC-P02 — Guardian card checkout

Input: charge id, card token.

Flow

1. Guardian authorizes on `/me/charges/:id/pay` (planned route).
2. Adapter charges card; on success create `payments`, transition charge.
3. Push confirmation (when notification policy enabled).

**Status:** **planned** (W4).

### UC-P03 — Record manual payment

Input: charge id, amount, method, paid_at, note.

Flow

1. Staff `manage_billing` records manual payment (BR-P04).
2. Transition charge to `paid`.
3. Audit.

**Status:** **planned**.

### UC-P04 — Process batch payments

Input: list of settlements.

Flow

1. Validate all charges same school and open state.
2. Atomic batch insert payments + transitions.
3. Export receipt summary.

**Status:** **planned**.

### UC-P05 — Create payment link

Input: charge id or amount, expiry.

Flow

1. Generate link token URL for guardian share (WhatsApp adapter — comms).
2. Checkout resolves to UC-P02 or boleto reissue.

**Status:** **planned**.

### UC-P06 — Onboard payment gateway

Input: instrument, provider credentials.

Flow

1. Staff or backoffice uploads credentials / completes KYC wizard.
2. Validate connection (test invoice or ping).
3. Activate provider row; expose webhook URL.

**Status:** **partial** — Cora mTLS **implemented**.

---

## API

Implemented read routes per [`fintech-first.md`](../../api/v1/fintech-first.md).

Planned:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/me/charges/:id/pay` | Guardian checkout (card/Pix) |
| `POST` | `/billing/charges/:id/manual_payments` | Staff manual receipt |
| `POST` | `/billing/batch_payments` | Batch settle |
| `POST` | `/billing/payment_links` | Create link |
| `GET` | `/billing/payment_links/:token` | Public resolve (scoped) |
| `POST` | `/me/recurring_mandates` | Opt-in recurring card |

---

## Errors

| Status | Code | When |
|--------|------|------|
| `402` | `payment_failed` | Gateway decline |
| `409` | `already_paid` | Duplicate settle |
| `422` | `invalid_amount` | Manual pay mismatch policy |

---

## Database

Existing: `payments`, `school_payment_providers`.
Planned: `payment_links`, `recurring_mandates`, `card_instrument` provider rows.

---

## Permissions

| Action | Key |
|--------|-----|
| Manual/batch payment | `manage_billing` |
| Gateway config | `manage_billing` |
| Guardian checkout | authenticated guardian, family scope |
| Backoffice onboarding assist | backoffice + audit |

---

## Non-functional requirements

- [NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains) — immutable payments; idempotent gateway callbacks.
- PCI: card data never touches School Lab servers — tokenization at gateway `[product decision]`.

---

## Acceptance Criteria

AC-P01

- [ ] Given confirmed Cora payment webhook, when job completes, then `payments` row exists and charge is `paid`.
- Source: [`fintech-first.md`](../fintech-first.md) — **implemented**

AC-P02

- [ ] Given open charge, when guardian completes card checkout with valid token, then charge is paid and receipt appears in `/me/payments`.
- Source: [`DIV-financial-002`](../../ref/divergencias.md) — **planned**

AC-P03

- [ ] Given pending charge, when staff records manual cash payment with amount and date, then charge is paid and audit shows recorder.
- Source: ClassApp pattern — **planned**

AC-P04

- [ ] Given three open charges, when staff submits batch payment, then all three paid or none if any row invalid.
- Source: `[invented]` — **planned**

AC-P05

- [ ] Given school uploads Cora mTLS credentials, when test connection succeeds, then active `bank_slip` provider row exists and webhook URL is shown.
- Source: [`fintech-first.md`](../../api/v1/fintech-first.md) — **implemented**

---

## Out of Scope

- Platform SaaS subscription billing for schools.
- ERP sync — P2.
- ClassPay embedded dashboard — P2 `billing.view_classpay_dashboard`.
- Guaranteed revenue product — N/A [`DIV-financial-008`](../../ref/divergencias.md).
