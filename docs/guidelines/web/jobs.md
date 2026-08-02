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
- Do **not** enqueue jobs from model `after_*` callbacks — enqueue from services after
  successful persistence (see `state-machines.md`).

## Error handling

| Exception | Handling |
|-----------|----------|
| `ActiveRecord::RecordNotFound` | `discard_on` — record deleted, no retry |
| Transient gateway/network errors | `retry_on` with backoff and attempt limit |
| Business failure (`ResponseService.failure`) | Log and discard or dead-letter — do not infinite retry |

Unexpected exceptions propagate for Solid Queue retry; fix the bug or add explicit handling.

## Enqueueing

Enqueue from **services** after the transaction commits:

```ruby
ActiveRecord::Base.transaction do
  charge.save!
end
Billing::IssueChargeJob.perform_later(charge.id, school.id)
```

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
