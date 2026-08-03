---
name: write-rspec-spec
description: Write behavior-focused RSpec specs for web/ (model, service, policy, request/rswag). Use when adding or updating tests in web/spec/.
---

# Write RSpec Specs

Follow `docs/guidelines/web/testing.md` and rule `rules/web/testing-rspec`.

## Before writing

1. Identify the **observable behavior** under test (not internal methods).
2. Determine the layer: model, service, policy, or request.
3. If the spec touches a library API (rswag, Pundit matchers), consult Context7 first.

## Steps

1. **Setup** — `create` real records via FactoryBot; set `school` and tenant keys explicitly.
2. **Act** — call the service, hit the endpoint, or exercise the policy subject.
3. **Assert** — status/JSON, DB changes (`change { Model.count }`), return object, authorization.
4. For request specs, add rswag metadata so OpenAPI stays in sync.

## Mock checklist

Before adding a mock, ask: can I use a real record, fake adapter, or `travel_to` instead?

| Allowed | Not allowed |
|---------|-------------|
| External gateway fake / WebMock | `expect(Service).to receive(:call)` |
| FCM client when push is not under test | Stubbing ActiveRecord |
| `travel_to` for time | Stubbing Pundit or same-domain services |

Gateway HTTP client specs live under `spec/gateways/` and `spec/lib/school_lab/` — see skill
`use-http-client` and `docs/guidelines/web/http-client.md`.

## Request spec minimum

- Happy path (status + JSON shape)
- Wrong role → 403
- Wrong school → 404 or 403 (tenant isolation)
- Invalid params → 422 with error payload
- Invalid state transition → 409 with error payload
