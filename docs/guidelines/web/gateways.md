# Gateway Adapters

Conventions for external payment integrations in `web/app/services/gateways/`.
Complements `docs/guidelines/process/design-principles.md` (Liskov substitution,
dependency inversion).

Rule: `.cursor/rules/web/gateways.mdc`. Vendor HTTP: [`integrations.md`](integrations.md),
rule `integrations`, skills `use-vendor-integration` / `review-vendor-integration`.
Transport: [`http-client.md`](http-client.md), rule `http-client`. Related: `services`,
`jobs`, `state-machines`.

## Role

Gateways wrap **third-party payment APIs** behind a small Ruby interface so billing
services stay provider-agnostic and tests use fakes. Business rules remain in services —
gateways only translate request/response and raise typed errors.

**Outbound HTTP** (REST calls to Cora, future FCM, card providers) follows the three-layer
stack in [`integrations.md`](integrations.md): `SchoolLab::Http` →
`SchoolLab::Integrations::<Vendor>` → gateway adapter. Vendor clients live in `lib/`; the
adapter owns port mapping and error translation.

| Integration | Port | Status | Adapters |
|-------------|------|--------|----------|
| Bank slip (boleto + embedded Pix) | `Gateways::BankSlip` | Active (Cora) | `cora`, `fake` |
| Card (checkout, capture, refund) | *Future sibling port* | Not started | — |
| FCM push | TBD | Decided (FCM) | Not yet extracted |
| Email | — | Open | Mailer + provider config |
| S3 | — | Active Storage | `config/storage.yml` |

All billing code uses `Gateways::BankSlip`; the legacy `Gateways::Psp` namespace no longer
exists in the tree.

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
    adapter.rb           # port implementation + client factory
    error_mapper.rb      # lib errors → port errors
    request_payload.rb   # IssueRequest → Cora JSON
    response_parser.rb   # Cora JSON → value objects

lib/school_lab/integrations/cora/   # vendor HTTP — see integrations.md
  client.rb
  configuration.rb
  token_cache.rb
  error.rb (+ vendor error subclasses)
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

### Cora billing URLs are deploy configuration, not a school attribute

A school is either registered correctly for the integration or it is not — there is no
"school in stage". Real data only exists in production; staging holds test schools with
sandbox credentials, in its own database. Which Cora hosts the deploy talks to is selected
by two environment variables and nothing else:

- `CORA_API_BASE_URL` — REST API base (e.g. `https://api.stage.cora.com.br` for sandbox,
  `https://api.cora.com.br` for live).
- `CORA_TOKEN_URL` — mTLS token endpoint (e.g.
  `https://matls-clients.api.stage.cora.com.br/token` for sandbox).

Set both in `.env` for local development (see `web/.env.example`), in Kamal `deploy.yml` for
each deploy target, and in staging secrets when that environment uses sandbox URLs while
`RAILS_ENV=production`. **Never derive them from `Rails.env`.**

`SchoolLab::Integrations::Cora::Configuration.current` reads `ENV` lazily when the Cora
client is built; missing values raise `Integrations::Cora::ConfigurationError`, mapped to
`ProviderError` by the adapter's `ErrorMapper`, so the deploy fails loudly instead of
guessing.

### One configuration per school and instrument

`school_payment_providers` holds who the provider is, its credentials, and whether the row is
active. A partial unique index on `(school_id, instrument) WHERE active` makes a single active
configuration the invariant, and `UploadBankCredentialsService` supersedes the previous one on
upload — including when the provider changes.

- `Registry.active_config(school:)` returns that row, or raises `UnknownProviderError` (logged
  as `bank_slip.configuration_missing`) with a message telling the operator what to upload.
- A configuration must be **complete to exist**: `SchoolPaymentProvider::REQUIRED_CREDENTIALS`
  lists what each provider needs (`cora` needs `client_id` plus the certificate pair, `fake`
  needs nothing) and validation rejects the rest. A half-filled row would otherwise sit
  `active: true` and only fail against the bank, with a real family's charge in flight.

### There is no default provider

`fake` is a registered adapter, not a fallback. It reports success unconditionally and returns
a fabricated digitable line, so choosing it implicitly hands the guardian a boleto that
collects nothing — with no error, no alert, and the issuance marked `issued`.

- The issuance path derives the provider from `Registry.active_config(school:).provider`, so an
  unconfigured school raises `UnknownProviderError` and is recorded as a permanent failure.
- Cancellation and reissue derive it from the persisted `charge_issuances.provider`, reissuing
  through the provider that issued.
- To use `fake` (development, manual QA), give the school an explicit `school_payment_providers`
  row with `provider: "fake"` — the demo seed does this. Never guard on `Rails.env`: a default
  that changes with the environment is how this class of bug reaches production.
