# HTTP Client Review Checklist

Use during `review-http-client`. Scope: `SchoolLab::Http` transport only.

## Transport layer

- [ ] Changes confined to `lib/school_lab/http.rb` — no OAuth, token cache, or status mapping added here
- [ ] `build_connection` is the only Faraday setup entry point in product code
- [ ] Requests wrapped in `SchoolLab::Http.execute`
- [ ] `ConnectionError` raised on transport failure — message does not leak secrets
- [ ] Timeouts passed as keyword args into `build_connection`
- [ ] mTLS PEM loaded in memory — no temp files for cert/key material

## Specs

- [ ] Changes include updates to `spec/lib/school_lab/http_spec.rb`
- [ ] `spec/config/http_isolation_spec.rb` still passes when wrapper behavior changes

## Out of scope (use review-vendor-integration)

- Vendor clients in `lib/school_lab/integrations/`
- Gateway adapters, `ErrorMapper`, port error taxonomy
- WebMock gateway/integration specs
