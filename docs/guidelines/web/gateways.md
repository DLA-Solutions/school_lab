# Gateway Adapters

Conventions for external payment integrations in `web/app/services/gateways/`.
Complements `docs/guidelines/process/design-principles.md` (Liskov substitution,
dependency inversion).

Rule: `.cursor/rules/web/gateways.mdc`. Related: `services`, `jobs`, `state-machines`.

## Role

Gateways wrap **third-party payment APIs** behind a small Ruby interface so billing
services stay provider-agnostic and tests use fakes. Business rules remain in services —
gateways only translate request/response and raise typed errors.

| Integration | Port | Status | Adapters |
|-------------|------|--------|----------|
| Bank slip (boleto + embedded Pix) | `Gateways::BankSlip` | Active (Cora) | `cora`, `fake` |
| Card (checkout, capture, refund) | *Future sibling port* | Not started | — |
| FCM push | TBD | Decided (FCM) | Not yet extracted |
| Email | — | Open | Mailer + provider config |
| S3 | — | Active Storage | `config/storage.yml` |

Legacy `Gateways::Psp` remains in the tree until callers are fully migrated; new billing
code uses `Gateways::BankSlip` only.

## Layout

Bank slip port lives under `app/services/gateways/bank_slip/`:

```
app/services/gateways/bank_slip/
  interface.rb           # port contract (module)
  registry.rb            # resolve adapter from school_payment_providers
  fake.rb                # test / development fake
  capabilities.rb        # provider capability flags (Data.define)
  value_objects.rb       # IssueRequest, Issuance, RemoteInvoice, …
  error.rb               # base error
  transient_error.rb     # retryable
  authentication_error.rb
  provider_error.rb
  validation_error.rb
  issue_request_builder.rb
  field_normalizer.rb
  status_normalizer.rb
  cora/
    adapter.rb           # Cora Direct Integration
    client.rb
    configuration.rb
    request_payload.rb
    response_parser.rb
    token_cache.rb
```

Namespace by **payment instrument** (`bank_slip`, future `card`), not by vendor. Inject
the adapter in service constructors — no `Client.new` hidden mid-service.

