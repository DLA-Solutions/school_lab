# Asaas subscription catalog (ops)

Platform SaaS prices live in `platform_plan_provider_prices` (`provider: asaas`).
Asaas subscriptions use `externalReference` = `external_price_id` and `value` from
`amount_cents` — there is no separate plan object in Asaas. Sync identifiers for ops review:

```
bin/rails platform_billing:asaas_plan_identifiers
```

ENV: `ASAAS_API_TOKEN`, `ASAAS_API_BASE_URL` (default production `https://api.asaas.com`;
sandbox `https://api-sandbox.asaas.com`), `PLATFORM_BILLING_WEBHOOK_TOKEN`, optional
`PLATFORM_BILLING_PROVIDER`.

Webhook: `POST /webhooks/platform_billing/asaas/:token`.
