# Feature slice — Backoffice platform billing (P2)

> Domain: [backoffice-evolution](backoffice-evolution.md) (E3)  
> Parent: BR-BOE08, UC-BOE10  
> Status: draft — **blocked on commercial model**  
> Wave: **E3 P2**

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with platform billing permission (TBD — likely `manage_platform_billing`) |
| Trigger and precondition | Commercial model decided ([`open-questions.md`](../../open-questions.md)); `platform_subscriptions` modeled |
| Observable outcome | CRUD SaaS plans; assign subscription per school; view invoice status; MRR summary feeds analytics slice |
| Adversarial cases | School cannot see DLA subscription invoices in guardian portal; cross-tenant isolation on subscription reads |
| Non-goals | (see section below) |

## Bar

**Reference:** Competitor ERP modules sold separately (Proesc commercial enablement) — DLA bills schools for platform, distinct from school→guardian billing.  
**Rationale:** Operator needs subscription state without spreadsheets.  
**Recognizably bad:** yes — schools onboarded with no record of SaaS plan or payment status.

## Acceptance criteria

1. Given platform plan "Partner 2026", when operator assigns plan to school S, then `POST /api/v1/platform/subscriptions` creates active subscription linked to S.
   → BR-BOE08 [blocked]

2. Given school S with overdue platform invoice, when operator views tenant detail billing section, then status shows overdue with due date — no guardian PII.
   → [blocked]

3. Given school staff user, when calling platform subscription API, then 403 forbidden.
   → NFR-003

4. Given operator changes plan for S, when saving, then audit records prior and new plan_id.
   → NFR-005

5. Given analytics dashboard (sibling slice), when MRR card loads, then value aggregates from active subscriptions only.
   → UC-BOE12 dependency

## Non-goals

- School→guardian tuition billing (billing domain)
- Payment gateway for DLA receivables in E3 MVP (manual/offline OK initially)
- Tax invoices (NFS-e) for DLA→school
- Proration rules until commercial model fixed

## Harness notes

- **Blocked:** Do not implement until [`open-questions.md`](../../open-questions.md) platform billing model closed.
- **Sequence:** modeling → migration-agent → service-agent → api-controller-agent → frontend-implementer.
- **API draft:** `CRUD /api/v1/platform/subscriptions`, `GET /platform/plans`.
