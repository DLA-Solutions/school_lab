# PRD — Billing: Guardian Portal (BC6)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `billing.view_guardian_charges`, `billing.view_payment_history`, `billing.pay_online` *(guardian UX)*  
> Related BCs: [`payments.md`](payments.md), [`boletos.md`](boletos.md)  
> API baseline: [`fintech-first.md`](../../api/v1/fintech-first.md) — `/me/charges`, `/me/payments`  
> Identity: family scope [`fintech-first.md`](../fintech-first.md) BR-003 — superseded by identity NFR-002

---

## Objective

Define the **guardian billing experience** — view open charges, access payment methods, pay
online, reissue second copy, and view **forward-only** payment history — with strict
**per-family isolation** (NFR-002).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| View open charges | `billing.view_guardian_charges` | ClassApp ClassPay, Agenda Edu Pagamentos, Sponte app |
| View payment history | `billing.view_payment_history` | Differentiator — [`capability-map.md`](../../product/capability-map.md) |
| Pay online | `billing.pay_online` | [`DIV-financial-002`](../../ref/divergencias.md) |

---

## Implementation status

| Feature | Status | Notes |
|---------|--------|-------|
| `GET /me/charges` (pending, overdue) | **implemented** | Family-scoped |
| `GET /me/charges/:id` + payment_methods | **implemented** | boleto_url, pix_copy_paste |
| `POST /me/charges/:id/reissue` | **implemented** | Second copy |
| `GET /me/charges/history` | **implemented** | `source: platform` only |
| `GET /me/payments` | **implemented** | Payment facts |
| Multi-child household filtering | **partial** | Optional `student_id` query — identity owns UX |
| Card/Pix checkout in app | **planned** | [`payments.md`](payments.md) |
| Mobile app parity | **planned** | API contract-ready per fintech-first |
| Migrated history (`source: migrated`) | **P2** | Import scope undefined |

---

## Business Rules

BR-G01

Guardian routes under `/schools/:school_id/me/*` return only charges where
`guardian_id` matches the logged-in user's linked `guardians` profile for that school.
Cross-family access returns `404`. **Implemented** (NFR-002).

BR-G02

Open charges list includes `pending` and `overdue` only on index; detail includes payment
methods from active issuance. **Implemented.**

BR-G03

Payment history (`/me/charges/history`, `/me/payments`) returns **forward-only** platform
settlements — `source: platform`. Migrated rows deferred ([`fintech-first.md`](../fintech-first.md)
open items). **Implemented.**

BR-G04

Guardian may reissue boleto/Pix for own open charges — same rules as staff reissue
([`boletos.md`](boletos.md) BR-B03). **Implemented.**

BR-G05

**Planned:** Online pay initiates gateway checkout ([`payments.md`](payments.md) UC-P02) without
 exposing other families' data.

BR-G06

Display mora rate on charge detail (`interest_rate_percent` from settings) for transparency;
actual mora charged by bank on settlement. **Implemented** on detail API.

BR-G07

Guardian sees student name on charge via `student_guardians` link — never other students in
family not linked. **Implemented.**

---

## Use Cases

### UC-G01 — List open charges

Input: authenticated guardian, optional `student_id` filter.

Flow

1. Resolve guardian profile for school.
2. Query charges for `guardian_id` with open statuses.
3. Return paginated list with amounts and due dates.

**Status:** **implemented**.

### UC-G02 — View charge detail and pay

Input: charge id.

Flow

1. Authorize family scope.
2. Return amounts, status, student, payment_methods, terms summary.
3. Guardian opens boleto URL or copy Pix; future: in-app checkout.

**Status:** **partial** — slip access **implemented**; checkout **planned**.

### UC-G03 — View payment history

Input: guardian session.

Flow

1. List paid charges and/or `payments` for family.
2. Include `paid_at`, amounts, `source: platform`.

**Status:** **implemented**.

### UC-G04 — Reissue second copy

Input: charge id.

Flow: same as [`boletos.md`](boletos.md) UC-B03.

**Status:** **implemented**.

---

## API

Implemented routes per [`fintech-first.md`](../../api/v1/fintech-first.md):

| Method | Path | Status |
|--------|------|--------|
| `GET` | `/me/charges` | **implemented** |
| `GET` | `/me/charges/history` | **implemented** |
| `GET` | `/me/charges/:id` | **implemented** |
| `POST` | `/me/charges/:id/reissue` | **implemented** |
| `GET` | `/me/payments` | **implemented** |
| `POST` | `/me/charges/:id/pay` | **planned** |

---

## Surfaces

| Surface | MVP | Notes |
|---------|-----|-------|
| Web SPA (`frontend/app`) | yes | Partner validation |
| Mobile (`mobile/`) | planned | Same API contract; MSW until screens ship |
| Magic link per charge | no | Future alternative to Devise account — fintech-first open item closed |

---

## Permissions

Guardian role + active membership + linked `guardians.user_id`. No permission keys beyond role.

---

## Non-functional requirements

- [NFR-002](../../product/non-functional-requirements.md#nfr-002--lgpd-and-privacy) — per-family isolation; financial data minimization on list views.
- [NFR-004](../../product/non-functional-requirements.md#nfr-004--push-notifications) — payment confirmed push when policy enabled (deferred pipeline).

---

## Acceptance Criteria

AC-G01

- [ ] Given guardian A and guardian B in same school, when A GET /me/charges, then B's charges are not listed and direct id access returns 404.
- Source: [`fintech-first.md`](../fintech-first.md) — **implemented**

AC-G02

- [ ] Given pending charge with issuance, when guardian GET detail, then payment_methods includes boleto_url and pix_copy_paste.
- Source: [`fintech-first.md`](../fintech-first.md) — **implemented**

AC-G03

- [ ] Given paid charge on platform, when guardian GET history, then record appears with source platform and paid_at.
- Source: [`fintech-first.md`](../fintech-first.md) — **implemented**

AC-G04

- [ ] Given two linked children, when guardian filters by student_id, then only that child's charges appear.
- Source: `[invented]` — **partial**

AC-G05

- [ ] Given open charge, when guardian completes in-app card pay, then charge is paid and history updates without page reload.
- Source: [`DIV-financial-002`](../../ref/divergencias.md) — **planned**

---

## Open items

- [ ] Migrated history import UX — P2.
- [ ] Active child switcher — identity `profiles.md` slice.

---

## Out of Scope

- Staff billing operations — other BCs.
- Enrollment/KYC documents — documents increment (`/me/documents` remains fintech-first enrollment slice until superseded).
