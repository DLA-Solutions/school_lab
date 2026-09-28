> AASM state machines for domain lifecycles — status column, services, API
>
> **Relevant when touching:** `web/app/models/**/*.rb`, `web/app/models/concerns/**/*_state_machine.rb`, `web/app/services/**/*.rb`, `web/config/initializers/aasm.rb`

# web/ — State Machines (AASM)

Full guide: `docs/guidelines/web/state-machines.md`. Stack: `docs/web-stack.md` §7. Services: rule `services`.

## When to use

- Multi-state lifecycles with guarded transitions: `Charge`, `Document`, `Contract`, push delivery.
- **Skip** for simple two-state flags — use `validates :status, inclusion: ...` instead.

## Definition

- One concern per model (`ChargeStateMachine`); `aasm column: :status` (string, matches DBML/API).
- `no_direct_assignment: true`, `whiny_transitions: false`, `timestamps: true` when `{state}_at` columns exist.
- Guards = thin model predicates; cross-aggregate checks in services before `event!`.

## Who calls events

- **Services** invoke `may_*?` / `event!` — not controllers or jobs directly.
- Controllers: `POST /charges/:id/cancel` → `Billing::CancelChargeService` → `charge.cancel!`.
- Invalid transition → API `409` with stable `error.code`.

## Orthogonal concerns

- **Discard** (`discarded_at`) ≠ business `status` (e.g. `cancelled` vs soft-deleted).
- **audited** logs changes; AASM enforces valid transitions.
