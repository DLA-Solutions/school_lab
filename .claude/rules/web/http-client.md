> Outbound HTTP transport — SchoolLab::Http (Faraday) only; vendor clients in integrations lib
>
> **Relevant when touching:** `web/lib/school_lab/http.rb`, `web/spec/lib/school_lab/http_spec.rb`

# web/ — HTTP Client (transport)

Full guide: `docs/guidelines/web/http-client.md`. Integrations: rule `integrations`. Skill: `use-http-client`.

## Scope — layer 1 only

- **`SchoolLab::Http`** — Faraday setup, mTLS from in-memory PEM, timeouts, `ConnectionError`.
- Vendor OAuth, token cache, status mapping → `lib/school_lab/integrations/` (rule `integrations`).

## Mandatory

- **`build_connection`** for Faraday setup; **`execute`** for requests.
- **mTLS** — pass PEM strings in memory; never write certs/keys to temp files.
- **Timeouts** — pass into `build_connection` from integration `Configuration`, not hardcoded in `lib/`.

## Testing

- Wrapper: `spec/lib/school_lab/http_spec.rb` only.
- Vendor clients: `spec/lib/school_lab/integrations/`.