- The API refuses to register it, in every environment. `Registry::API_SELECTABLE_PROVIDERS` is
  the subset of `ADAPTERS` a caller may upload credentials for; `UploadBankCredentialsService`
  rejects the rest with `validation_error` (422), and the published contract offers the same
  list. The model still accepts `fake` — the restriction is the API boundary, so seeds and
  factories keep working.

```ruby
class Billing::IssueChargeService < ApplicationService
  def initialize(charge:, adapter: nil)
    @charge = charge
    @adapter = adapter
  end

  def call
    config = Gateways::BankSlip::Registry.active_config(school: charge.school)
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
| `ValidationError` | Bad payload, 4xx field errors — same input will fail again | No — service records it |
| `AuthenticationError` | mTLS / token failure — config or credentials | No — service records it, alert ops |
| `ProviderError` | Unexpected provider response, unmapped status | No — service records it, alert ops |
| `Registry::UnknownProviderError` | Unregistered provider or no active configuration row | No — service records it, alert ops |

**Only `TransientError` is retriable.** Jobs such as `Billing::IssueChargeJob` use
Solid Queue `retry_on Gateways::BankSlip::TransientError` with bounded backoff.

Everything else is permanent and is handled in the **service**, not by `discard_on`:
`Billing::IssueChargeService` re-raises `TransientError` for the job and rescues the rest
of `Gateways::BankSlip::Error`, transitioning `charge_issuances` to `failed` with
`last_error` set (redacted via `Billing::PiiRedactor` — no CPF, email, or PEM content in
logs or DB) and returning `ResponseService.failure`. Rescuing the base error class rather
than a list means a new permanent error type is recorded instead of escaping silently.

An issuance left in `pending` is invisible to a monitor that only looks for `failed`, so
`Billing::UnissuedCharges` also reports a `stuck_pending` bucket (attempted, neither issued
nor recorded as failed) alongside `never_attempted` and `permanently_failed`.

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
  `charge_issuances` and charge state, not HTTP stubs. They never read `CORA_*` env vars.
- **Integration lib specs** (`spec/lib/school_lab/integrations/cora/`) assert vendor client
  behavior and `Integrations::Cora::*Error` — not port errors.
- **Gateway adapter specs** (`spec/gateways/bank_slip/cora/`) set **placeholder billing URLs**
  (`https://cora.test`, `https://cora.test/token`) via `spec/support/cora_http_mock.rb` and
  stub HTTP with **WebMock** against those hosts only — never `*.cora.com.br` in CI.
- **VCR** (`spec/support/vcr.rb`) remains for **optional** manual recordings against
  provider sandboxes when validating a new adapter or payload change. Filters must
  redact tokens, PEM, and `client_id` before any cassette is committed. Do not add
  cassettes to the default test suite unless the team explicitly opts in.
- **Job specs** assert that a `TransientError` re-enqueues the job and that a permanent
  error does not, leaving the issuance `failed` with `last_error` set.

**Decision (Cora closure):** WebMock + placeholder URLs in repo; VCR is a maintainer tool,
not a CI dependency. Cora sandbox smoke tests against live APIs are **manual / operational**
(credentials + account) and are **not** automated in CI.

## Adding a new bank slip provider

1. **Integration lib** — add `lib/school_lab/integrations/<provider>/` (client, configuration,
   vendor errors). See [`integrations.md`](integrations.md).
2. **Adapter** — implement `Gateways::BankSlip::Interface` under
   `app/services/gateways/bank_slip/<provider>/` (`adapter.rb`, `error_mapper.rb`,
   `request_payload.rb`, `response_parser.rb`).
3. **Register** — add the class to `Gateways::BankSlip::Registry::ADAPTERS` and its credential
   requirements to `SchoolPaymentProvider::REQUIRED_CREDENTIALS`. To let backoffice upload
   credentials for it, add it to `Registry::API_SELECTABLE_PROVIDERS` as well; if it needs a
   different set of credentials than the ones the upload contract marks required, revisit that
   contract in the same change.
4. **Webhook parser** — add `Webhooks::Parsers::<Provider>` and register in
   `Webhooks::Parsers::Registry` (ingress is separate from the port).
5. **Shared contract** — pass `spec/support/shared_examples/bank_slip_adapter.rb`.
6. **Configuration** — document required `school_payment_providers` columns/settings;
   seed or backoffice flow creates the row (`instrument: bank_slip`, provider, credentials).
   Billing URL env vars (`CORA_API_BASE_URL`, `CORA_TOKEN_URL`) belong in deploy config,
   never on the row.
7. **Capabilities** — declare honest flags; do not copy another provider's map blindly.

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
