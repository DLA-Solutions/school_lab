# Gateway Adapters

Conventions for external integrations in `web/app/gateways/` (or `app/adapters/` when
the folder is created). Complements `docs/guidelines/process/design-principles.md`
(Liskov substitution, dependency inversion).

Rule: `.cursor/rules/web/gateways.mdc`. Related: `services`, `jobs`, `mailers`.

## Role

Gateways wrap **third-party APIs** behind a small Ruby interface so services stay
provider-agnostic and tests use fakes. Business rules remain in services — gateways only
translate request/response.

| Integration | Status | Example adapter |
|-------------|--------|-----------------|
| Boleto / bank | Open (`open-questions.md`) | `BoletoGateway::Adapter` |
| Email | Open | Rails mailer + provider config, or `EmailGateway` |
| FCM push | Decided (FCM) | `PushGateway::Fcm` |
| S3 | Active Storage | Configure via `config/storage.yml` — not a custom gateway unless needed |

## Layout

```
app/gateways/
  boleto_gateway.rb          # module + interface
  boleto_gateway/adapter.rb  # real implementation
  boleto_gateway/fake.rb     # test / development fake
  push_gateway/fcm.rb
```

Namespace by integration. Inject the adapter in service constructors — no `Client.new`
hidden mid-service.

## Interface design

| Rule | Detail |
|------|--------|
| **Small surface** | One method per use case (`issue_boleto`, `cancel_boleto`) |
| **Plain Ruby types** | Hashes or value objects in/out — not vendor SDK objects leaking upward |
| **Errors** | Raise domain-specific errors (`BoletoGateway::TransientError`) for job retry |
| **Idempotency** | Accept idempotency key when provider supports it |
| **No tenancy in gateway** | Services pass scoped data; gateway does not query `Charge.find` globally |

```ruby
class Billing::IssueBoletoService < ApplicationService
  def initialize(charge:, school:, gateway: BoletoGateway::Adapter.new)
    @charge = charge
    @school = school
    @gateway = gateway
  end

  def call
    result = gateway.issue_boleto(charge: charge, school: school)
  end
end
```

## Testing

- **Service specs** inject `BoletoGateway::Fake` — assert persisted state, not HTTP stubs.
- **Gateway specs** (optional) use WebMock/VCR against sandbox APIs — keep count low.
- **Job specs** retry on `TransientError` — mock gateway at boundary only.

## When not to add a gateway

- Active Storage S3 — use Rails configuration.
- Simple `deliver_later` email — mailer + provider env vars until multiple providers force abstraction.
- One-off scripts — not product code paths.

Extract a gateway on the **second provider** or when test doubles become painful — not before
the first integration ships.
