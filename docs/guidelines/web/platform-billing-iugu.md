# Iugu plan catalog (ops)

Platform SaaS prices live in `platform_plan_provider_prices` (`provider: iugu`).
Create matching Iugu plans (`identifier` = `external_price_id`, yearly = `interval: 12`,
`interval_type: months`) in the Iugu dashboard or via API **outside** the request path.

List identifiers:

```
bin/rails platform_billing:iugu_plan_identifiers
```

ENV: `IUGU_API_TOKEN`, `IUGU_API_BASE_URL` (default `https://api.iugu.com`),
`PLATFORM_BILLING_WEBHOOK_TOKEN`, optional `PLATFORM_BILLING_PROVIDER`.
Webhook: `POST /webhooks/platform_billing/iugu/:token`.
