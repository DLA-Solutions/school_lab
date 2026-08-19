# Feature slice — Backoffice platform billing (P2)

> Domain: [backoffice-evolution](backoffice-evolution.md) (E3)  
> Parent: BR-BOE08, UC-BOE10  
> Status: **implemented (E3 manual)** — collection extension in [`platform-subscription-billing.md`](platform-subscription-billing.md)  
> Wave: **E3 P2** (manual CRUD shipped); gateway collection is a follow-on epic, **not blocked**

E3 shipped operator CRUD against a seeded plan catalog and `platform_subscriptions` with
**manual** collection. Integrated collection (Iugu, school-director checkout) is specified in
[`platform-subscription-billing.md`](platform-subscription-billing.md) and
[ADR 002](../../adr/002-platform-billing-gateway.md). This slice remains the E3 operator
bar; it is **no longer blocked** on the commercial model.

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with `manage_platform_billing` |
| Trigger and precondition | Seeded `platform_plans`; `platform_subscriptions` modeled |
| Observable outcome | Assign subscription per school; view status (incl. overdue); MRR summary feeds analytics slice. Collection via Iugu is the sibling PRD, not this E3 bar. |
| Adversarial cases | Guardian portal never shows DLA invoices; school staff **403** on operator collection `/api/v1/platform/subscriptions`; school staff **may** use school-scoped routes in the collection epic |
| Non-goals | (see section below) |

## Bar

**Reference:** Competitor ERP modules sold separately (Proesc commercial enablement) — DLA bills schools for platform, distinct from school→guardian billing.  
**Rationale:** Operator needs subscription state without spreadsheets.  
**Recognizably bad:** yes — schools onboarded with no record of SaaS plan or payment status.

## Acceptance criteria

1. Given platform plan "Partner 2026" (or seeded `starter` / `pro` / `enterprise`), when operator assigns plan to school S, then `POST /api/v1/platform/subscriptions` creates active subscription linked to S.
   → BR-BOE08 `[product decision]` — **shipped (E3)**

2. Given school S with overdue platform invoice (or `past_due` + `current_period_end`), when operator views tenant detail billing section, then status shows overdue with due date — no guardian PII.
   → `[product decision]` — **shipped (E3 status)**; invoice rows in collection epic

3. Given school staff JWT, when calling **`GET/POST /api/v1/platform/subscriptions`** (operator collection), then **403** `backoffice_only`. School staff are **not** forbidden from School Lab platform billing entirely: directors with `manage_school_settings` may call **school-scoped** routes under `/api/v1/schools/:school_id/platform_subscription*` specified in [`platform-subscription-billing.md`](platform-subscription-billing.md).
   → NFR-003, BR-PSB08

4. Given operator changes plan for S, when saving, then audit records prior and new plan_id.
   → NFR-005 — **shipped (E3)**

5. Given analytics dashboard (sibling slice), when MRR card loads, then value aggregates from billable subscriptions (`active` + `trialing`; yearly amounts ÷ 12 once yearly prices exist).
   → UC-BOE12 dependency

## Non-goals

- School→guardian tuition billing (billing domain)
- NFS-e for DLA→school
- Per-student / hybrid GTM pricing (still open post-E3)
- Hard lock of school access on `past_due` (collection epic: banner only)
- Replacing this slice: gateway work belongs in [`platform-subscription-billing.md`](platform-subscription-billing.md)

## Harness notes

- **Not blocked.** E3 manual path is in `web/`. Collection epic: modeling (this Phase 0) →
  rails-implementer (port, Iugu, webhooks, school APIs) → frontend-implementer.
- **API:** E3 `CRUD /api/v1/platform/subscriptions`, `GET /platform/plans`. Extensions
  (checkout, school-scoped routes, platform billing webhook) are frozen in
  [`platform-and-admin.md`](../../api/v1/platform-and-admin.md) § Platform subscription billing.
