# HTTP Client (`SchoolLab::Http`)

Conventions for **outbound HTTP transport** in `web/`. Complements
[`integrations.md`](integrations.md) (vendor clients), [`gateways.md`](gateways.md) (domain
ports), and `docs/guidelines/process/design-principles.md`.

Rule: `.cursor/rules/web/http-client.mdc`. Skills: `use-http-client`, `review-http-client`.
For vendor integration clients, see skill `use-vendor-integration`.

## Role

All product code that calls an external HTTP API uses **`SchoolLab::Http`**
(`web/lib/school_lab/http.rb`) as **layer 1** of the outbound stack. Vendor-specific clients
(`SchoolLab::Integrations::*`) and gateway adapters sit above it — see
[`integrations.md`](integrations.md).

| Layer | Responsibility |
|-------|----------------|
| `SchoolLab::Http` | Faraday setup, optional mTLS from in-memory PEM, timeouts, infra `ConnectionError` |
| `SchoolLab::Integrations::<Vendor>` | OAuth/token cache, auth headers, idempotency, vendor HTTP errors |
| Gateway `Adapter` | Port contract, value objects, error mapping to port taxonomy |
| Service | Orchestration, persistence, `ResponseService` |

Do **not** use raw `Net::HTTP`, `HTTParty`, or ad-hoc Faraday setup in product code.
The only exception is `spec/config/http_isolation_spec.rb`, which asserts WebMock blocks
unstubbed outbound calls at the Net::HTTP layer.

## API

Single module — no middleware stack yet (extract JSON/retry/logging on the third consumer):

```ruby
SchoolLab::Http.build_connection(
  base_url:,
  open_timeout:,
  read_timeout:,
  certificate_pem: nil,   # both PEM args required together for mTLS
  private_key_pem: nil
)

SchoolLab::Http.execute { connection.get("/path") }
# raises SchoolLab::Http::ConnectionError on transport failure
```

**`build_connection`**

- `Faraday.new(url: base_url.chomp("/"))`
- `open_timeout` / `timeout` (read) from keyword args — integration `Configuration` modules
  source values, not duplicated in `lib/`
- When both PEM strings are present: `ssl.client_cert` / `ssl.client_key` in memory — **no
  temp files** (LGPD / credential hygiene)
- `adapter Faraday.default_adapter` (Net::HTTP — WebMock-compatible in specs)

**`execute`**

- Wraps a block; normalizes `Faraday::ConnectionFailed`, `Faraday::TimeoutError`,
  `Errno::ECONNREFUSED`, and `SocketError` to `SchoolLab::Http::ConnectionError`
- Message must not include response bodies or secrets

Integration clients rescue `ConnectionError` and raise the vendor's **`TransientError`**
(e.g. `SchoolLab::Integrations::Cora::TransientError`). The gateway adapter maps that to
the port's `TransientError` so jobs can `retry_on` it.

## What belongs here vs integrations

**`SchoolLab::Http`** owns transport only. Do **not** add OAuth, token cache, status-code
mapping, or port error classes to `lib/school_lab/http.rb`.

Reference integration client: `web/lib/school_lab/integrations/cora/client.rb` (uses
`SchoolLab::Http.build_connection` + `execute`; raises `Integrations::Cora::*Error`).

## Testing

- **Wrapper specs** — `spec/lib/school_lab/http_spec.rb`: SSL config, timeouts,
  `ConnectionError` on timeout, no temp PEM files.
- **Integration specs** — `spec/lib/school_lab/integrations/<vendor>/` with WebMock against
  placeholder hosts; never live provider domains in CI.
- **Gateway adapter specs** — port contract and error mapping; see `spec/gateways/`.
- **Service specs** — inject `Gateways::*::Fake`; no HTTP stubs.

Run after changes:

```bash
bundle exec rspec spec/lib/school_lab/http_spec.rb spec/gateways/
bundle exec rspec spec/config/http_isolation_spec.rb
```

## Adding a new integration

1. Extend or reuse `SchoolLab::Http.build_connection` — add optional PEM for mTLS providers;
   omit PEM for API-key-only providers (FCM, etc.).
2. Add a vendor client under `lib/school_lab/integrations/<vendor>/` — see
   [`integrations.md`](integrations.md) and skill `use-vendor-integration`.
3. Add a gateway adapter under `app/services/gateways/<instrument>/<vendor>/` with
   `ErrorMapper` for port error translation.
4. Add lib specs with WebMock; add wrapper specs only when changing `SchoolLab::Http` itself.
5. Extract shared Faraday middleware (JSON, retry, logging) into `lib/` only when a **third**
   consumer needs the same behavior — not before.

## Out of scope for `SchoolLab::Http`

- Active Storage S3 — Rails / AWS SDK configuration.
- Inbound webhooks — Rack controllers + parsers, not outbound HTTP.
- Email — mailer + provider env until a second email provider forces abstraction.
