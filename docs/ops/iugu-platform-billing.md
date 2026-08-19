# Iugu plan seed (platform billing)

Ops only — never run from a request path.

## Prerequisites

- `IUGU_API_TOKEN` and `IUGU_API_BASE_URL` (default `https://api.iugu.com`) in the deploy environment
- `platform_plan_provider_prices` rows for `provider: iugu` (seeded by migration; identifiers like `starter_monthly`)

## Sync plans to Iugu

From `web/`:

```bash
bin/rails iugu:sync_plans
```

Creates missing Iugu plans (`interval: 1` month or `interval: 12` months). Existing identifiers are left as-is.

## Webhook

Register `POST https://<api-host>/webhooks/platform_billing/iugu/<token>` in the Iugu dashboard.

Token is `platform_billing_settings.webhook_endpoint_token`, seeded from `PLATFORM_BILLING_WEBHOOK_TOKEN`.
