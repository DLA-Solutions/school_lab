# PRD — Platform subscription billing (DLA → school)

> Status: validated  
> Relation to School Lab: Platform & admin BC2 extension — DLA→school SaaS collection  
> Parent PRDs: [`backoffice-evolution.md`](backoffice-evolution.md) (BR-BOE08, UC-BOE10), [`index.md`](index.md)  
> Capability IDs: `[product decision]` — DLA bills schools for the platform; not a competitor SIS module. Related: `platform.manage_backoffice_ops`, `platform.view_analytics_dashboard`  
> Modeling: [`009-platform-admin.md`](../../modeling/009-platform-admin.md)  
> API: [`platform-and-admin.md`](../../api/v1/platform-and-admin.md) § Platform subscription billing **(frozen)**  
> ADR: [`002-platform-billing-gateway.md`](../../adr/002-platform-billing-gateway.md)

---

## Objective

Collect **DLA → school** SaaS subscription payments through a provider-agnostic gateway port,
keeping the E3 **manual** assignment flow as a first-class adapter, shipping **Asaas** as the
first real collector, and giving **backoffice operators** and **school directors** checkout,
invoices, plan change, and cancel-at-period-end — without mixing this money with
school→guardian tuition billing.

---

## Context

E3 shipped a read-only seeded plan catalog (`starter` / `pro` / `enterprise`) and
`POST /api/v1/platform/subscriptions` for operators (`manage_platform_billing`). Collection
was **manual**; the integrated gateway was deferred.

This slice closes collection for a **flat plan per school** with **month** and **year**
intervals. It does **not** decide post-E3 GTM (per-student or hybrid). See
[`open-questions.md`](../../open-questions.md) § Platform & admin.

**Distinct from billing domain:** school→guardian charges, Cora, `school_payment_providers`,
and `POST /webhooks/:provider/:token` stay in [`billing/`](../billing/index.md). Platform
invoices never appear in the guardian portal or `/boletos` / `/planos` tuition screens.

**Surfaces:** backoffice SPA (`/backoffice` subscriptions + tenant billing) and school SPA
route **`/assinatura`** (pt-BR path, English code). Mobile is out of this epic.

Prerequisites: E3 `platform_plans` / `platform_subscriptions`; ADR
[`002-platform-billing-gateway.md`](../../adr/002-platform-billing-gateway.md).

---

## Competitive grounding

DLA charging the school for the product is a **platform commercial** concern, not a
school-SIS tuition feature. Requirements below are `[product decision]` unless noted.

| Capability | ID | Evidence |
|------------|-----|----------|
| Operator records SaaS plan per tenant | — (`[product decision]`) | DLA bills schools; distinct from school→guardian billing. Analog only: competitor ERP modules sold separately — not a `docs/ref/` AC source |
| Hosted invoice checkout (no vendor customer portal) | — (`[product decision]`) | Asaas has no Stripe-like Customer Portal; checkout returns invoice `secure_url` |
| Recurring month/year catalog | — (`[product decision]`) | Asaas annual plans use `interval: 12`, `interval_type: months` |

Acceptance criteria without a corpus path are marked `[product decision]`.

---

## Actors and surfaces

| Actor | Surfaces | Notes |
|-------|----------|-------|
| backoffice (DLA operator) | `frontend/backoffice`, `/api/v1/platform/*` | Assign plan (manual or Asaas), send checkout, list invoices, change plan, view overdue; permission `manage_platform_billing` |
| school director / owner | `frontend/app` `/assinatura`, `/api/v1/schools/:school_id/platform_plans`, `/platform_subscription*` | List catalog, checkout, pay open invoice, change plan, cancel at period end; permission `manage_school_settings` — **not** `manage_billing` (tuition) |
| secretary / other staff | school SPA | No subscription mutations; `403` unless they hold `manage_school_settings` |
| teacher | — | `403` on school-scoped platform subscription routes |
| guardian | guardian portal, `/boletos` | **Never** sees DLA invoices; `404`/`403` on these routes |
| student | — | No login in MVP |

