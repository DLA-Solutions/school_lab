# Vendor Integration Review Checklist

Use during `review-vendor-integration`. Check only what the diff touches.

## Integration lib (`lib/school_lab/integrations/<vendor>/`)

- [ ] Client uses `SchoolLab::Http.build_connection` + `execute` — no raw Faraday in lib or gateways
- [ ] Client is injectable — no `for_school`, no `Registry`, no ActiveRecord imports
- [ ] `Configuration` reads ENV; missing values raise vendor `ConfigurationError`
- [ ] HTTP status → vendor error taxonomy in the client (not port errors)
- [ ] `ConnectionError` → vendor `TransientError` in the client
- [ ] Exception messages do not leak tokens, PEM, or PII from response bodies
- [ ] Connections memoized per base URL when multiple hosts (API vs token)
- [ ] Token cache / OAuth stay in lib — not duplicated in adapter

## Gateway adapter

- [ ] Adapter implements port `Interface`; only mappers + factory under `gateways/<instrument>/<vendor>/`
- [ ] `ErrorMapper` translates all vendor errors → port errors (preserve `ValidationError#details`)
- [ ] `with_port_errors` wraps every client call
- [ ] `RequestPayload` / `ResponseParser` depend on port value objects — not moved to lib
- [ ] Client factory is the only place that reads `Registry` / school credentials
- [ ] No port error classes raised from `lib/school_lab/integrations/`

## Layering

- [ ] No tenant queries or business rules in lib client
- [ ] Services inject gateway adapters — no hidden client construction mid-service
- [ ] No vendor HTTP calls inside `ActiveRecord::Base.transaction`

## Testing

- [ ] Lib specs in `spec/lib/school_lab/integrations/<vendor>/` assert vendor errors
- [ ] Adapter specs in `spec/gateways/` assert port errors
- [ ] Gateway specs stub placeholder hosts — no live provider domains in CI
- [ ] Service specs use `Fake` adapters, not WebMock
- [ ] Shared examples for the port still pass (`bank_slip_adapter.rb`)

## Registry and credentials

- [ ] New provider registered in `Registry::ADAPTERS`
- [ ] Credential requirements in `SchoolPaymentProvider::REQUIRED_CREDENTIALS`
- [ ] Billing URL env vars in deploy config — not on `school_payment_providers` rows
