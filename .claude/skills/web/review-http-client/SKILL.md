---
name: review-http-client
description: Reviews SchoolLab::Http transport layer only. Use when reviewing lib/school_lab/http.rb changes — for vendor integrations use review-vendor-integration.
---

# Review HTTP Client (transport)

School Lab–specific review for **layer 1** outbound HTTP. For vendor clients and gateway
adapters, use skill `review-vendor-integration`.

## Scope

| Area | Paths |
|------|-------|
| HTTP wrapper | `web/lib/school_lab/http.rb` |
| Wrapper specs | `web/spec/lib/school_lab/http_spec.rb` |

Skip unless the diff changes `SchoolLab::Http` itself.

## Workflow

1. **Diff** — branch changes or files the user named.
2. **Load** — `docs/guidelines/web/http-client.md`, rule `http-client`.
3. **Context7** — query Faraday when reviewing connection patterns (skill `consult-context7`).
4. **Checklist** — [checklist.md](checklist.md); report only failures.
5. **Report** — same severity table format as `review-api`; do not fix unless asked.

## Related

- `use-http-client` — implementation workflow
- `review-vendor-integration` — vendor client + adapter review
- `review-api` — when the change also touches `/api/v1` controllers
