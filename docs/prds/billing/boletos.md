# PRD — Billing: Boletos (BC2)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `billing.issue_boleto`, `billing.track_boleto_status`, `billing.resend_boleto`, `billing.integrate_boleto_bank`, `billing.send_boleto_remittance`  
> Feature slice: [`fintech-first/resend-boleto.md`](../fintech-first/resend-boleto.md)  
> Related BCs: [`charges.md`](charges.md), [`payments.md`](payments.md), [`settings.md`](settings.md)  
> Modeling: [`001-fintech-first.md`](../../modeling/001-fintech-first.md) — `charge_issuances`, `webhook_events`  
> API baseline: [`fintech-first.md`](../../api/v1/fintech-first.md) — reissue, webhooks, `bank_credentials`

---

## Objective

Define **registered boleto lifecycle** — issuance, settlement tracking, staff/guardian reissue,
bank integration, and remittance export — with **never-lose-state** reconciliation per
[`DIV-financial-002`](../../ref/divergencias.md) (abstract gateway; Cora MVP).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Issue boleto | `billing.issue_boleto` | [`proesc/gestao-financeira/fluxos.md`](../../ref/proesc/gestao-financeira/fluxos.md), [`agenda-edu/gestao-financeira/fluxos.md`](../../ref/agenda-edu/gestao-financeira/fluxos.md) |
| Track boleto status | `billing.track_boleto_status` | Proesc registration/settlement tracking |
| Resend boleto | `billing.resend_boleto` | [`proesc/gestao-financeira/fluxos.md#resend`](../../ref/proesc/gestao-financeira/fluxos.md) — [`resend-boleto.md`](../fintech-first/resend-boleto.md) |
| Integrate boleto bank | `billing.integrate_boleto_bank` | Proesc remessa + Cora direct pattern |
| Send remittance | `billing.send_boleto_remittance` | Proesc CNAB remessa — `[product decision]` layout |

---

## Implementation status

| Feature | Status | Notes |
|---------|--------|-------|
| Cora mTLS credential upload | **implemented** | `/bank_credentials` |
| Issue on charge create (async job) | **implemented** | `Billing::IssueChargeJob` |
| `charge_issuances` history | **implemented** | Idempotency key per attempt |
| Guardian/school reissue | **implemented** | `POST .../reissue` — new issuance row |
| Webhook + daily reconciliation | **implemented** | 14-day lookback |
| Payment terms (mora, fine, discount) on slip | **partial** | Via [`settings.md`](settings.md) → Cora adapter |
| Staff resend + guardian push | **planned** | [`resend-boleto.md`](../fintech-first/resend-boleto.md) draft |
| CNAB remittance batch export | **planned** | W3 |
| `resent_at` tracking | **planned** | resend-boleto slice |

---

## Business Rules

BR-B01

Each issuance creates one `charge_issuances` row with unique `idempotency_key`; retries reuse
the same row. **Implemented.**

BR-B02

`charges` caches active slip URLs and `provider_invoice_id`; canonical history on
`charge_issuances`. **Implemented.**

BR-B03

Reissue is allowed for `pending` and `overdue` charges; `paid` and `cancelled` return `409`.
**Implemented** ([`fintech-first.md`](../fintech-first.md) BR-012).

BR-B04

Settlement never trusts webhook body alone — job calls `fetch_invoice` over mTLS before
writing `payments`. **Implemented** (NFR-001).

BR-B05

Issuance is **blocked** when `school_billing_settings.interest_rate_percent` is unset
([`settings.md`](settings.md) BR-S03). **Implemented.**

BR-B06

**Planned (resend):** Staff resend requires permission `billing.resend`; sets `resent_at` on
active issuance; enqueues guardian push within 30s ([`resend-boleto.md`](../fintech-first/resend-boleto.md)).

BR-B07

**Planned:** Resend precondition — boleto `pending`, due within configurable window (default 7
days) `[product decision]`.

BR-B08

**Planned:** CNAB remessa export includes all issuances registered in date range for schools
using file-based bank integration (non-Cora or hybrid).

BR-B09

Embedded Pix on registered boleto is part of issuance response — not a separate checkout in MVP
([`payments.md`](payments.md) BR-P02).

---

## Use Cases

### UC-B01 — Issue boleto for charge

Input: charge id.

Flow

1. Load charge and school billing settings + payment terms.
2. Call bank slip adapter `create_invoice` with mora/multa/pontualidade.
3. Persist `charge_issuances`; update charge display fields.
4. On failure, alert monitoring; charge stays `pending` without slip.

**Status:** **implemented**.

### UC-B02 — Track registration and settlement