Detail: [`docs/actors-and-surfaces.md`](../../actors-and-surfaces.md).

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Same flat school plan |
| `fundamental_medio` | yes | Same flat school plan |
| `pj_financeiro` | yes | School CNPJ is the Asaas customer |
| `multi_unidade` | partial | One subscription per `school_id` (campus). Group-level / enterprise multi-unit pricing remains open post-E3 |

---

## Business Rules

BR-BOE08 — extended from [`backoffice-evolution.md`](backoffice-evolution.md)

**Platform SaaS billing** — DLA subscription catalog, per-school subscription state, and
platform invoicing to schools. Commercial model for **this slice:** flat plan per school
(`starter` / `pro` / `enterprise`) with `month` and `year` intervals. Per-student and hybrid
pricing are **not** in this slice.

BR-PSB01 — Catalog intervals

Keep `platform_plans` as the product catalog. Each plan may have provider prices for
`billing_interval` ∈ `month | year`. Asaas yearly plans map to `interval: 12`,
`interval_type: months`. API responses expose interval `amount_cents`;
`platform_plans.monthly_amount_cents` remains until dual-write is retired (Phase 6).

BR-PSB02 — Gateway port

Collection goes through `Gateways::PlatformSubscription` (adapters `asaas`, `manual`, `fake`;
Stripe planned). Do not call Asaas HTTP from create/update services. Do not extend
`Gateways::BankSlip` or store Asaas tokens on school rows.

BR-PSB03 — Trial

Trial is **optional**. Product default when offered: **14 days**. `provider: manual` skips
collection (no hosted invoice). Trialing subscriptions are billable for MRR (BR-PSB12).

BR-PSB04 — Payment methods (Asaas)

Asaas checkout accepts `credit_card`, `bank_slip` (boleto), and `pix`. School Lab does not
restrict the method in this epic; the paid invoice records `payment_method`.

BR-PSB05 — Plan change and proration

Plan change uses the provider `change_plan` operation. **Proration follows the vendor
default** (Asaas). This epic does not define a School Lab proration table.

BR-PSB06 — Past-due enforcement

Enforcement is **banner + `past_due` / overdue invoice in UI**. This epic does **not** hard-lock
school product access when status is `past_due`.

BR-PSB07 — Manual coexistence

Existing E3 CRUD remains for **manual** subscriptions (white-glove / partners). Operator may
create with `provider: manual` or `asaas`. Switching deploy `active_provider` does not rewrite
live rows that already have a `provider`.

BR-PSB08 — Isolation

Guardians never see DLA platform invoices. School A never reads school B's subscription,
catalog, or invoices (`404`). School staff receive **`403` on `/api/v1/platform/plans` and
`/api/v1/platform/subscriptions`** (cross-tenant operator collection). They use
**school-scoped** routes under `/api/v1/schools/:school_id/platform_plans` and
`/api/v1/schools/:school_id/platform_subscription*`.

BR-PSB09 — Permissions

| Action | Permission |
|--------|------------|
| Backoffice collection and mutations | `manage_platform_billing` (backoffice membership) |
| School-scoped read/mutate | `manage_school_settings` |
| School tuition (charges, boletos) | `manage_billing` — **does not** grant platform subscription access |

BR-PSB10 — Credentials and webhook token

Asaas API credentials: **ENV only** (`ASAAS_API_TOKEN`, `ASAAS_API_BASE_URL`, default base
`https://api.asaas.com`). Webhook URL token: `platform_billing_settings.webhook_endpoint_token`
(seeded from `PLATFORM_BILLING_WEBHOOK_TOKEN`). Never persist API tokens on `schools`.

BR-PSB11 — Subscription status