Card will be a **sibling port** (`app/services/gateways/card/`), not methods added to
`BankSlip::Interface`. See [Payment instruments](#payment-instruments) below.

## Bank slip port operations

`Gateways::BankSlip::Interface` defines five operations. Every adapter (`Fake`,
`Cora::Adapter`, future providers) must implement all of them.

| Operation | Purpose |
|-----------|---------|
| `issue(request)` | Register a bank invoice; accept `IssueRequest` with persisted `idempotency_key` |
| `cancel(provider_invoice_id:)` | Void/cancel an open invoice at the provider |
| `fetch_invoice(provider_invoice_id:)` | Pull current invoice state (status, payments) for reconciliation |
| `list_invoices(since:, limit:)` | Backfill / polling when webhooks are delayed or missed |
| `capabilities` | Return `Capabilities` flags so services branch on behavior, not provider name |

Services load the active provider from `school_payment_providers`, then resolve the
adapter class via `Gateways::BankSlip::Registry.resolve(school:, provider:)`.
`Registry.active_config` reads credentials for a given `instrument` and `environment`.

```ruby
class Billing::IssueChargeService < ApplicationService
  def initialize(charge:, adapter: nil)
    @charge = charge
    @adapter = adapter
  end

  def call
    config = Gateways::BankSlip::Registry.active_config(
      school: charge.school,
      environment: Rails.application.config.x.billing.provider_environment
    )
    adapter = @adapter || Gateways::BankSlip::Registry.resolve(
      school: charge.school,
      provider: config.provider
    )
    # build IssueRequest, persist charge_issuance with idempotency_key, then:
    issuance = adapter.issue(request)
  end
end
```

Issuance persistence (`charge_issuances`) belongs in the service layer, not the gateway.
The gateway returns value objects; the service writes rows and caches display fields on
`charges`.

## Error taxonomy

All bank slip errors inherit from `Gateways::BankSlip::Error`.

| Class | Meaning | Job retry? |
|-------|---------|------------|
| `TransientError` | Timeout, 5xx, rate limit — may succeed on retry | **Yes** (`retry_on`) |
| `ValidationError` | Bad payload, 4xx field errors — same input will fail again | No (`discard_on`) |
| `AuthenticationError` | mTLS / token failure — config or credentials | No — alert ops |
| `ProviderError` | Unexpected provider response, unmapped status | No — record and alert |

**Only `TransientError` is retriable.** Jobs such as `Billing::IssueChargeJob` use
Solid Queue `retry_on Gateways::BankSlip::TransientError` with bounded backoff.
Permanent failures transition `charge_issuances` to `failed` and set `last_error`
(redacted — no CPF, email, or PEM content in logs or DB).

## Capabilities

`Gateways::BankSlip::Capabilities` is a `Data.define` with boolean flags
(`inline_pix`, `native_notifications`, `cancellation`, `fine_and_interest`,
`past_due_reissue`). Services read `adapter.capabilities` instead of comparing
`provider == "cora"`.

Example: Cora sets `fine_and_interest: false` and `past_due_reissue: false` for MVP;
reissue flows cancel the old invoice and create a new issuance rather than mutating
due date on a registered slip.

## Testing

- **Service specs** inject `Gateways::BankSlip::Fake` — assert persisted
  `charge_issuances` and charge state, not HTTP stubs.
- **Adapter specs** use shared examples (`it_behaves_like "a bank slip adapter"`) and
  **WebMock** request stubs (`spec/gateways/bank_slip/<provider>/`). This is the
  default for CI — no committed VCR cassettes.
- **VCR** (`spec/support/vcr.rb`) remains for **optional** manual recordings against
  provider sandboxes when validating a new adapter or payload change. Filters must
  redact tokens, PEM, and `client_id` before any cassette is committed. Do not add
  cassettes to the default test suite unless the team explicitly opts in.
- **Job specs** assert `retry_on TransientError` and no retry on `ValidationError`.

**Decision (Cora closure):** WebMock-only in repo; VCR is a maintainer tool, not a CI
dependency. Cora stage smoke tests against live APIs are operational (credentials +
account) and are not automated in CI.

## Adding a new bank slip provider

1. **Adapter** — implement `Gateways::BankSlip::Interface` under
   `app/services/gateways/bank_slip/<provider>/adapter.rb`.
2. **Register** — add the class to `Gateways::BankSlip::Registry::ADAPTERS`.
3. **Webhook parser** — add `Webhooks::Parsers::<Provider>` and register in
   `Webhooks::Parsers::Registry` (ingress is separate from the port).
4. **Shared contract** — pass `spec/support/shared_examples/bank_slip_adapter.rb`.
5. **Configuration** — document required `school_payment_providers` columns/settings;
   seed or backoffice flow creates the row (`instrument: bank_slip`, `environment`,
   credentials).
6. **Capabilities** — declare honest flags; do not copy another provider's map blindly.

No change to `Billing::` service orchestration should be required when the port contract
and capabilities are honored. If a service needs a provider name conditional, prefer
extending `Capabilities` or the value objects returned by the adapter.

## Payment instruments

### Bank slip (this port)

Covers registered boleto issuance, optional embedded Pix, cancellation, and
invoice-status polling. Domain tables: `charge_issuances` (one row per provider
invoice attempt), `charges` (business billing period and cached display fields).

### Card (future sibling port)

Card is **not** an extension of `BankSlip::Interface`. Checkout, tokenization,
authorization, capture, installments, refund, and chargeback do not fit `issue` and
`cancel`. A future `Gateways::Card::Interface` will live alongside bank slip under
`app/services/gateways/card/`.

**Shared across instruments:** `charges`, `payments`, `school_payment_providers`
(keyed by `instrument`), `webhook_events`, webhook ingress route, and the error
taxonomy pattern (base + `TransientError`).

**Deliberately absent until card ships:** transaction/refund/chargeback tables,
installment plans, MDR, settlement date, PCI scope documentation, and per-charge payment
method routing beyond what `payments.payment_method` records after the fact.

## When not to add a gateway

- Active Storage S3 — use Rails configuration.
- Simple `deliver_later` email — mailer + provider env vars until multiple providers
  force abstraction.
- One-off scripts — not product code paths.

Extract a gateway on the **second provider** or when test doubles become painful — not
before the first integration ships.
