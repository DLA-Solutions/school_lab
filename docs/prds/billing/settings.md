# PRD — Billing: Settings (BC5)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `billing.configure_early_payment_discount` (+ mora/multa/pontualidade as school payment terms)  
> Divergence: [`DIV-financial-004`](../../ref/divergencias.md) — tiered early-payment discounts  
> Related BCs: [`charges.md`](charges.md), [`boletos.md`](boletos.md), [`dunning.md`](dunning.md)  
> Modeling: `school_billing_settings` in [`001-fintech-first.md`](../../modeling/001-fintech-first.md)  
> API baseline: [`fintech-first.md`](../../api/v1/fintech-first.md) — `GET/PATCH /billing/settings`

---

## Objective

Define **per-school payment terms** — mora (interest), multa (fine), pontualidade (early-payment
discount), grace days, and boleto presentation — with **no platform defaults** for mora rate
(Aug 2026) and **tiered discount support** per [`DIV-financial-004`](../../ref/divergencias.md).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Early-payment discount | `billing.configure_early_payment_discount` | Proesc plan trilha, Agenda Edu planos, ClassApp régua + discounts |
| Mora / multa / pontualidade | *(payment terms)* | Brazilian boleto `payment_terms` — Cora API mapping in fintech-first BR-011 |
| Grace days | *(operational)* | [`fintech-first.md`](../fintech-first.md) BR-011 |

---

## Implementation status

| Setting | Status | Cora mapping |
|---------|--------|--------------|
| `overdue_grace_days` (0–30, default 3) | **implemented** | Overdue job input |
| `interest_rate_percent` (monthly mora) | **implemented** | `payment_terms.interest.rate` — **required before issuance** |
| `fine_type` + fine amount/rate | **partial** | `payment_terms.fine` — PR2 fields in code |
| `early_payment_discount_percent` | **partial** | `payment_terms.discount` — single percent; tiered planned |
| `boleto_service_description` | **implemented** | Invoice line description |
| `notification_schedule` | **stored, unused** | Régua deferred — [`dunning.md`](dunning.md) |

---

## Business Rules

BR-S01

Exactly one `school_billing_settings` row per school (singular resource). **Implemented.**

BR-S02

`overdue_grace_days` is integer 0–30; default 3. Evaluated in school timezone with
`Billing::BusinessDayCalendar`. **Implemented.**

BR-S03

`interest_rate_percent` (monthly mora) has **no platform default**. Issuance is **blocked**
until set ([`boletos.md`](boletos.md) BR-B05). **Implemented.**

BR-S04

Mora **interest is applied by the bank** on the registered boleto — not by
`Billing::LateFeeCalculator` in MVP (calculator returns zero; phase 2 portal estimate).
**Implemented.**

BR-S05

**Multa (fine):** optional per school — `fine_type` `percent` | `fixed` maps to Cora
`payment_terms.fine`; start date default due + 1 day. Nullable = no fine. **Partial.**

BR-S06

**Pontualidade (early payment discount):** optional `early_payment_discount_percent` maps to Cora
`payment_terms.discount` (`type: PERCENT`, limit = day before due). **Partial** — single band.

BR-S07

**Planned (DIV-financial-004):** Tiered early-payment rules — array of
`{ days_before_due, discount_percent }` sorted descending; adapter picks best eligible band at
payment time; stored in settings JSON or child table at modeling.

BR-S08

Settings changes after issuance do **not** retroactively alter active `charge_issuances` —
staff must reissue to apply new terms `[product decision]`.

BR-S09

Only staff with `manage_billing` may PATCH settings. **Implemented.**

BR-S10

Settlement interest from bank persists on `payments.interest_amount_cents` when provider reports
it. **Implemented.**

BR-S11

Annual tax-declaration purpose eligibility is configured per school in `billing_purposes`, not in
payment-provider settings or `school_transactions.category`. Changes apply only to future charges;
see [`tax-declarations.md`](tax-declarations.md).

---

## Use Cases

### UC-S01 — Configure school billing settings

Input: grace days, mora rate, fine, discount tiers, service description.

Flow

1. Validate ranges (percent 0–100, grace 0–30).
2. Persist settings.
3. Subsequent issuances use new terms.

**Status:** **partial** — core fields **implemented**; tiers **planned**.

### UC-S02 — Block issuance without mora rate

Flow

1. Issue job loads settings.
2. If `interest_rate_percent` nil, fail with `interest_rate_required`.

**Status:** **implemented**.

### UC-S03 — Apply tiered pontualidade at payment

Flow

1. Guardian pays N days before due.
2. Adapter selects highest eligible discount band (when tiers ship).
3. Settled amount reflects discount on `payments` row.

**Status:** **planned** (W1).

---

## API

| Method | Path | Status |
|--------|------|--------|
| `GET` | `/billing/settings` | **implemented** |
| `PATCH` | `/billing/settings` | **implemented** |

Example response fields (extend when tiers ship):

```json
{
  "data": {
    "overdue_grace_days": 3,
    "interest_rate_percent": "1.0",
    "fine_type": "percent",
    "fine_rate_percent": "2.0",
    "early_payment_discount_percent": "5.0",
    "early_payment_discount_tiers": [],
    "boleto_service_description": "Mensalidade escolar"
  }
}
```

---

## Database

Table: `school_billing_settings` — see [`schema.dbml`](../../database/schema.dbml).
Planned: `early_payment_discount_tiers` child table or JSONB column.

---

## Permissions

`manage_billing` required for PATCH.

---

## Non-functional requirements

- [NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains) — blocking issuance without mora prevents non-compliant slips.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — settings changes audited.

---

## Acceptance Criteria

AC-S01

- [ ] Given unset interest rate, when staff PATCH settings to 1.0% monthly, then subsequent issuance succeeds.
- Source: [`fintech-first.md`](../fintech-first.md) — **implemented**

AC-S02

- [ ] Given fine_type percent 2%, when boleto issued, then Cora payload includes fine rate starting day after due.
- Source: [`fintech-first.md`](../fintech-first.md) BR-011 — **partial**

AC-S03

- [ ] Given tiers [{7 days, 10%}, {3 days, 5%}], when guardian pays 5 days early, then 10% discount applies on settlement.
- Source: [`DIV-financial-004`](../../ref/divergencias.md) — **planned**

AC-S04

- [ ] Given staff without manage_billing, when PATCH settings, then 403.
- Source: `[invented]` — **implemented**

---

## Open items

- [ ] Single vs multi-band pontualidade schema — modeling increment.
- [ ] Guardian UX copy for terms — layer PRD.

---

## Out of Scope

- Gateway credentials — [`payments.md`](payments.md) / `bank_credentials`.
- NFS-e per-city parameters — [`invoices.md`](invoices.md) P2.
- Platform-wide default mora rate — explicitly rejected Aug 2026.
- Annual declaration calculation, wording, and versioning — [`tax-declarations.md`](tax-declarations.md).