Input: provider webhook or reconciliation job.

Flow

1. Record `webhook_events` (idempotent).
2. Resolve issuance by `provider_resource_id`.
3. `fetch_invoice` → create/update `payments` → `charge.pay!` when paid.
4. Update `observed_status` on webhook row.

**Status:** **implemented**.

### UC-B03 — Guardian or staff reissue (second copy)

Input: charge id.

Flow

1. Validate state (BR-B03).
2. New `charge_issuances` row; invalidate prior active display URLs.
3. Return updated payment methods.

**Status:** **implemented** (reissue); distinct from staff **resend notification** (UC-B04).

### UC-B04 — Staff resend boleto to guardian

Input: charge id; staff confirms.

Flow

1. Validate permission `billing.resend` and preconditions (BR-B06, BR-B07).
2. Optionally refresh slip if expired (gateway 503 → no push, return 503).
3. Set `resent_at`; enqueue FCM push to financially linked guardians.
4. Audit resend action.

**Status:** **planned** — see [`resend-boleto.md`](../fintech-first/resend-boleto.md) ACs.

### UC-B05 — Export remittance file

Input: date range, bank layout.

Flow

1. Select registered issuances not yet remitted.
2. Generate CNAB file; mark `remittance_batch_id`.
3. Staff downloads file for bank upload.

**Status:** **planned**.

---

## API

| Method | Path | Status |
|--------|------|--------|
| `POST` | `/billing/charges/:id/reissue` | **implemented** |
| `POST` | `/billing/charges/:id/resend` | **planned** — staff notify + `resent_at` |
| `GET` | `/billing/remittances` | **planned** — list batches |
| `POST` | `/billing/remittances` | **planned** — generate CNAB |
| `POST` | `/webhooks/:provider/:token` | **implemented** |
| `GET/POST` | `/bank_credentials` | **implemented** |

---

## Errors

| Status | Code | When |
|--------|------|------|
| `409` | `invalid_state_transition` | Reissue/resend on paid charge |
| `422` | `boleto_already_paid` | Resend on paid — [`resend-boleto.md`](../fintech-first/resend-boleto.md) |
| `503` | `gateway_unavailable` | Cora 503; no push |
| `422` | `interest_rate_required` | Issuance blocked — settings |

---

## Database

Existing: `charge_issuances`, `webhook_events`, `school_payment_providers`.
Planned: `remittance_batches`, `resent_at` on issuances (or audit table).

---

## Events

| Event | Trigger |
|-------|---------|
| `BoletoIssued` | Successful issuance |
| `BoletoResent` | Staff resend (planned) |
| `RemittanceExported` | CNAB generated (planned) |
| `WebhookReceived` / `WebhookProcessed` | Ingress pipeline |

---

## Permissions

| Action | Key |
|--------|-----|
| Reissue | `manage_billing` or guardian self-service |
| Resend + push | `billing.resend` |
| Remittance export | `manage_billing` |
| Bank credentials | `manage_billing` |

---

## Non-functional requirements

- [NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains) — webhook idempotence; daily reconciliation; `Billing::MonitorBillingHealthJob`.
- Credentials never returned in API responses ([`fintech-first.md`](../../api/v1/fintech-first.md)).

---

## Acceptance Criteria

AC-B01

- [ ] Given a pending charge with unset interest rate, when issuance runs, then issuance fails with actionable error and no provider invoice is created.
- Source: [`fintech-first.md`](../fintech-first.md) BR-011 — **implemented**

AC-B02

- [ ] Given a paid provider invoice, when duplicate webhook arrives, then no duplicate payment row is created.
- Source: [`fintech-first.md`](../fintech-first.md) — **implemented**

AC-B03

- [ ] Given pending boleto due tomorrow, when school admin with `billing.resend` confirms resend, then API 200, `resent_at` set, guardian push within 30s.
- Source: [`resend-boleto.md`](../fintech-first/resend-boleto.md) — **planned**

AC-B04

- [ ] Given paid boleto, when admin attempts resend, then 422 `boleto_already_paid` and no push.
- Source: [`resend-boleto.md`](../fintech-first/resend-boleto.md) — **planned**

AC-B05

- [ ] Given registered issuances in period, when staff exports remittance, then CNAB file downloads and issuances link to batch id.
- Source: [`proesc/gestao-financeira/fluxos.md`](../../ref/proesc/gestao-financeira/fluxos.md) — **planned**

---

## Out of Scope

- Card/Pix standalone checkout — [`payments.md`](payments.md).
- Boleto protest — P2 [`dunning.md`](dunning.md).
- Non-Cora provider implementation details beyond port interface — adapter docs in `web/` guidelines.
