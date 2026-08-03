---
name: review-vendor-integration
description: Reviews vendor integration lib and gateway adapter error mapping. Use when reviewing lib/school_lab/integrations, gateway adapters, ErrorMapper, request/response mappers, or integration specs.
---

# Review Vendor Integration

School Lab–specific review for **layers 2–3** of the outbound stack: vendor lib clients
and gateway adapters. Complements `review-http-client` (transport) and `review-api` (REST).

## Scope

| Area | Paths |
|------|-------|
| Integration lib | `web/lib/school_lab/integrations/**` |
| Gateway adapters | `web/app/services/gateways/**/adapter.rb`, `error_mapper.rb`, `request_payload.rb`, `response_parser.rb` |
| Lib specs | `web/spec/lib/school_lab/integrations/**` |
| Adapter specs | `web/spec/gateways/**` |
| Support | `web/spec/support/*_http_mock.rb` |

Skip unless the diff adds/changes vendor HTTP or gateway port mapping.

## Workflow

1. **Diff** — branch changes or files the user named.
2. **Load** — `docs/guidelines/web/integrations.md`, `docs/guidelines/web/gateways.md`, rules
   `integrations`, `gateways`, `http-client`.
3. **Context7** — query Faraday/OAuth when reviewing client patterns (skill `consult-context7`).
4. **Checklist** — [checklist.md](checklist.md); report only failures.
5. **Report** — same severity table format as `review-api`; do not fix unless asked.

## Related

- `use-vendor-integration` — implementation workflow
- `review-http-client` — when the diff also touches `SchoolLab::Http`
- `write-rspec-spec` — spec expectations
- `review-api` — when the change also touches `/api/v1` controllers
