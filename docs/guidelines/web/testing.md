# Testing (RSpec)

Behavior-focused testing for `web/`. Complements `docs/web-stack.md` §9 (tooling).

> **Principle:** We test **observable behavior**, not internal implementation. Avoid mocks
> and stubs — only when extremely necessary.

Rule: `.cursor/rules/web/testing-rspec.mdc`. Skill: `write-rspec-spec`.

## Layout

| Layer | Path | Focus |
|-------|------|-------|
| Model | `spec/models/` | Validations, scopes, callbacks with business effect |
| Service | `spec/services/` | Input → result; persisted side effects |
| Policy | `spec/policies/` | Permission by role and context |
| Request / API | `spec/requests/` | HTTP status, JSON shape, auth, `school_id` isolation |
| OpenAPI | rswag blocks inside request specs | Contract documentation via `rake rswag:specs:swaggerize` |

Factories live in `spec/factories/` (FactoryBot). Prefer `create` / `build` with real
records over stubbed collaborators.

## Behavior, not implementation

Assert on **outcomes** the caller or user can observe:

- HTTP status and response body (request specs)
- Records created/updated in the database
- Return values from service objects (result objects, errors)
- Authorization outcomes (allowed vs denied)

Do **not** assert on internal method calls, private APIs, or call order unless the order
is itself a business rule.

```ruby
# Bad — tests implementation
expect(Billing::IssueBoletoService).to receive(:call)

# Good — tests behavior
post "/api/v1/schools/#{school.id}/boletos", params:, headers: auth_headers
expect(response).to have_http_status(:created)
expect(json["status"]).to eq("pending")
expect(Boleto.count).to eq(1)
```

## Avoiding mocks and stubs

Default approach: **real database** (transactional examples), **real FactoryBot records**,
**real service calls** end-to-end within the `web/` process.

| Layer | Setup | Assert |
|-------|-------|--------|
| Model | `create(:student, school:)` | `expect(record).to be_valid` / DB state |
| Service | `create` associated records, call service | Return object + `change { Model.count }` |
| Request | `let!` for setup, `post`/`get` with JWT headers | Status, JSON, DB side effects |
| Policy | `subject` with real user and records | `permit` / `not_to permit` |

### When mocks are acceptable

Use only when the alternative makes the test slow, flaky, or impossible:

| Case | Approach |
|------|----------|
| External HTTP (boleto gateway, email) | Fake adapter in service specs; WebMock stubs in gateway adapter specs (see `gateways.md` — no VCR cassettes in CI) |
| FCM push | Stub the delivery client when push is not the subject under test |
| S3 / Active Storage | Use `:test` service or disk storage in test env |
| Time-sensitive logic | `travel_to` / `freeze_time` (prefer over stubbing `Time.now`) |

### Never mock

- ActiveRecord models or associations
- Pundit policies (test with real user + records)
- Another service in the same domain (call it; if the chain is too long, that signals coupling — see `docs/guidelines/process/design-principles.md`)
- Controllers or serializers under test

## Request specs and rswag

Request specs are the primary API contract tests. Each endpoint should cover:

1. **Happy path** — correct status and JSON shape
2. **Authorization** — wrong role → 403; wrong school → 404 or 403
3. **Validation errors** — 422 with structured error payload
4. **Tenant isolation** — records from school A never visible to school B
5. **State transitions** — invalid AASM transition → `409` with `invalid_state_transition` (or domain code)

Keep rswag metadata (`path`, `parameter`, `response`) alongside examples so OpenAPI stays
in sync with behavior.

## Factories

- One factory per model; use traits for variants (`:discarded`, `:overdue`).
- Always set `school` (and other tenant keys) explicitly or via factory defaults.
- Avoid `create` cascades that build unrelated domains — a test needing five unrelated
  factories may indicate high coupling in the code under test.

## State machines (AASM)

When RSpec is configured, add `require "aasm/rspec"` to `spec/rails_helper.rb`.

| Layer | Assert |
|-------|--------|
| Concern / model | `have_state`, `allow_event`, `transition_from` for the graph |
| Service | `may_*?` denial; DB `status` after `event!` |
| Request | Valid transition → updated JSON `status`; invalid → `409` |

Test transitions in **service specs** as the primary behavior contract; model specs cover
the state graph. See [`state-machines.md`](state-machines.md).

## Cross-surface note

The same behavior-first principle applies to `web-ui/` (Vitest + RTL) and `app/` (Jest +
RN Testing Library). Surface-specific guidelines will expand when those codebases land.
