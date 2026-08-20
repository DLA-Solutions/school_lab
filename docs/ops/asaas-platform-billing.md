# Asaas platform billing (ops)

Ops only — never run from a request path.

## Prerequisites

- `ASAAS_API_TOKEN` and `ASAAS_API_BASE_URL` in the deploy environment
  - Production: `https://api.asaas.com`
  - Sandbox: `https://api-sandbox.asaas.com`
- `platform_plan_provider_prices` rows for `provider: asaas` (seeded by migration;
  identifiers like `starter_monthly`)

## Review catalog identifiers

From `web/`:

```bash
bin/rails platform_billing:asaas_plan_identifiers
# or
bin/rails asaas:plan_identifiers
```

Asaas does not require pre-creating plan objects. Each checkout creates a subscription with
`externalReference` matching `external_price_id` and `value` derived from `amount_cents`.

## Webhook

Register `POST https://<api-host>/webhooks/platform_billing/asaas/<token>` in the Asaas
dashboard (or via `POST /v3/webhooks`).

Token is `platform_billing_settings.webhook_endpoint_token`, seeded from
`PLATFORM_BILLING_WEBHOOK_TOKEN`.

Recommended events: `PAYMENT_CREATED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`,
`PAYMENT_REFUNDED`, `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_INACTIVATED`,
`SUBSCRIPTION_DELETED`.
