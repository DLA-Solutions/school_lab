# ADR 002 — Platform billing gateway port

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-19 |
| **Supersedes** | — |

## Context

School Lab already bills **guardians** on behalf of a school through `Gateways::BankSlip`
(Cora). That port is scoped to school→guardian boletos, `school_payment_providers`, and
`POST /webhooks/:provider/:token`.

A second money flow exists: **DLA → school** SaaS subscription (platform billing). E3 shipped
**manual** catalog + assignment (`platform_plans`, `platform_subscriptions`) with no collector.
Operators still need a real payment provider; school directors need checkout, invoices, plan
change, and cancel — without mixing those invoices into guardian tuition screens.

Extending `BankSlip` or reusing `school_payment_providers` would couple two payers, two
instruments, and two webhook vocabularies. Stripe-shaped columns (`stripe_*`) would lock the
schema to one vendor before a second adapter exists.

## Decision

Introduce a **sibling gateway port** `Gateways::PlatformSubscription` for DLA→school recurring
subscriptions. Do **not** extend `Gateways::BankSlip` or Cora webhook ingress.

### One DLA account, one instrument

- **Payer:** the school (CNPJ + billing email), not a guardian.
- **Instrument:** recurring subscription (month or year), not a per-charge boleto.
- **Merchant of record:** DLA (one platform Asaas account). Credentials live in **ENV only**
  (`ASAAS_API_TOKEN`, `ASAAS_API_BASE_URL`) — never on `schools` or `school_payment_providers`.

### Adapters

| Adapter | Role |
|---------|------|
| `manual` | Existing E3 CRUD; no HTTP collection; white-glove / partners |
| `asaas` | First real collector (this epic) |
| `fake` | Tests and local development |
| `stripe` | Planned adapter #2 behind the same interface — **not this epic** |

`Registry.current` reads `platform_billing_settings.active_provider` (or ENV). Existing
subscription rows keep their own `provider`. Switching the deploy default does **not** rewrite
live Asaas subscriptions.

### Port vocabulary vs vendor vocabulary

Services speak product types (`CatalogRef`, `RemoteSubscription`, `DomainEvent`). Adapters
speak vendor types (Asaas `externalReference`, `customer`, `PAYMENT_*` webhooks). Persist
`provider` + `external_*_id` — no `stripe_*` or vendor-prefixed columns.

### Webhook ingress

Platform billing uses **`POST /webhooks/platform_billing/:provider/:token`**.

It must **not** use `POST /webhooks/:provider/:token`, which resolves
`SchoolPaymentProvider` (Cora). Mixing those routes would attribute DLA invoices to a school's
Cora account.

### Catalog and coexistence

Keep `platform_plans` (`starter` / `pro` / `enterprise`) as the product catalog. Provider
price rows (`platform_plan_provider_prices`) map plan + interval (`month` \| `year`) to an
external reference identifier. Manual E3 assignment remains valid alongside Asaas collection.

Do not drop `schools.saas_plan` in this epic; stop treating it as source of truth for list
filters (join `platform_subscriptions` instead).

## Consequences

### Positive

- Bank slip (school→guardian) and platform SaaS (DLA→school) stay independently substitutable.
- Manual white-glove and Asaas self-serve share one service surface.
- Stripe can land later by implementing the same shared examples.

### Negative / trade-offs

- Two webhook ingresses and two parser registries to operate.
- Asaas has **no** Stripe-like Customer Portal (`hosted_billing_portal: false`); school SPA
  uses our API plus hosted payment `invoiceUrl`.
- Dual-write of `platform_plans.monthly_amount_cents` vs interval `amount_cents` until
  analytics/MRR reads the price map.
- Asaas has no native plan catalog — subscriptions carry `value` + `cycle`; `externalReference`
  maps to our `external_price_id`.

### Neutral

- NFS-e for DLA→school remains out of scope (distinct from school→guardian Spedy).
- Per-student or hybrid GTM pricing stays open post-E3; this epic is **flat plan per school**
  with month and year intervals.
- Iugu was considered first but account approval did not proceed; re-implementation remains
  possible behind the same port.

## Migration

| Phase | Work | Status |
|-------|------|--------|
| 0 | This ADR, PRD, DBML, API narrative | Done |
| 1 | Port + Fake + Manual; schema migrations; wrap E3 CRUD | Done |
| 2 | `SchoolLab::Integrations::Asaas` + Asaas adapter + price mapping | Done |
| 3 | Platform billing webhooks, invoices, reconcile job | Done |
| 4 | School + backoffice checkout APIs | Done |
| 5 | Backoffice + school SPA (`/assinatura`) | In progress |
| 6 | Yearly MRR ÷ 12; stop writing `schools.saas_plan`; ops runbook | Pending |
| later | Stripe adapter | Not this epic |

## References

- [`docs/prds/platform-and-admin/platform-subscription-billing.md`](../prds/platform-and-admin/platform-subscription-billing.md)
- [`docs/guidelines/web/gateways.md`](../guidelines/web/gateways.md)
- [`docs/guidelines/web/platform-billing-asaas.md`](../guidelines/web/platform-billing-asaas.md)
- [`docs/api/v1/platform-and-admin.md`](../api/v1/platform-and-admin.md) § Platform subscription billing
- ADR 001 — monorepo surfaces (backoffice vs school SPA)
