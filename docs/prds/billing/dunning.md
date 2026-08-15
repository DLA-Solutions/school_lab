# PRD — Billing: Dunning (BC4)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `billing.view_delinquency_dashboard`, `billing.build_dunning_workflow`, `billing.send_payment_reminder`, `billing.configure_billing_notifications`  
> Divergences: [`DIV-financial-003`](../../ref/divergencias.md) (no protest default), [`DIV-financial-006`](../../ref/divergencias.md) (visual dunning + audit)  
> Related BCs: [`charges.md`](charges.md), [`boletos.md`](boletos.md), [`settings.md`](settings.md)  
> API baseline: [`fintech-first.md`](../../api/v1/fintech-first.md) — `GET /billing/summary`, overdue job

---

## Objective

Define **delinquency visibility and reminder policy** — overdue detection, director dashboard,
and explicit notification rules — with **no surprise automation** in MVP and **platform régua
deferred** per Aug 2026 decision ([`fintech-first.md`](../fintech-first.md) UC-03).

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Delinquency dashboard | `billing.view_delinquency_dashboard` | ClassApp inadimplências, Proesc overdue reports, Sponte régua |
| Build dunning workflow | `billing.build_dunning_workflow` | Proesc/Agenda Edu configurable régua |
| Send payment reminder | `billing.send_payment_reminder` | WhatsApp/email reminder patterns |
| Configure billing notifications | `billing.configure_billing_notifications` | [`DIV-communication-007`](../../ref/divergencias.md) finance channel policy |

---

## Implementation status

| Feature | Status | Notes |
|---------|--------|-------|
| Mark overdue after grace days | **implemented** | `Billing::MarkOverdueChargesJob` |
| Mora on bank slip (Cora) | **implemented** | Not platform calculator — [`settings.md`](settings.md) |
| `GET /billing/summary` counts/amounts | **implemented** | open/overdue/paid-this-month |
| Charge list with status filters | **implemented** | `GET /billing/charges` |
| Collection régua notifier | **stub** | Log line only on overdue transition |
| Platform email/push reminders | **deferred** | Aug 2026 — post-MVP |
| Visual régua workflow builder | **deferred** | Taxonomy MVP; product decision overrides |
| Billing notification channel policy UI | **planned** | W5 |
| Boleto protest | **P2** | Default off — [`DIV-financial-003`](../../ref/divergencias.md) |

---

## Aug 2026 scope boundary

[`mvp-scope.md`](../../product/mvp-scope.md) notes taxonomy marks `billing.build_dunning_workflow`
and `billing.send_payment_reminder` as MVP, but **fintech-first decision** defers platform régua.
This PRD documents:

| Delivers in MVP | Deferred post-MVP |
|-----------------|-------------------|
| Overdue detection + grace days | Visual multi-step régua builder |
| Delinquency dashboard (summary + filters) | Automated email/WhatsApp sequences |
| Bank-native pre/post-due reminders (Cora) | Cora `notification` payload from platform |
| Notification **policy config** (what would fire when régua ships) | `Billing::CollectionReguaNotifier` real delivery |
| Negotiation flag suppresses future auto-reminders | Protest workflow |

---

## Business Rules

BR-D01

Charge becomes `overdue` after `due_date` + `overdue_grace_days` (0–30, default 3) in school
timezone against business-day calendar. **Implemented.**

BR-D02

On overdue transition, recompute display `total_amount_cents`; `late_fee_amount_cents` stays 0
in MVP — mora applied by bank on slip ([`settings.md`](settings.md)). **Implemented.**

BR-D03

`Billing::CollectionReguaNotifier` on overdue **must not** send platform email/push in MVP —
audit log entry only. **Implemented stub.**

BR-D04

Dashboard metrics (`open_count`, `overdue_count`, amounts, expected collection) derive from
kept charges only — same school scope. **Implemented.**

BR-D05

**Planned:** `billing_notification_policy` defines which events (`charge_issued`, `overdue`,
`payment_confirmed`) may trigger push/email/WhatsApp when régua ships — defaults conservative
(finance push opt-in per guardian).

BR-D06

