# Feature slice — Backoffice analytics (P2)

> Domain: [backoffice-evolution](backoffice-evolution.md) (E3)  
> Parent: BR-BOE10, UC-BOE12  
> Status: draft  
> Wave: **E3 P2**

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with `platform.view_analytics_dashboard` (or `manage_backoffice_ops` interim) |
| Trigger and precondition | Platform billing slice and/or event pipeline provide MRR and adoption signals |
| Observable outcome | Page `/analytics` with KPI cards: active schools, provisioning funnel, module adoption rates, MRR (when billing exists); date range filter; no row-level PII drill-down |
| Adversarial cases | Aggregates only; school staff cannot access; cache TTL documented |
| Non-goals | (see section below) |

## Bar

**Reference:** vision §6 cross-module BI deferred to P2  
**Rationale:** Leadership visibility without Metabase for core KPIs.  
**Recognizably bad:** yes — operators export CSVs from production DB for board slides.

## Acceptance criteria

1. Given 10 active schools and 2 provisioning, when operator loads analytics overview, then cards show correct counts from `GET /api/v1/platform/analytics/overview`.
   → BR-BOE10

2. Given module adoption query, when viewing chart/table, then percentages reflect enabled `school_modules` rows — no student counts by name.
   → NFR-003

3. Given platform billing live, when MRR card renders, then value matches billable subscriptions
   (`active` + `trialing`; yearly `amount_cents / 12`).
   → dependency on billing slice

4. Given date range filter last 30 days, when applied, then onboarding funnel reflects schools created in range only.
   → [invented]

5. Given school staff JWT, when requesting analytics API, then 403.
   → BR-BO01

## Non-goals

- Per-school drill to student list
- Custom report builder
- Real-time streaming metrics
- Export to Excel in P2 MVP

## Harness notes

- **Depends on:** E3 billing + stable event sources; may ship MRR as "—" until billing ready.
- **Level B:** RSpec aggregator service specs; Vitest dashboard with MSW fixtures.
- **Performance:** Pre-aggregated tables or materialized view TBD in modeling.
