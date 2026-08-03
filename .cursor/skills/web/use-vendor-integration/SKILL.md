---
name: use-vendor-integration
description: Implements lib/school_lab/integrations vendor clients and gateway adapter error mapping. Use when adding Cora-like integrations, FCM HTTP, provider clients, ErrorMapper, or gateway adapter mappers.
---

# Use Vendor Integration

Follow `docs/guidelines/web/integrations.md`, rules `integrations`, `gateways`, `http-client`.

## Before coding

1. Confirm the work spans **layer 2** (lib) and/or **layer 3** (gateway adapter) — not a service.
2. Read the reference:
   - Lib: `web/lib/school_lab/integrations/cora/`
   - Adapter: `web/app/services/gateways/bank_slip/cora/`
3. For Faraday/OAuth details, use skill `consult-context7`.

## Lib checklist (`lib/school_lab/integrations/<vendor>/`)

- [ ] `Client` uses `SchoolLab::Http.build_connection` + `execute` — no raw Faraday elsewhere
- [ ] `Configuration` reads ENV; raises `Integrations::<Vendor>::ConfigurationError` when missing
- [ ] Vendor error classes under `Integrations::<Vendor>::*Error` — not port errors
- [ ] `Client.new(...)` is injectable — no `for_school`, no `Registry`, no AR
- [ ] Map HTTP status codes → vendor errors in the client
- [ ] Map `ConnectionError` → vendor `TransientError`
- [ ] Token cache / OAuth helpers stay in lib if vendor-specific
- [ ] Secrets and response bodies out of exception messages (LGPD)

## Gateway adapter checklist (`app/services/gateways/<instrument>/<vendor>/`)

- [ ] `adapter.rb` implements port `Interface`; factory builds lib client from `Registry.active_config`
- [ ] `error_mapper.rb` translates lib errors → port errors (preserve `ValidationError#details`)
- [ ] `with_port_errors { ... }` wraps every client call
- [ ] `request_payload.rb` / `response_parser.rb` map port value objects ↔ vendor JSON
- [ ] Register in `Registry::ADAPTERS`; update `REQUIRED_CREDENTIALS`

## Specs

| Layer | Path | Asserts |
|-------|------|---------|
| Lib | `spec/lib/school_lab/integrations/<vendor>/` | `Integrations::<Vendor>::*Error` |
| Adapter | `spec/gateways/<instrument>/<vendor>/` | `Gateways::<Instrument>::*Error` |
| Service | `spec/services/<domain>/` | Inject `Fake` — no HTTP stubs |

Verify:

```bash
bundle exec rspec spec/lib/school_lab/integrations/ spec/gateways/<relevant>/
bundle exec rspec spec/config/http_isolation_spec.rb
```

## Adding a new vendor

1. Create `lib/school_lab/integrations/<vendor>/` (client, configuration, errors).
2. Create gateway adapter folder with `adapter.rb`, `error_mapper.rb`, mappers.
3. Register adapter; add webhook parser if applicable.
4. Lib specs + adapter specs + shared examples for the port.

Reference: Cora bank slip (`SchoolLab::Integrations::Cora` + `Gateways::BankSlip::Cora::Adapter`).

## Related

- `use-http-client` — only when changing `SchoolLab::Http` transport
- `review-vendor-integration` — review integration changes
- `write-rspec-spec` — spec conventions
