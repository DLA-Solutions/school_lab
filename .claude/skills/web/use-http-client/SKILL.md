---
name: use-http-client
description: Implements SchoolLab::Http transport layer (Faraday, mTLS, timeouts). Use when changing lib/school_lab/http.rb or adding shared HTTP infrastructure — not for vendor integration clients.
---

# Use SchoolLab::Http

Follow `docs/guidelines/web/http-client.md` and rule `http-client`.

**Scope:** layer 1 transport only (`web/lib/school_lab/http.rb`). For vendor clients
(OAuth, token cache, status mapping), use skill `use-vendor-integration`.

## Before coding

1. Confirm the work is **transport infrastructure** — not a vendor client or gateway adapter.
2. Read `web/lib/school_lab/http.rb` and `spec/lib/school_lab/http_spec.rb`.
3. For Faraday API details, use skill `consult-context7`.

## Implementation checklist

- [ ] Changes stay in `lib/school_lab/http.rb` — no OAuth, token cache, or port errors here
- [ ] Use `Faraday.new` only inside `build_connection` — nowhere else in product code
- [ ] Wrap outbound calls in `SchoolLab::Http.execute`
- [ ] Raise `SchoolLab::Http::ConnectionError` on transport failure — message must not include secrets
- [ ] mTLS PEM loaded in memory — no temp files
- [ ] Timeouts passed as keyword args — not hardcoded magic numbers in `lib/`

## Specs

- All changes → `spec/lib/school_lab/http_spec.rb`
- Also run `spec/config/http_isolation_spec.rb` when touching the wrapper

Verify:

```bash
bundle exec rspec spec/lib/school_lab/http_spec.rb spec/config/http_isolation_spec.rb
```

## Do not add yet

JSON middleware, retry middleware, or logging middleware in `lib/` until a **third** HTTP
consumer needs the same behavior (see design-principles rule).

## Related

- `use-vendor-integration` — vendor client in `lib/school_lab/integrations/`
- `review-http-client` — review transport changes
