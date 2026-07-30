# Service Objects

Conventions for `web/app/services/`. Complements `docs/web-stack.md` (architecture) and
`docs/guidelines/process/design-principles.md` (cohesion and coupling).

Rule: `.cursor/rules/web/services.mdc`. Skill: `write-rspec-spec`.

## Role

Service objects are the **single entry point for business logic** in `web/`. Controllers,
jobs, and other services call them; clients (`web-ui/`, `app/`) never duplicate rules.

| Layer | Responsibility |
|-------|----------------|
| Controller | Auth, Pundit, params, one service call, blueprinter render |
| Service | Business rules, orchestration, transactions, side effects |
| Model | Associations, validations, scopes, thin predicates and AASM guards |

## Base class and result object

Services inherit from `ApplicationService` (`.call` shortcut only) and return a `ResponseService`:

```ruby
# app/services/application_service.rb
class ApplicationService
  def self.call(...)
    new(...).call
  end
end

# app/services/response_service.rb
class ResponseService
  attr_reader :data, :error_code, :details

  def initialize(data: nil, error_code: nil, details: nil)
    @data = data
    @error_code = error_code
    @details = details
  end

  def self.success(data: nil)
    new(data: data)
  end

  def self.failure(code:, details: nil)
    new(error_code: code, details: details)
  end

  def success?
    !has_error?
  end

  def failure?
    has_error?
  end

  private

  def has_error?
    error_code.present?
  end
end
```

- **Do not raise** for expected failures (invalid transition, validation, not found in tenant).
- Reserve exceptions for programmer errors and unexpected persistence failures.
- Prefer multi-line `def method_name(...)` bodies over endless method syntax (`def foo = bar`).
- `error_code` is a stable symbol (e.g. `:invalid_state_transition`) — controllers map it to
  HTTP status and i18n `error.message`.

## Naming and file layout

Pattern: **`Domain::VerbService`** — always use the `Service` suffix.

| Good | Avoid |
|------|-------|
| `Billing::CreateChargeService` | `Billing::CreateCharge` (missing suffix) |
| `Auth::IssueTokensService` | `ChargeCreator` |
| `Billing::CancelChargeService` | `Entities::Create` (no domain namespace) |

```
app/services/
  application_service.rb
  billing/
    create_charge_service.rb      # Billing::CreateChargeService
    cancel_charge_service.rb      # Billing::CancelChargeService
  auth/
    issue_tokens_service.rb       # Auth::IssueTokensService
```

## Implementation checklist

1. **Constructor** — keyword args for context (`school:`, `actor:`, `params:`) and injected
   boundaries (gateways, mailers).
2. **`#call`** — single public instance method; class method `.call` delegates to `new(...).call`.
3. **Early returns** — `return ResponseService.failure(code: :code)` for business rule violations.
4. **Transactions** — `ActiveRecord::Base.transaction` when multiple models must commit together.
5. **State machines** — `return ResponseService.failure(code: :invalid_state_transition) unless record.may_cancel?` then
   `record.cancel!`. See [`state-machines.md`](state-machines.md).
6. **Side effects** — enqueue jobs, send email, call gateways **after** successful persistence
   (inside the transaction only when rollback must undo them; otherwise after commit).

```ruby
# app/services/billing/cancel_charge_service.rb
module Billing
  class CancelChargeService < ApplicationService
    def initialize(charge:, actor:)
      @charge = charge
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless @charge.may_cancel?

      ActiveRecord::Base.transaction do
        @charge.cancel!
      end

      Billing::VoidBoletoJob.perform_later(@charge.id)
      ResponseService.success(data: @charge)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors)
    end
  end
end
```

## Authorization and tenancy

- Controllers call `authorize` **before** invoking the service.
- Services receive already-scoped records (`policy_scope` / `Current.school`) or explicit
  `school:` — do not trust unscoped IDs from params.
- Wrong-school record → treat as not found (`ResponseService.failure(code: :not_found)`) to match API `404` behavior.

## Controller mapping

```ruby
def create
  authorize Charge
  result = Billing::CreateChargeService.call(school: Current.school, params: charge_params)
  return render_service_error(result) if result.failure?

  render json: ChargeBlueprint.render(result.data), status: :created
end
```

Map common codes to HTTP status:

| `error_code` | HTTP |
|--------------|------|
| `:validation_error` | `422` |
| `:invalid_state_transition` | `409` |
| `:not_found` | `404` |
| `:forbidden` | `403` (rare — prefer Pundit in controller) |

## Coupling

- One service = one use case. Avoid long cross-domain chains (A → B → C → D); use a job or
  domain event when orchestration spans aggregates.
- Call another service in the same domain when natural; if setup needs many unrelated factories,
  reconsider boundaries (`docs/guidelines/process/design-principles.md`).

## Auditing

- Normal API requests: `AuditContext` sets `Audited.store[:audited_user]` from `Current.user`.
- Bulk imports / system actions: `Model.without_auditing { ... }` and document the actor.
- Assert audit rows in service specs when change tracking is a business rule. See [`auditing.md`](auditing.md).

## Testing

Specs live in `spec/services/<domain>/`. Focus on observable behavior:

```ruby
RSpec.describe Billing::CancelChargeService do
  subject(:result) { described_class.call(charge:, actor:) }

  let(:charge) { create(:charge, :issued, school:) }
  let(:actor) { create(:user) }

  it "cancels the charge" do
    expect(result).to be_success
    expect(charge.reload.status).to eq("cancelled")
  end

  context "when transition is not allowed" do
    let(:charge) { create(:charge, :paid, school:) }

    it "returns invalid_state_transition" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:invalid_state_transition)
    end
  end
end
```

- Use real records and the database; stub only external gateways (boleto, email, FCM).
- Cover success path, each failure code, and persisted side effects (`change { Model.count }`).

See [`testing.md`](testing.md) for project-wide RSpec principles.