`platform_subscriptions.status` ∈ `trialing | active | past_due | canceled | incomplete`.
E3 value `trial` is renamed to `trialing` in this increment. One **kept** row per school;
checkout after `canceled` reuses or discards the prior row (service-owned).
`409 subscription_exists` when a non-canceled kept row already exists.

BR-PSB12 — MRR

Billable statuses: `active` + `trialing`. Yearly subscriptions contribute `amount_cents / 12`
to MRR. Analytics `mrr_cents` must use the interval price map, not solely
`platform_plans.monthly_amount_cents`, once yearly prices exist.

BR-PSB13 — Hosted billing portal

Asaas `hosted_billing_portal` is **false**. `create_billing_portal_session` returns
`501 portal_not_supported`. `billing_portal_url` in JSON is `null`. Checkout uses hosted
invoice URL (`secure_url` / `pay_url`).

BR-PSB14 — `schools.saas_plan`

Deprecate **writes** to `schools.saas_plan` as source of truth. List filters should join
`platform_subscriptions`. **Do not drop** the column in this epic.

BR-PSB15 — JSON vendor IDs

School SPA JSON **does not** expose raw Asaas customer/subscription/invoice IDs. Backoffice
**may** include `provider` and `external_*_id` for support.

BR-PSB16 — Asaas customer identity

`create_billing_account` sends **existing** school data only — no new billing-contact column in this epic:

