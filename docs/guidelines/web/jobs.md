# Background Jobs

Conventions for `web/app/jobs/`. Stack: ActiveJob + **Solid Queue** (PostgreSQL-backed).
Complements `docs/web-stack.md` §8.

Rule: `.cursor/rules/web/jobs.mdc`. Related: `services`, `state-machines`, `gateways`.

## Role

Jobs run **async work** that must not block the HTTP request: email, boleto issuance, FCM
push, webhooks, bulk exports. Business rules stay in **services** — jobs enqueue and call
one service (or a thin wrapper around it).

```
Controller/Service → perform_later → Solid Queue → Job#perform → Domain::VerbService.call
```

## Layout

| Piece | Location |
|-------|----------|
| Jobs | `app/jobs/<domain>/<action>_job.rb` or `app/jobs/<action>_job.rb` |
| Specs | `spec/jobs/` |

Namespace by domain when volume grows (`Billing::IssueChargeJob`).

## Solid Queue

- Default Rails 8.1 adapter — no Redis/Sidekiq in MVP.
- Queue config in `config/queue.yml`; scheduled (cron-like) jobs in `config/recurring.yml`.
- Failed jobs: monitor via Solid Queue tables; use `retry_on` / `discard_on` explicitly.

## Job design

| Rule | Detail |
|------|--------|
| **Idempotent** | Safe to retry — use idempotency keys or guard with state checks |
| **Pass IDs** | `perform(charge_id, school_id)` — not ActiveRecord objects |
| **Restore tenant** | Load via `school.records.find(id)` — see `multi-tenancy.md` |
| **One responsibility** | One job, one outcome; chain via events or follow-up jobs if needed |
| **Call services** | No business logic inline in `perform` |

```ruby
class Billing::IssueChargeJob < ApplicationJob
  queue_as :billing

  retry_on Gateways::BankSlip::TransientError, wait: :polynomially_longer, attempts: 5
  discard_on ActiveRecord::RecordNotFound

  def perform(charge_id, school_id)
    school = School.kept.find(school_id)
    charge = school.charges.kept.find(charge_id)
    Billing::IssueChargeService.call(charge: charge)
  end
end
```

Only `Gateways::BankSlip::TransientError` is retriable; `ValidationError`,
`AuthenticationError`, and `ProviderError` are permanent. See [`gateways.md`](gateways.md).

## State machines and jobs

- Services invoke AASM `event!` — not controllers or jobs directly.
- Jobs may call a service that transitions state (e.g. push delivery after FCM success).
- Do **not** enqueue jobs from model `after_*` callbacks — enqueue from services, in the same
  transaction that persists the record (see [Enqueueing](#enqueueing)). The callback ban is
  about coupling and unpredictable ordering; it holds wherever the enqueue lives
  (see `state-machines.md`).

## Error handling

| Exception | Handling |
|-----------|----------|
| `ActiveRecord::RecordNotFound` | `discard_on` — record deleted, no retry |
| Transient gateway/network errors | `retry_on` with backoff and attempt limit |
| Business failure (`ResponseService.failure`) | Log and discard or dead-letter — do not infinite retry |

Unexpected exceptions propagate for Solid Queue retry; fix the bug or add explicit handling.

## Enqueueing

Enqueue from **services**, **inside** the transaction that persists the record:

```ruby
# app/services/billing/generate_charges_service.rb
def create_charge_for(contract, guardian, created, skipped_contract_ids)
  ActiveRecord::Base.transaction do
    charge = build_charge(contract, guardian)
    charge.save!
    Billing::IssueChargeJob.perform_later(charge.id, school.id)
    created << charge
  end
rescue ActiveRecord::RecordNotUnique
  skipped_contract_ids << contract.id
end
```

Solid Queue shares the **primary connection** here: in `config/database.yml` the production
`queue` database points at `primary_production`, and `config/environments/production.rb`
deliberately omits `connects_to`. `perform_later` is therefore just another INSERT in the
same transaction — a rollback discards the job together with the charge, and a worker cannot
pick the job up before the commit makes its row visible. Enqueueing after the commit would
open a window where the process dies and leaves a charge that is never issued.

> **This depends on a condition that is invisible at the call site.** It holds only while the
> queue lives in the primary database. If Solid Queue is ever moved to its own database, or
> the adapter changes, the enqueue stops being transactional and must move **after** the
> commit (`after_commit_everywhere`, or past the `transaction` block) — and every
> in-transaction `perform_later` has to be revisited.

Side effects that leave the database **synchronously** — inline gateway HTTP calls,
`deliver_now` — still belong after the commit: a rollback cannot undo them.

Issuance lifecycle lives on **`ChargeIssuance`**, not on `Charge`: `issue`, `mark_failed`,
and `cancel` are `ChargeIssuance` events, invoked by `Billing::IssueChargeService` after the
gateway answers. `Charge` only knows `pay`, `mark_overdue`, and `cancel`.

Use `perform_later` in production; `perform_now` only in tests or synchronous admin tools.

## Testing

Specs in `spec/jobs/`:

- `have_enqueued_job(Billing::IssueChargeJob).with(charge.id, school.id)` from service specs
- Job unit spec: stub gateway at boundary; assert service called or DB state updated
- Tenant: job cannot process record from another school when IDs are mismatched

Prefer testing behavior through service + job integration; mock only external gateways (FCM, boleto, email).
