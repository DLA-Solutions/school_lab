# PRD — Billing: Charges (BC1)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `billing.issue_charge`, `billing.manage_payment_plan`, `billing.manage_charge_types`, `billing.adjust_charge`, `billing.cancel_charge`, `billing.negotiate_receivable`, `billing.view_student_receivables`, `billing.manage_financial_operations`  
> Related BCs: [`boletos.md`](boletos.md), [`settings.md`](settings.md), [`payments.md`](payments.md)  
> Modeling: [`docs/modeling/001-fintech-first.md`](../../modeling/001-fintech-first.md)  
> API baseline: [`docs/api/v1/fintech-first.md`](../../api/v1/fintech-first.md) — `billing/plans`, `contracts`, `charges`, `charge_generations`

---

## Objective

Define **enrollment receivables** — billing plans, contracts, charge generation, typed debits,
adjustments, cancellation, and receivables search — as the core billing unit per
[`DIV-financial-001`](../../ref/divergencias.md) (débito + parcelas pattern from Proesc).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Issue charge | `billing.issue_charge` | [`proesc/gestao-financeira/funcionalidades-por-ator.md`](../../ref/proesc/gestao-financeira/funcionalidades-por-ator.md), [`agenda-edu/gestao-financeira/funcionalidades-por-ator.md`](../../ref/agenda-edu/gestao-financeira/funcionalidades-por-ator.md), [`classapp/gestao-financeira/funcionalidades-por-ator.md`](../../ref/classapp/gestao-financeira/funcionalidades-por-ator.md) |
| Manage payment plan | `billing.manage_payment_plan` | Proesc planos de cobrança, Agenda Edu parcelas, ClassApp matrículas plans |
| Manage charge types | `billing.manage_charge_types` | Proesc tipos de débito — `[product decision]` chart mapping |
| Adjust charge | `billing.adjust_charge` | Agenda Edu bolsa/isenção, ClassApp discount patterns |
| Cancel charge | `billing.cancel_charge` | Proesc estorno/cancelamento flows |
| Negotiate receivable | `billing.negotiate_receivable` | Proesc negociação status, Agenda Edu |
| View student receivables | `billing.view_student_receivables` | Proesc procurar parcelas |
| General finance operations | `billing.manage_financial_operations` | Catch-all — Proesc finance module breadth |

---

## Implementation status

| Feature | Status | fintech-first reference |
|---------|--------|-------------------------|
| `billing_plans` CRUD | **implemented** | UC-01, API `/billing/plans` |
| `contracts` CRUD | **implemented** | BR-010, API `/billing/contracts` |
| Monthly charge generation job | **implemented** | `Billing::MonthlyChargeGenerationJob`, `/charge_generations` |
| Plan discount at generation | **implemented** | `applied_discounts`, `plan_discount_id` |
| Charge cancel (business) | **implemented** | BR-005, `POST /charges/:id/cancel` |
| Charge soft delete | **implemented** | BR-005, `DELETE /charges/:id` |
| Charge list/filter | **implemented** | `GET /billing/charges` |
| Charge types taxonomy | **planned** | — |
| Ad-hoc / one-off charges | **planned** | — |
| Manual adjustment workflow | **planned** | open item: negotiated discount |
| Negotiation status | **planned** | — |
| Student/guardian receivables search | **partial** | filters on list; dedicated search UX planned |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Tuition + enrollment fee plans |
| `fundamental_medio` | yes | Material, activity charge types |
| `pj_financeiro` | partial | `guardian_id` payer in MVP; PJ entity P2 |
| `multi_unidade` | partial | Scoped per school |

---

## Context

Competitors model **débitos** (charge headers) with **parcelas** (installments) tied to
enrollment ([`DIV-financial-001`](../../ref/divergencias.md)). School Lab MVP uses
`contracts` + periodic `charges` (one row per billing period) with optional `billing_plans`
templates. Enrollment binding evolves when students `enrollments` table ships (W2).

**Dependencies**

- Students: `student_id`, guardian links, enrollment activation ([`students-and-enrollments/`](../students-and-enrollments/)).
- Settings: mora/multa/pontualidade applied at issuance ([`settings.md`](settings.md)).
- Boletos: issuance enqueued after charge create ([`boletos.md`](boletos.md)).

---

## Business Rules

BR-C01

Every charge belongs to exactly one `school_id`, one financially responsible `guardian_id`,
and references a `contract_id` or ad-hoc charge source (planned).

