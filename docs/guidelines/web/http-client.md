# HTTP Client (`SchoolLab::Http`)

Conventions for **outbound HTTP** to third-party APIs in `web/`. Complements
[`gateways.md`](gateways.md) (domain adapters) and `docs/guidelines/process/design-principles.md`.

Rule: `.cursor/rules/web/http-client.mdc`. Skills: `use-http-client`, `review-http-client`.

## Role

All product code that calls an external HTTP API goes through **`SchoolLab::Http`**
(`web/lib/school_lab/http.rb`). Gateway adapters (`app/services/gateways/`), future FCM
clients, and any other third-party REST integration share the same transport layer.

| Layer | Responsibility |
|-------|----------------|
| `SchoolLab::Http` | Faraday setup, optional mTLS from in-memory PEM, timeouts, infra `ConnectionError` |
| Gateway `Client` | OAuth/token cache, auth headers, idempotency, status → domain errors |
| Gateway `Adapter` | Port contract, value objects, capabilities |
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
- `open_timeout` / `timeout` (read) from keyword args — gateway clients source values from
  their provider `Configuration` module, not duplicated in `lib/`
- When both PEM strings are present: `ssl.client_cert` / `ssl.client_key` in memory — **no
  temp files** (LGPD / credential hygiene)
- `adapter Faraday.default_adapter` (Net::HTTP — WebMock-compatible in specs)

**`execute`**

- Wraps a block; normalizes `Faraday::ConnectionFailed`, `Faraday::TimeoutError`,
  `Errno::ECONNREFUSED`, and `SocketError` to `SchoolLab::Http::ConnectionError`
- Message must not include response bodies or secrets

Gateway clients rescue `ConnectionError` and raise the port's **`TransientError`** (e.g.
`Gateways::BankSlip::TransientError`) so jobs can `retry_on` it.

## Gateway client pattern

Reference: `Gateways::BankSlip::Cora::Client`.

1. **Memoized connections** — one Faraday instance per base URL (API vs token endpoint).
2. **Authenticated requests** — `connection.run_request(method, path, body, headers)`.
3. **Token / OAuth** — separate connection when the token host differs from the API host.
4. **Response mapping** — use `response.status` and `response.body`; map HTTP codes to the
   port error taxonomy in the client, not in `SchoolLab::Http`.
5. **No business rules** — no tenant queries, no idempotency persistence in the client
   beyond headers the provider requires.

## Testing

- **Wrapper specs** — `spec/lib/school_lab/http_spec.rb`: SSL config, timeouts,
  `ConnectionError` on timeout, no temp PEM files.
- **Gateway specs** — WebMock against placeholder hosts (see `spec/support/cora_http_mock.rb`);
  never live provider domains in CI.
- **Service specs** — inject `Gateways::*::Fake`; no HTTP stubs.

Run after changes:

```bash
bundle exec rspec spec/lib/school_lab/http_spec.rb spec/gateways/
bundle exec rspec spec/config/http_isolation_spec.rb
```

## Adding a new integration

1. Extend or reuse `SchoolLab::Http.build_connection` — add optional PEM for mTLS providers;
   omit PEM for API-key-only providers (FCM, etc.).
2. Add a `Client` under the gateway namespace that wraps `execute` + domain error mapping.
3. Add unit specs for the client with WebMock; add wrapper specs only when changing
   `SchoolLab::Http` itself.
4. Extract shared Faraday middleware (JSON, retry, logging) into `lib/` only when a **third**
   consumer needs the same behavior — not before.

## Out of scope for `SchoolLab::Http`

- Active Storage S3 — Rails / AWS SDK configuration.
- Inbound webhooks — Rack controllers + parsers, not outbound HTTP.
- Email — mailer + provider env until a second email provider forces abstraction.
