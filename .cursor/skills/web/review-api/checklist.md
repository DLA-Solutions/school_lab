# API Review Checklist

Use during `review-api`. Check only what the diff touches.

## Architecture and layering

- [ ] Business logic lives in `app/services/`, not controllers or serializers
- [ ] Controller calls **one** service per action; no long cross-domain service chains
- [ ] No duplicated domain rules that belong in a service already used elsewhere
- [ ] Non-CRUD actions use `POST` member routes (`/resources/:id/cancel`), not verb hacks on `PATCH`
- [ ] State changes go through services → AASM `event!`; invalid transition → `409`

## Routing and versioning

- [ ] Paths under `/api/v1`; no unversioned public JSON routes
- [ ] Tenant-scoped resources include `schools/:school_id` in the path
- [ ] Guardian/family routes use `.../me/...` namespace where applicable
- [ ] Route names and HTTP verbs match `docs/api/v1/<domain>.md` when documented

## Authentication

- [ ] Protected endpoints require `Authorization: Bearer` access token
- [ ] Refresh flow respects client transport (`web` cookie vs mobile body) per `002-api-auth.md`
- [ ] Token TTL, rotation, and revocation match modeling doc — no long-lived JWT workarounds
- [ ] `users.status` / membership suspension handled on refresh and protected routes

## Authorization (Pundit)

- [ ] `authorize` / policy scope on every mutating and tenant-scoped **read**
- [ ] Policy uses `Current.user`, `Current.school`, `Current.membership` — not raw params
- [ ] Wrong role → `403`; cross-tenant access → `404` or `403` (consistent with domain doc)
- [ ] Guardian routes never expose another family's records (LGPD)

## Request and response shape

- [ ] JSON keys are `snake_case`
- [ ] List endpoints return Pagy envelope: `data` + `meta` (`page`, `per_page`, `total`)
- [ ] Filters/sort params match documented conventions (`status`, `from`, `to`, `sort`)
- [ ] `DELETE` performs soft delete (Discard) when domain uses discard
- [ ] Serializers (blueprinter) do not embed business logic or N+1-heavy implicit queries

## Error handling

- [ ] Errors use the standard envelope: `{ error: { code, message, details } }`
- [ ] HTTP status matches `docs/api/README.md` table (`401`, `403`, `404`, `409`, `422`, …)
- [ ] `code` is a stable machine-readable string; `message` comes from i18n, not hardcoded Portuguese
- [ ] Validation errors populate `details` with field-level info when applicable

## OpenAPI and rswag

- [ ] New/changed endpoints have request specs under `spec/requests/api/v1/`
- [ ] rswag blocks (`path`, `parameter`, `response`, `schema`) match actual behavior
- [ ] OpenAPI tag is one of: `Auth`, `Me`, `Schools`, `Billing`, `People`, `Documents`, `Communication`, `Academic`, `Backoffice`
- [ ] `swagger/v1/swagger.yaml` updated (or reviewer notes to run `rake rswag:specs:swaggerize`)
- [ ] Phase 2 skeleton routes return `501` if marked not implemented in domain doc

## Testing (request specs)

- [ ] Happy path — status + JSON shape
- [ ] Wrong role → `403`
- [ ] Wrong school / tenant → `404` or `403`
- [ ] Invalid params → `422` with error payload
- [ ] Tests use real records (FactoryBot); mocks only at external boundaries
- [ ] No assertions on internal `receive` stubs for same-domain services

## LGPD and sensitive data

- [ ] Health/routine/incident fields not over-exposed in list endpoints
- [ ] Guardian endpoints scoped to own family only
- [ ] No unnecessary PII in logs or error `details`
- [ ] Retention/access implications flagged when touching messages, photos, archive
- [ ] Domain models use `SchoolAuditable` where change history is required; secrets `redacted`/`except`

## Change auditing (audited)

- [ ] API base includes `AuditContext` so `Current.user` is stored on audits
- [ ] No auditing on `refresh_tokens`, `payments`, `webhook_events`
- [ ] Bulk imports wrapped in `without_auditing` when no per-row actor

## State machines (AASM)

- [ ] Lifecycle models use AASM concern with `column: :status`, `no_direct_assignment: true`
- [ ] Controllers do not call `record.cancel!` / bang events — services own transitions
- [ ] Discard (`discarded_at`) not used for business cancellation when `status` exists

## Language and identifiers

- [ ] Code, routes, JSON keys, error codes in English
- [ ] User-facing strings via i18n keys — not hardcoded pt-BR in controllers/serializers
- [ ] Portuguese identifiers only when listed in `docs/glossary.md`

## Context7 cross-check

- [ ] Framework usage (rswag, Pundit, blueprinter, JWT, Pagy, Discard) matches current official patterns
- [ ] No deprecated APIs when Context7 documents a supported replacement — unless project doc locks the old pattern
- [ ] Gem configuration aligns with Rails 8.1 + locked stack (`docs/web-stack.md`)
