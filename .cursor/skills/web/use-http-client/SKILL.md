---
name: use-http-client
description: Implements outbound HTTP to third-party APIs using SchoolLab::Http (Faraday). Use when adding or changing gateway clients, FCM HTTP calls, provider adapters, or lib/school_lab/http.rb.
---

# Use SchoolLab::Http

Follow `docs/guidelines/web/http-client.md` and rules `http-client`, `gateways`.

## Before coding

1. Confirm the work belongs in a **gateway client** (`app/services/gateways/.../client.rb`) or
   a new integration namespace — not in a service or controller.
2. Read the reference client: `web/app/services/gateways/bank_slip/cora/client.rb`.
3. For Faraday API details, use skill `consult-context7`.

## Implementation checklist

- [ ] Use `SchoolLab::Http.build_connection` — no `Net::HTTP.new`, no `Faraday.new` outside `lib/`
- [ ] Wrap outbound calls in `SchoolLab::Http.execute`
- [ ] Map `SchoolLab::Http::ConnectionError` → port `TransientError` in the client
- [ ] Map HTTP status codes → port error classes in the client (not in `lib/`)
- [ ] Memoize one connection per base URL (API vs token/OAuth host)
- [ ] Pass mTLS PEM from school/provider config — in memory only
- [ ] Source `open_timeout` / read timeout from the provider `Configuration` module
- [ ] Keep secrets and response bodies out of exception messages (LGPD)

## Specs

- New/changed `SchoolLab::Http` behavior → `spec/lib/school_lab/http_spec.rb`
- New/changed gateway client → `spec/gateways/<port>/<provider>/client_spec.rb` with WebMock
- Service specs → inject `Fake` adapter; no HTTP stubs

Verify:

```bash
bundle exec rspec spec/lib/school_lab/http_spec.rb spec/gateways/<relevant>/
bundle exec rspec spec/config/http_isolation_spec.rb
```

## Do not add yet

JSON middleware, retry middleware, or logging middleware in `lib/` until a **third** HTTP
consumer needs the same behavior (see design-principles rule).
