# State machines (AASM)

Conventions for lifecycle transitions on domain records. Uses the
[AASM](https://github.com/aasm/aasm) gem.

Rule: `.cursor/rules/web/state-machines.mdc`.

## Role

AASM defines **states**, **events**, and **guards** for records with a non-trivial
lifecycle. The `status` column in `docs/database/database_dml.md` is the persistence
layer — store **string** values (`pending`, `paid`, …) matching API JSON.

| Tool | Responsibility |
|------|----------------|
| **AASM** (model concern) | Valid transitions, guards, `may_*?` predicates |
| **Service** | Orchestration, authorization context, side effects, error mapping |
| **Controller** | `POST /resources/:id/cancel` → calls service — never `record.cancel!` directly |
| **Discard** | Soft delete (`discarded_at`) — orthogonal to business `status` |
| **audited** | Change history — complements AASM; does not replace it |

## When to use AASM

Use when the PRD/API documents **multiple states with guarded transitions**:

| Model | States (examples) | Events |
|-------|-------------------|--------|
| `Charge` | pending, paid, overdue, cancelled | `pay`, `mark_overdue`, `cancel` |
| `Document` | pending, approved, rejected | `approve`, `reject` |
| `Contract` | active, suspended, ended | `suspend`, `resume`, `end` |
| Push delivery (future) | queued, sent, failed, … | per `docs/web-stack.md` §8 |

**Skip AASM** for simple flags with no transition graph (e.g. boolean toggles) or
two-state lifecycles with no guards — use validation + `inclusion` on `status` instead.

## Definition pattern

Extract one concern per model (`ChargeStateMachine`, `DocumentStateMachine`):

```ruby
module ChargeStateMachine
  extend ActiveSupport::Concern

  included do
    include AASM

    aasm column: :status,
         timestamps: true,
         no_direct_assignment: true,
         whiny_transitions: false do
      state :pending, initial: true
      state :paid
      state :overdue
      state :cancelled

      event :pay do
        transitions from: %i[pending overdue], to: :paid
      end

      event :cancel do
        transitions from: %i[pending overdue], to: :cancelled
      end
    end
  end
end
```

Reference implementation: `app/models/concerns/charge_state_machine.rb`.

### Options we standardize on

| Option | Why |
|--------|-----|
| `column: :status` | Matches DBML and API — not default `aasm_state` |
| `no_direct_assignment: true` | Forces events; prevents `record.status = :paid` |
| `whiny_transitions: false` | Services check `may_*?` and return errors — no exceptions in happy path |
| `timestamps: true` | Sets `{state}_at` when column exists (e.g. `paid_at`) |
| `create_scopes: false` | Prefer explicit scopes to avoid clashing with domain methods |

Use **guards** for preconditions (`guard: :payment_confirmed?`). Keep guards as thin
predicates on the model; cross-aggregate checks belong in the service before calling the event.

## Services invoke transitions

Controllers and jobs never call bang events directly without a service wrapper:

```ruby
# app/services/billing/cancel_charge.rb
module Billing
  class CancelCharge < ApplicationService
    def initialize(charge:, actor:)
      @charge = charge
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless @charge.may_cancel?

      @charge.cancel! # persists via AASM bang method
      ResponseService.success(data: @charge)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors)
    end
  end
end
```

Side effects (email, boleto void, job enqueue) go in the **service after** a successful
`event!`, or in `after_commit` on the event when the side effect must only run after DB
commit. Do **not** enqueue jobs from AASM `after` callbacks unless the domain doc requires it.

Map invalid transitions to API `409 Conflict` with a stable `error.code` (e.g. `invalid_state_transition`).

## API mapping

Member routes map to AASM events via services:

```
POST /charges/:id/cancel  →  Billing::CancelCharge  →  charge.cancel!
```

Event names should align with route intent (`cancel`, `pay`, `approve`) — not generic `update`.

## Discard vs status

- `status: cancelled` — business cancellation (charge voided, still in history).
- `discarded_at` — erroneous/duplicate record removal (Discard gem).

Never use Discard to represent business cancellation when `status` exists for that purpose.

## Multiple state machines

Rare; prefer one `status` column per model. If needed, use `aasm :delivery, column: :delivery_status`
with `namespace:` to avoid event name collisions (see AASM docs).

## Testing

When RSpec lands, add `require "aasm/rspec"` to `spec/rails_helper.rb`.

- **Model/concern specs** — `have_state`, `allow_event`, `transition_from` for the graph.
- **Service specs** — assert `may_*?` denial and persisted state after `event!`.
- **Request specs** — invalid transition → `409`; valid → JSON `status` updated.

Prefer service-level behavior tests over testing AASM internals in isolation.

See [`testing.md`](testing.md).

## Setup

| Piece | Location |
|-------|----------|
| Gems | `aasm`, `after_commit_everywhere` in `Gemfile` |
| Initializer | `config/initializers/aasm.rb` |
| Reference concern | `app/models/concerns/charge_state_machine.rb` |

Run `bundle install` after pulling.