BR-C02

`charges.status` follows AASM: `pending` → `paid` | `overdue` | `cancelled` — same as
[`fintech-first.md`](../fintech-first.md) BR-004. **Implemented.**

BR-C03

Business cancellation uses `status: cancelled`. Erroneous duplicate removal uses Discard —
never conflate the two ([`fintech-first.md`](../fintech-first.md) BR-005). **Implemented.**

BR-C04

Active `contracts` with `status: active` drive recurring generation per `billing_period`
(YYYY-MM). Each charge stores `original_amount_cents`, `discount_amount_cents`,
`total_amount_cents`, `due_date`. **Implemented.**

BR-C05

When `contracts.plan_discount_id` is set, generation applies `PlanDiscount#apply_to` against
`billing_plan.base_amount_cents` and writes `applied_discounts` with
`discount_type: plan_discount`. Negotiated amount on contract is ignored when a band is present.
**Implemented.**

BR-C06

**Planned:** `billing_purposes` are school-scoped categories with stable English codes (for
example `tuition`, `enrollment`, `material`, `activity`) and optional chart-of-accounts code for
export. Every new charge references `billing_purpose_id` and copies `billing_purpose_code` plus the
purpose's current `tax_declaration_eligible` value. Those copied values are immutable so future
school configuration changes cannot rewrite annual declarations
([`tax-declarations.md`](tax-declarations.md) BR-TD04–BR-TD05).

`billing.manage_charge_types` remains the canonical market capability id/label, but the School Lab
domain entity and API resource are consistently named `billing_purposes` / `/billing/purposes`.
There is no separate `charge_types` table.

BR-C07

**Planned:** Staff adjustment (`billing.adjust_charge`) creates an `applied_discounts` or
`charge_adjustments` row with `reason_code`, `approved_by_id`, and audit — never silent
in-place amount edits on issued charges without audit.

BR-C08

**Planned:** `negotiation_status` on charge: `none` | `in_negotiation` | `settled` — blocks
automated régua actions when `in_negotiation` (manual flag; no auto-protest in MVP).

BR-C09

Ad-hoc charges require explicit `due_date`, `billing_purpose_id`, `student_id`, `guardian_id`, and
amount; enqueue issuance same as recurring ([`boletos.md`](boletos.md) UC-B01).

BR-C10

Charge generation and issuance run outside the same DB transaction — failed issuance leaves
charge `pending` with monitoring alert (NFR-001). **Implemented.**

BR-C11

Search receivables by `student_id`, `guardian_id`, `status`, `billing_period`, `due_date` range,
and `billing_purpose_id` (when purposes ship). **Partial** — API filters exist; UX search planned.

---

## Use Cases

### UC-C01 — Recurring charge generation

Input: billing period (default current month), optional contract ids.

Flow

1. Job or `POST /billing/charge_generations` selects active contracts due for period.
2. Create charge rows; apply plan discounts (BR-C05).
3. Enqueue `Billing::IssueChargeJob` per charge.
4. Emit `ChargeGenerated`.

**Status:** **implemented** ([`fintech-first.md`](../fintech-first.md) UC-01).

### UC-C02 — Create ad-hoc charge

Input: student, guardian, billing purpose, amount, due date.

Flow

1. Authorize `manage_billing`.
2. Validate enrollment/guardian link.
3. Create charge; enqueue issuance.
4. Emit `ChargeGenerated`.

**Status:** **planned** (W2).

### UC-C03 — Adjust charge (scholarship / discount)

Input: charge id, adjustment type, amount or percent, reason.

Flow

1. Validate charge `pending` or `overdue` (not `paid`/`cancelled`).
2. Write adjustment row; recompute `total_amount_cents`.
3. If boleto already issued, reissue or void per gateway rules ([`boletos.md`](boletos.md)).
4. Audit change.

**Status:** **planned** — plan bands **implemented**; manual negotiated flow open item.

### UC-C04 — Cancel charge

Input: charge id, optional reason.

Flow

1. `Billing::CancelChargeService` transitions to `cancelled`.
2. Void provider invoice when applicable.
3. Emit `ChargeCancelled`.

**Status:** **implemented**.

### UC-C05 — Mark receivable under negotiation

Input: charge id, note.

Flow

1. Set `negotiation_status: in_negotiation`.
2. Suppress automated reminder enqueue (when régua ships).
3. Audit.

**Status:** **planned**.

### UC-C06 — Search student receivables

