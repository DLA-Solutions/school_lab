# Anti-Patterns

Rails patterns to avoid in `web/`. Complements `docs/guidelines/process/design-principles.md`
(duplication over bad abstraction, third-case extraction rule).

Rule: `.cursor/rules/web/anti-patterns.mdc`.

## God model

If a model exceeds ~200 lines or owns workflows (create charge + boleto + notify), extract
business logic to **services**. The model keeps persistence, validations, associations,
scopes, and thin predicates only.

## Service graveyard

Do not create a service for trivial CRUD. `student.update!(name: params[:name])` behind
`authorize` is fine. Extract when there is real complexity: transactions, side effects,
state machines, cross-aggregate rules.

## Callback spaghetti

Never chain `after_create` / `after_save` for emails, jobs, APIs, or creating related
records. Callbacks are for **data normalization** (`before_validation`) and defaults
(`after_initialize`) only.

## Kitchen sink concern

Concerns must be narrow (`Discardable`, `SchoolScoped`, `ChargeStateMachine`). If a concern
exceeds ~30 lines or has multiple responsibilities, it is a service in disguise — split or
move logic to services.

## STI abuse

If more than ~20% of columns are subtype-specific (many NULLs), prefer polymorphic
associations or separate tables over Single Table Inheritance.

## N+1 ignorance

Eager-load associations you will access (`includes`, `preload`, `eager_load`). Use
`strict_loading` in development to catch lazy loads. List endpoints belong in services or
`policy_scope` with deliberate includes — not accidental per-row queries in blueprints.

## Unscoped tenant queries

Never `Model.find(params[:id])` or `Model.all` for tenant data. Use `policy_scope`,
`Current.school`, or `school.records.find(id)`. Cross-tenant leaks are a security defect.

## Authorization in the wrong layer

- Policies in controllers — not buried in services as the only check.
- Business rules in services — not in Pundit (`may_issue_boleto?` eligibility is service;
  `school_staff?` is policy).

## Raising for business failures

Services return `ResponseService.failure(code:)` for expected failures — do not raise
`StandardError` for validation or invalid state transitions. Reserve exceptions for bugs
and unexpected persistence errors.

## Premature abstraction

No base classes, `app/queries/`, or generic helpers until the **third stable case** with
identical shape. Three similar lines beat the wrong abstraction.

## Direct AASM from controllers or jobs

Controllers and jobs call **services**; services call `may_*?` / `event!`. Keeps transition
rules and side effects in one place.

## Mocking the domain in tests

Do not mock ActiveRecord, Pundit, or same-domain services in specs. Use real records and
the database; mock only external gateways. See `testing.md`.

## Provider email in local or test

Never point development or RSpec at Postmark, SMTP, or any mail provider API — even when
`POSTMARK_API_TOKEN` is in `.env`. Development uses Letter Opener (`/letter_opener`);
test uses `delivery_method = :test`. See [`mailers.md`](mailers.md).

## Raw outbound HTTP

Do not call third-party APIs with `Net::HTTP`, `HTTParty`, or ad-hoc `Faraday.new` in
product code. Use `SchoolLab::Http` (`web/lib/school_lab/http.rb`) — see
[`http-client.md`](http-client.md).

## Vendor HTTP in the wrong layer

Do not put vendor HTTP clients, OAuth, or token cache under `app/services/gateways/` — they
belong in `lib/school_lab/integrations/<vendor>/`. The gateway adapter keeps only port
mapping (`RequestPayload`, `ResponseParser`, `ErrorMapper`) and client factory wiring.

Do not raise **port** errors (`Gateways::BankSlip::ValidationError`, etc.) from
`lib/school_lab/integrations/`. Lib raises vendor errors; the adapter's `ErrorMapper`
translates to the port taxonomy. See [`integrations.md`](integrations.md).
