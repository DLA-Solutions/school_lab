# Reliability guidelines

Cross-cutting reliability expectations for School Lab API and async jobs. Domain-specific rules
(e.g. attendance absence) cite NFR-001 in PRDs.

## Principles

1. **At-least-once delivery** with **idempotent consumers** — jobs keyed by domain id
   (`attendance_record_id`, `charge_id`, `webhook_events.provider_event_id`).
2. **External systems are source of truth for money** — webhooks trigger re-read, never trust
   notification body alone (Cora pattern in [`billing.md`](../api/v1/billing.md)).
3. **Fail loud in CI** — MSW `onUnhandledRequest: 'error'` in SPA tests; WebMock in API specs.
4. **Solid Queue** in primary DB — enqueue in same transaction as domain write when possible.

## Jobs

| Pattern | Rule |
|---------|------|
| Retry | Exponential backoff for transient HTTP; no retry on 4xx validation |
| Dead letter | Unprocessed `webhook_events` never purged — ops alert |
| Scheduling | `America/Sao_Paulo` for billing cron (`Billing::MonthlyChargeGenerationJob`) |

## Critical paths

| Path | Requirement |
|------|-------------|
| Absence notification | 15-minute confirm window; idempotent FCM delivery |
| Boleto issuance | `idempotency_key` on `charge_issuances` before HTTP |
| Invite email | Best-effort; token valid even if email delayed |

## Observability

- Structured logs with `Billing::PiiRedactor` for billing.
- `audits` gem for mutating staff actions.
- Health: `/up` for Kamal.

## Related

- [`docs/product/non-functional-requirements.md`](../product/non-functional-requirements.md)
- [`docs/quality/test-strategy.md`](../quality/test-strategy.md)
- [`docs/guidelines/web/state-machines.md`](../guidelines/web/state-machines.md)
