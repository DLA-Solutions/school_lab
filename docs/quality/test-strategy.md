# Test strategy

School Lab verification layers for docs-driven delivery. Business rules are authoritative in
`web/` services; clients consume `/api/v1` without duplicating rules.

## Pyramid

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | RSpec (`web/spec/models`, `services`, `policies`) | Pure logic, state machines, calculators |
| Request / contract | rswag (`web/spec/requests/api/v1`) | HTTP status, JSON shape, OpenAPI generation |
| Integration | RSpec + WebMock | Gateway adapters (`Gateways::BankSlip::Fake`, Cora stubs) |
| Client unit | Vitest + RTL (`frontend/app`) | Design system patterns, API client refresh path |
| Client E2E | Manual / future Playwright | Role flows post-MVP automation |
| Mobile | Jest (`mobile/`) | Navigation, secure storage mocks |

## Domain priorities (MVP)

1. **Attendance absence notifications** — NFR-001: idempotent push, retry, audit trail.
2. **Billing reconciliation** — webhook → fetch_invoice → payment; no double-pay.
3. **Family isolation** — communication and guardian routes never cross families.
4. **Tenant isolation** — every query scoped by `school_id`.

## Environments

| Env | Purpose |
|-----|---------|
| Local | `bin/ci`, `web/bin/backend-ci`, `npm run test:run` |
| Staging | Manual Kamal deploy; Cora sandbox smoke (outside CI) |
| CI | GitHub Actions path-filtered; WebMock only for Cora |

## Cora and external services

- CI uses `Fake` adapter and WebMock — no live Cora credentials.
- Postmark skipped when `POSTMARK_API_TOKEN` unset.
- FCM push tested with stubbed HTTP in notification job specs.

## Definition of done (engineering)

- Domain PRD acceptance criteria mapped to at least one automated spec where behaviour is shipped.
- OpenAPI regenerated when routes change (`rake rswag:specs:swaggerize`).
- DBML updated when schema changes (`docs/database/schema.dbml`).

## Related

- [`acceptance-harness.md`](acceptance-harness.md) — AC traceability to CI
- [`docs/prds/index.md`](../prds/index.md) — validated domain PRDs and NFR hooks per domain
- [`docs/guidelines/process/local-ci.md`](../guidelines/process/local-ci.md)
- [`docs/product/non-functional-requirements.md`](../product/non-functional-requirements.md)