Input: student id or guardian id, filters.

Flow

1. `GET /billing/charges` with scoped filters.
2. Return paginated parcel list with student/guardian embed.

**Status:** **partial** — API filters **implemented**; dedicated search endpoint planned.

---

## API

Baseline routes in [`fintech-first.md`](../../api/v1/fintech-first.md). Extensions (planned):

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/billing/purposes` | List school billing purposes and future-charge eligibility |
| `POST` | `/billing/purposes` | Create purpose |
| `POST` | `/billing/charges` | Ad-hoc charge create |
| `POST` | `/billing/charges/:id/adjustments` | Adjustment with audit |
| `POST` | `/billing/charges/:id/negotiate` | Set negotiation status |
| `GET` | `/billing/receivables/search` | Unified student/guardian search |

---

## Errors

| Status | Code | When |
|--------|------|------|
| `409` | `invalid_state_transition` | Cancel/adjust on paid charge |
| `409` | `charge_already_issued` | Duplicate generation for period |
| `422` | `validation_error` | Missing guardian link, invalid amount |
| `403` | `forbidden` | Missing `manage_billing` |

---

## Database

| Artifact | Location |
|----------|----------|
| Narrative DSL | [`001-fintech-first.md`](../../modeling/001-fintech-first.md) |
| DBML | [`schema.dbml`](../../database/schema.dbml) |
| Planned entities | `billing_purposes`, `charge_adjustments` |

Existing: `billing_plans`, `contracts`, `charges`, `applied_discounts`.

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `ChargeGenerated` | Generation/ad-hoc create | Issuance job, audit |
| `ChargeCancelled` | Cancel service | Provider void, audit |
| `ChargeAdjusted` | Adjustment approved | Reissue job (planned) |
| `ChargeOverdue` | Daily job | Dunning (stub), dashboard |

---

## Permissions

| Action | Permission key |
|--------|----------------|
| Manage plans, contracts, charges | `manage_billing` |
| View receivables list | `view_billing_summary` or `manage_billing` |
| Adjust / negotiate | `manage_billing` |

Guardian: no access to school billing routes.

---

## Non-functional requirements

- [NFR-001](../../product/non-functional-requirements.md#nfr-001--reliability-critical-domains) — generation idempotence per contract+period.
- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — `school_id` on all charge rows.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — adjustments and cancellations audited.

---

## Acceptance Criteria

AC-C01

- [ ] Given an active contract and billing period 2026-08, when the generation job runs, then a charge is created with correct guardian, amounts, and due date.
- Source: [`fintech-first.md`](../fintech-first.md) — **implemented**

AC-C02

- [ ] Given a pending charge, when staff POST cancel, then status is `cancelled` and repeat cancel returns 409.
- Source: [`fintech-first.md`](../fintech-first.md) — **implemented**

AC-C03

- [ ] Given a plan discount band on the contract, when charges generate, then `applied_discounts` reflects plan discount and total is recomputed.
- Source: [`fintech-first.md`](../fintech-first.md) open items — **implemented**

AC-C04

- [ ] Given staff with `manage_billing`, when they create an ad-hoc material fee charge for an enrolled student, then charge is pending and issuance is enqueued.
- Source: [`proesc/gestao-financeira/fluxos.md`](../../ref/proesc/gestao-financeira/fluxos.md) — **planned**

AC-C05

- [ ] Given a pending charge, when staff applies a scholarship adjustment with reason, then total decreases, audit row exists, and boleto is reissued if already registered.
- Source: [`agenda-edu/gestao-financeira/funcionalidades-por-ator.md`](../../ref/agenda-edu/gestao-financeira/funcionalidades-por-ator.md) — **planned**

AC-C06

- [ ] Given a student with three open parcels, when staff searches by student name, then all three appear with status and due dates.
- Source: [`proesc/gestao-financeira/funcionalidades-por-ator.md`](../../ref/proesc/gestao-financeira/funcionalidades-por-ator.md) — **partial**

---

## Open items

- [ ] Negotiated discount approval workflow — [`open-questions.md`](../../open-questions.md).
- [ ] Enrollment-scoped contracts vs direct `student_id` — align with students W2.

---

## Out of Scope

- Boleto issuance mechanics — [`boletos.md`](boletos.md).
- Payment settlement — [`payments.md`](payments.md).
- NFS-e — [`invoices.md`](invoices.md) P2.
- Treasury and ledger exports — future slices.
