---
name: review-http-client
description: Reviews outbound HTTP and gateway clients against SchoolLab::Http conventions. Use when reviewing lib/school_lab/http, gateway clients, Faraday usage, WebMock gateway specs, or third-party API integration code in web/.
---

# Review HTTP Client / Gateway Transport

School Lab–specific review for outbound HTTP. Complements `review-api` (REST surface) and
`review-bugbot`. Use when the diff touches transport, not API controllers.

## Scope

| Area | Paths |
|------|-------|
| HTTP wrapper | `web/lib/school_lab/http.rb` |
| Gateway clients | `web/app/services/gateways/**/client.rb` |
| Gateway specs | `web/spec/gateways/**`, `web/spec/lib/school_lab/**` |
| Support | `web/spec/support/*_http_mock.rb` |

Skip unless the diff adds/changes outbound HTTP.

## Workflow

1. **Diff** — branch changes or files the user named.
2. **Load** — `docs/guidelines/web/http-client.md`, `docs/guidelines/web/gateways.md`, rules
   `http-client`, `gateways`.
3. **Context7** — query Faraday when reviewing connection/request patterns (skill `consult-context7`).
4. **Checklist** — [checklist.md](checklist.md); report only failures.
5. **Report** — same severity table format as `review-api`; do not fix unless asked.

## Related

- `use-http-client` — implementation workflow
- `write-rspec-spec` — gateway spec expectations
- `review-api` — when the change also touches `/api/v1` controllers