Charges with `negotiation_status: in_negotiation` ([`charges.md`](charges.md)) are excluded from
automated reminder enqueue when régua ships.

BR-D07

**P2:** Boleto protest requires explicit school opt-in; never default ([`DIV-financial-003`](../../ref/divergencias.md)).

BR-D08

Staff may manually trigger one-off reminder (future) — audited; distinct from régua automation.

---

## Use Cases

### UC-D01 — Daily overdue detection

Flow

1. Job selects `pending` charges past grace.
2. Transition to `overdue`; emit `ChargeOverdue`.
3. Invoke stub notifier (log only).
4. Update dashboard aggregates.

**Status:** **implemented** (steps 1–2, 4); step 3 stub.

### UC-D02 — Director views delinquency dashboard

Input: school staff with `view_billing_summary`.

Flow

1. `GET /billing/summary` for headline KPIs.
2. `GET /billing/charges?status=overdue` for drill-down.
3. Optional export — future `reports` slice.

**Status:** **partial** — summary **implemented**; advanced filters/export planned.

### UC-D03 — Configure billing notification policy

Input: channel toggles per event type.

Flow

1. Staff updates policy on school settings.
2. Policy stored; enforced when notification jobs ship.

**Status:** **planned** (W5).

### UC-D04 — Visual dunning workflow (deferred)

Input: ordered steps (days offset, channel, template).

Flow

1. Builder saves workflow version with audit.
2. Daily job evaluates eligible charges against workflow.

**Status:** **deferred** — document competitor pattern only for MVP PRD completeness.

---

## API

| Method | Path | Status |
|--------|------|--------|
| `GET` | `/billing/summary` | **implemented** |
| `GET` | `/billing/charges` | **implemented** |
| `GET/PATCH` | `/billing/notification_policy` | **planned** |
| `GET/POST` | `/billing/dunning_workflows` | **deferred** (phase 2) |

---

## Events

| Event | Consumers |
|-------|-----------|
| `ChargeOverdue` | Stub notifier, dashboard refresh, future régua |
| `PaymentConfirmed` | Remove from overdue counts |

---

## Permissions

| Action | Key |
|--------|-----|
| View summary/dashboard | `view_billing_summary` |
| Configure policy / régua | `manage_billing` |

---

## Non-functional requirements

- [NFR-004](../../product/non-functional-requirements.md#nfr-004--push-notifications) — finance push separate from comms; régua deferred.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) — future régua steps versioned and audited ([`DIV-financial-006`](../../ref/divergencias.md)).

---

## Acceptance Criteria

AC-D01

- [ ] Given pending charge past due date + grace days, when daily job runs, then status is `overdue` and summary overdue_count increments.
- Source: [`fintech-first.md`](../fintech-first.md) — **implemented**

AC-D02

- [ ] Given overdue transition, when stub notifier runs, then no guardian email/push is sent and audit log records skip reason `platform_regua_deferred`.
- Source: Aug 2026 decision — **implemented**

AC-D03

- [ ] Given staff with view permission, when GET summary, then open and overdue amounts match charge table aggregates.
- Source: [`fintech-first.md`](../fintech-first.md) — **implemented**

AC-D04

- [ ] Given notification policy with finance push disabled, when payment confirmed, then no finance push is sent (when pipeline exists).
- Source: [`DIV-communication-007`](../../ref/divergencias.md) — **planned**

AC-D05

- [ ] Given charge in negotiation, when régua job runs (phase 2), then charge is skipped.
- Source: [`proesc/gestao-financeira/funcionalidades-por-ator.md`](../../ref/proesc/gestao-financeira/funcionalidades-por-ator.md) — **planned**

---

## Open items

- [ ] When to promote régua from deferred to MVP — partner feedback.
- [ ] WhatsApp adapter reuse vs dedicated finance templates.

---

## Out of Scope

- Boleto protest — P2 ([`DIV-financial-003`](../../ref/divergencias.md)).
- Guaranteed revenue / Mensalidade Garantida — N/A [`DIV-financial-008`](../../ref/divergencias.md).
- Full financial report exports — future `reports` PRD.