- **CNPJ:** `schools.cnpj` (required for Asaas checkout). Missing/blank → `422 validation_error`.
- **Email:** `users.email` of the authenticated director performing checkout (or, for backoffice checkout, the school's owner/director membership email). Missing → `422 validation_error`.

Do not send guardian or student PII. Legal processor agreement for this CNPJ/email remains an open item.

BR-PSB17 — School checkout vs deploy provider

School-scoped `POST .../checkout` uses `Gateways::PlatformSubscription::Registry.current`. If `active_provider` is `manual` or `hosted_checkout` is false, return `501 not_implemented` (directors cannot collect through the manual adapter). Operator `POST /platform/subscriptions` with `provider: manual` remains valid.

BR-PSB18 — PATCH vs change_plan

`PATCH /api/v1/platform/subscriptions/:id` stays **local / manual**: status and trial fields for `provider: manual` rows. Asaas (and later Stripe) plan or interval changes **must** use `POST .../change_plan` (or school `change_plan`) so the port runs. PATCH on an Asaas row that attempts to change `platform_plan_id` or `billing_interval` → `409 invalid_state_transition`.

BR-PSB19 — Manual row cannot self-serve onto Asaas in this epic

Director checkout against a kept `provider: manual` subscription → `409 invalid_state_transition`. Converting white-glove manual to Asaas is an operator/ops action (out of school SPA for this epic).

---

## Use Cases

### UC-BOE10 — Manage platform SaaS subscriptions (backoffice)

Slice (E3 manual): [`backoffice-platform-billing-p2.md`](backoffice-platform-billing-p2.md).  
This document extends collection.

Input: `school_id`, `platform_plan_key`, `billing_interval`, `provider` (`manual` \| `asaas`).

Flow

1. Operator with `manage_platform_billing` lists plans (intervals + `amount_cents`).
2. `POST /api/v1/platform/subscriptions` assigns a plan (`409 subscription_exists` if kept
   non-canceled row exists). `provider: manual` skips collector.
3. For `provider: asaas`, operator may `POST /api/v1/platform/subscriptions/:id/checkout` to
   obtain hosted invoice URL and send it to the school.
4. Operator lists invoices on the subscription; overdue shows `past_due` + due date — no
   guardian PII.
5. Plan change and cancel go through the same services as school-director UCs; audited.

### UC-BOE15 / UC-PSB01 — School director checkout

Input: `school_id`, `plan_key`, `billing_interval`, optional `trial` (boolean; default 14 days
when true).

Flow

1. Director with `manage_school_settings` opens `/assinatura`.
2. Client `GET /api/v1/schools/:school_id/platform_plans` for `plan_key` + interval prices
   (no vendor IDs). `GET /api/v1/platform/plans` with a school JWT remains `403 backoffice_only`.
3. Client `GET /api/v1/schools/:school_id/platform_subscription`. When none exists, **`200` with `data: null`** (not 404).
4. `POST .../platform_subscription/checkout` creates or resumes Asaas subscription and
   returns `checkout_url` (hosted invoice). `billing_portal_url` is `null`. Requires
   `active_provider` with hosted checkout (BR-PSB17); CNPJ + actor email present (BR-PSB16).
5. Director pays on Asaas hosted page (card, boleto, or Pix).
6. Webhook + reconcile activate `trialing` or `active`.

### UC-BOE16 / UC-PSB02 — Pay platform invoice

Input: open invoice on the school's platform subscription.

Flow

1. Director views invoices (`GET .../platform_subscription/invoices`).
2. Open invoice includes `hosted_invoice_url` (`pay_url`).
3. Director opens that URL; payment is recorded via webhook `billing.invoice.paid`.
4. UI never labels this as “boleto da mensalidade” (tuition).

### UC-BOE17 / UC-PSB03 — Change plan

Input: `plan_key`, `billing_interval`.

Flow

1. Director (or operator) `POST .../change_plan` (school) or equivalent backoffice path.
2. Service calls port `change_plan`; proration is vendor default (BR-PSB05).
3. Subscription and audit record prior and new `platform_plan_id` + interval.
4. Invalid status → `409 invalid_state_transition`.

### UC-BOE18 / UC-PSB04 — Cancel at period end

Input: optional `at_period_end` (default **true**).

Flow

1. Director `POST .../platform_subscription/cancel` with `at_period_end: true`.
2. Port `cancel_subscription` suspends/expires per Asaas; local flags
   `cancel_at_period_end` until `current_period_end`, then `canceled` / `canceled_at`.
3. Immediate cancel is **not** the product default; if offered later, it is a separate AC.
4. School product remains usable through period end (BR-PSB06).

---

## API

**Frozen contract:** [`docs/api/v1/platform-and-admin.md`](../../api/v1/platform-and-admin.md)
§ Platform subscription billing. Summary:

### Backoffice — `/api/v1/platform`

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/plans` | Intervals + `amount_cents` (keep `monthly_amount_cents` during dual-write) |
| `GET/POST` | `/subscriptions` | Create with `provider: manual` or `asaas` |
| `GET/PATCH` | `/subscriptions/:id` | Show; PATCH is **manual/local only** (BR-PSB18) |
| `POST` | `/subscriptions/:id/checkout` | Hosted invoice URL |
| `POST` | `/subscriptions/:id/change_plan` | Operator plan/interval change via port |
| `POST` | `/subscriptions/:id/cancel` | Operator cancel; default `at_period_end: true` |
| `GET` | `/subscriptions/:id/invoices` | Operator invoice list |

### School — `/api/v1/schools/:school_id`

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/platform_plans` | Catalog: `key`, `name`, `intervals[]` (`billing_interval`, `amount_cents`). No Asaas/external IDs. School JWT on `GET /api/v1/platform/plans` remains `403 backoffice_only`. |
| `GET` | `/platform_subscription` | Current subscription; no raw Asaas IDs |
| `POST` | `/platform_subscription/checkout` | UC-PSB01 |
| `POST` | `/platform_subscription/change_plan` | UC-PSB03 |
| `POST` | `/platform_subscription/cancel` | UC-PSB04 |
| `GET` | `/platform_subscription/invoices` | UC-PSB02 |

### Webhook (no JWT)

`POST /webhooks/platform_billing/:provider/:token`

**Not** `POST /webhooks/:provider/:token` (Cora / `SchoolPaymentProvider`).

Request/response examples live in the frozen API narrative.

---

## Errors

| Status | Code / condition | Description |
|--------|------------------|-------------|
| 403 | `backoffice_only` | School JWT on `/api/v1/platform/plans` or `/api/v1/platform/subscriptions` |
| 403 | `forbidden` | Missing `manage_platform_billing` or `manage_school_settings` |
| 404 | `not_found` | Unknown id or **cross-school** (do not leak existence) |
| 409 | `subscription_exists` | Second non-canceled kept subscription for the school |
| 409 | `invalid_state_transition` | Change/cancel/checkout not allowed in current status |
| 422 | `validation_error` | Invalid plan, interval, missing `schools.cnpj` or billing email |
| 501 | `portal_not_supported` | Port `create_billing_portal_session` (Asaas cannot host a portal; no public SPA route) |
| 501 | `not_implemented` | Frozen route not yet in `web/`, **or** school checkout while `active_provider` is `manual` |

---

## Database

Entity groups only — **do not** duplicate full table definitions inline.

| Artifact | Location |
|----------|----------|
| Narrative DSL | [`docs/modeling/009-platform-admin.md`](../../modeling/009-platform-admin.md) |
| DBML | [`docs/database/schema.dbml`](../../database/schema.dbml) |
| DER | [`docs/database/der_009.png`](../../database/der_009.png) *(re-export after this increment)* |
| Pointer | [`docs/database/database_dml.md`](../../database/database_dml.md) |

Expected groups: `platform_plans` (kept), `platform_plan_provider_prices` (new),
`platform_subscriptions` (extended), `platform_invoices` (new),
`platform_billing_settings` (singleton). `schools.saas_plan` retained. Reuse
`webhook_events` with nullable `school_id` until the subscription is matched.

---

## Events

Canonical types consumed **only** by `Platform::ReconcileBillingEventService`:

| Domain event | Typical vendor trigger |
|--------------|------------------------|
| `billing.checkout.completed` | Checkout finished |
| `billing.subscription.activated` | Subscription active |
| `billing.subscription.trial_started` | Trial began |
| `billing.subscription.past_due` | Payment failed / overdue |
| `billing.subscription.canceled` | Suspend/expire |
| `billing.subscription.plan_changed` | `change_plan` |
| `billing.invoice.finalized` | Invoice created/released |
| `billing.invoice.paid` | Invoice paid |
| `billing.invoice.payment_failed` | Invoice failed |

Parser: `Webhooks::Parsers::AsaasPlatformBilling`. Persist `WebhookEvent` idempotent on
`(provider, provider_event_id)`. Job: `Platform::ReconcileBillingEventJob`. Polling fallback:
`list_invoices` / `fetch_subscription`.

Asaas parser inputs include `invoice.status_changed`, `invoice.released`, `invoice.created`,
and subscription suspend/expire — mapped to the table above, **not** stored as raw Asaas
names in services.

---

## Permissions

| Actor | `GET` school subscription | Mutate school subscription | `/api/v1/platform/subscriptions` |
|-------|---------------------------|----------------------------|----------------------------------|
| backoffice + `manage_platform_billing` | via operator show | via operator checkout/PATCH | allow |
| director + `manage_school_settings` | allow (own school) | allow (own school) | **403** `backoffice_only` |
| secretary without `manage_school_settings` | 403 | 403 | 403 |
| teacher | 403 | 403 | 403 |
| guardian | 403/404 | 403/404 | 403 |
| other school staff | 404 on `:school_id` | 404 | 403 |

Pundit: existing `PlatformSubscriptionPolicy` stays backoffice-only for the operator
collection. School-scoped controller uses a school policy keyed on `manage_school_settings`.

---

## Non-functional requirements

Cross-cutting catalog: [`docs/product/non-functional-requirements.md`](../../product/non-functional-requirements.md).

- [NFR-003](../../product/non-functional-requirements.md#nfr-003--multi-tenancy) — school-scoped
  queries on invoices and subscriptions; operator collection is cross-tenant and audited.
- [NFR-005](../../product/non-functional-requirements.md#nfr-005--observability-and-audit) —
  assign, plan change, cancel, and checkout audited (`associated_with: :school`).
- **LGPD:** Asaas receives school CNPJ and billing email (processor). Guardian/student PII
  must not be sent. Webhook payloads stored on `webhook_events` follow the existing 180-day
  processed purge; legal sign-off remains in [`open-questions.md`](../../open-questions.md) § LGPD.
- **Copy isolation:** school SPA `/assinatura` must never mix “boleto da mensalidade” with
  “assinatura School Lab” (pt-BR locale files only).
- **Idempotency:** webhook ingest unique on `(provider, provider_event_id)`.
- **No live Asaas in specs:** service specs inject `Fake`; lib specs WebMock `https://asaas.test`
  only; never set `ASAAS_API_TOKEN` in RSpec.

---

## Acceptance Criteria

AC-PSB01 — Operator assigns plan

- [ ] Given platform plan `starter` and school S with no kept subscription, when an operator
      with `manage_platform_billing` `POST /api/v1/platform/subscriptions` with
      `provider: manual`, then an `active` (or `trialing`) subscription is created for S.
- Source: `[product decision]` — extends E3 AC-BOE10

AC-PSB02 — School staff 403 on operator collection

- [ ] Given a school staff JWT, when calling `GET /api/v1/platform/subscriptions`, then the
      response is `403` `backoffice_only`.
- [ ] Given the same user with `manage_school_settings` on school S, when calling
      `GET /api/v1/schools/:s_id/platform_subscription` with no subscription, then `200` with
      `data: null`; for school B, `404`.
- Source: `[product decision]` — rewrites stale P2 AC #3

AC-PSB03 — Guardian isolation

- [ ] Given a guardian JWT, when requesting school or platform subscription/invoice routes,
      then `403` or `404`, and guardian charge lists contain no platform invoices.
- Source: `[product decision]`

AC-PSB04 — Cross-school isolation

- [ ] Given director of school A, when requesting `/api/v1/schools/:b_id/platform_subscription`
      or invoices, then `404 not_found`.
- Source: `[product decision]`

AC-PSB05 — Director checkout

- [ ] Given director with `manage_school_settings` and Asaas price mapping for `pro` + `month`,
      when `POST .../platform_subscription/checkout`, then `200/201` includes `checkout_url`
      and `billing_portal_url` is `null`.
- Source: `[product decision]`

AC-PSB06 — Pay invoice

- [ ] Given an `open` platform invoice with `hosted_invoice_url`, when the director opens
      that URL and Asaas reports paid, then reconcile sets invoice `paid` and subscription
      `active` (or keeps `trialing` until trial ends).
- Source: `[product decision]`

AC-PSB07 — Change plan

- [ ] Given an `active` Asaas subscription, when director `POST .../change_plan` to `enterprise`
      + `year`, then plan and interval update, audit stores prior and new `platform_plan_id`,
      and proration is whatever Asaas applied (no local proration table).
- Source: `[product decision]`

AC-PSB08 — Cancel at period end

- [ ] Given an `active` subscription, when director `POST .../cancel` with `at_period_end: true`,
      then `cancel_at_period_end` is true, status stays `active` until `current_period_end`,
      and the school product is **not** hard-locked.
- Source: `[product decision]`

AC-PSB09 — Past due banner, no lock

- [ ] Given subscription `past_due` and an overdue invoice, when director or operator views
      billing UI, then status and due date show; school modules and login remain available.
- Source: `[product decision]`

AC-PSB10 — Manual skips collection

- [ ] Given `provider: manual`, when operator creates a subscription, then no Asaas customer or
      invoice is created and checkout is not required.
- Source: `[product decision]`

AC-PSB11 — Portal not supported

- [ ] Given Asaas adapter, when a service calls `create_billing_portal_session` (or any
      documented portal endpoint if one is added), then the API maps the port error to
      `501 portal_not_supported`. There is **no** school SPA portal URL in this epic.
- Source: `[product decision]`

AC-PSB16 — Customer identity

- [ ] Given school S with blank `cnpj`, when director `POST .../checkout`, then `422 validation_error`.
- [ ] Given school S with CNPJ and director email, when checkout succeeds, then Asaas customer
      payload uses that CNPJ and email only (no guardian/student fields).
- Source: `[product decision]`

AC-PSB17 — Payment method recorded

- [ ] Given a paid Asaas invoice settled by Pix (or card or boleto), when invoices are listed,
      then `payment_method` is `pix` (or `credit_card` / `bank_slip`).
- Source: `[product decision]`

AC-PSB18 — Manual row blocks director checkout

- [ ] Given kept `provider: manual` subscription, when director `POST .../checkout`, then
      `409 invalid_state_transition`.
- Source: `[product decision]`

AC-PSB19 — Checkout while deploy is manual

- [ ] Given `platform_billing_settings.active_provider = manual`, when director calls school
      checkout, then `501 not_implemented`.
- Source: `[product decision]`

AC-PSB12 — Webhook isolation

- [ ] Given `POST /webhooks/:provider/:token` (Cora ingress) with a platform-billing payload,
      then it does **not** reconcile DLA subscriptions. Platform events use
      `POST /webhooks/platform_billing/:provider/:token` and are idempotent on
      `(provider, provider_event_id)`.
- Source: `[product decision]`

AC-PSB13 — Teacher and secretary without settings

- [ ] Given teacher or secretary **without** `manage_school_settings`, when calling school
      platform subscription mutations, then `403 forbidden`.
- Source: `[product decision]`

AC-PSB14 — Yearly MRR

- [ ] Given one `active` yearly subscription with `amount_cents = 120000`, when analytics
      overview loads, then that school contributes `10000` to `mrr_cents` (÷ 12), not the
      full year amount.
- Source: `[product decision]`

AC-PSB15 — Trial default

- [ ] Given checkout with `trial: true` and no custom duration, when the subscription is
      created on Asaas, then trial length is **14 days**. Checkout with `trial: false` starts
      collection immediately.
- Source: `[product decision]`

---

## Open items / pending decisions

- [x] Integrated gateway for this slice — **Asaas** (see [`open-questions.md`](../../open-questions.md)
      § Platform & admin). Stripe remains adapter #2, not this epic.
- [x] E3 MVP commercial model — flat plan per school; this slice adds month/year intervals
      and collection. **Does not** close per-student / hybrid GTM.
- [ ] Asaas `cancel_at_period_end` exact vendor API — verify during implementation
      (Context7 / Asaas docs). Product intent is cancel at period end (UC-PSB04).
- [ ] Legal processor agreement for school CNPJ/email sent to Asaas (related to existing
      Cora processor item in [`open-questions.md`](../../open-questions.md) § LGPD).
      **Customer fields are decided:** `schools.cnpj` + director/owner `users.email` (BR-PSB16).
- [ ] Platform invoice row retention window (legal); `webhook_events` follows existing 180-day
      processed purge.
- [ ] Dual-write retirement date for `monthly_amount_cents` and `schools.saas_plan` writes
      (Phase 6).

---

## Out of Scope

- Cora / `school_payment_providers` / guardian boletos and tuition screens (`/boletos`, `/planos`)
- NFS-e for DLA → school (school→guardian NFS-e remains billing BC7 / Spedy)
- Per-student or group-level SaaS pricing (post-E3 GTM)
- Hard lock of school access on `past_due`
- Stripe gem, Stripe adapter, or `stripe_*` columns
- Mobile subscription UI
- Platform régua / dunning automation for DLA invoices
- Immediate cancel as the default (period-end is the default)
- Converting a `provider: manual` row to Asaas via the school SPA (operator/ops only)
- Custom School Lab proration rules
