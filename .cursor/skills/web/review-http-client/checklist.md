# HTTP Client Review Checklist

Use during `review-http-client`. Check only what the diff touches.

## Transport layer

- [ ] Outbound HTTP uses `SchoolLab::Http` — no raw `Net::HTTP` or stray `Faraday.new` in product code
- [ ] Requests wrapped in `SchoolLab::Http.execute`
- [ ] `ConnectionError` mapped to port `TransientError` in gateway clients
- [ ] Timeouts passed into `build_connection`, not hardcoded in `lib/`
- [ ] mTLS PEM loaded in memory — no temp files for cert/key material

## Gateway client

- [ ] Auth (Bearer, API key, OAuth) and idempotency headers stay in the client, not in `lib/`
- [ ] HTTP status → domain error taxonomy in the client (`ValidationError`, `AuthenticationError`, …)
- [ ] Exception messages do not leak tokens, PEM, or PII from response bodies
- [ ] Connections memoized per base URL when multiple hosts (API vs token)

## Layering

- [ ] No tenant queries or business rules in the HTTP client
- [ ] Services inject gateway adapters — no hidden `Client.new` mid-service
- [ ] No gateway HTTP calls inside `ActiveRecord::Base.transaction`

## Testing

- [ ] Gateway specs stub placeholder hosts — no live provider domains in CI
- [ ] Service specs use `Fake` adapters, not WebMock
- [ ] Changes to `SchoolLab::Http` include `spec/lib/school_lab/http_spec.rb` updates
- [ ] Timeout/connection failure covered → `TransientError` at gateway boundary
