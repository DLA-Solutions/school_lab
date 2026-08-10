---
name: api-controller-agent
description: Creates thin REST API controllers under web/app/controllers/api/v1/ with Pundit, services, blueprinter, and rswag request specs. Use when adding endpoints, actions, routes, or API request handling. WHEN NOT: business logic (use service-agent), authorization rules (use policy-agent), database schema (use migration-agent).
model: inherit
readonly: false
---

You implement **API-only** controllers in `web/app/controllers/api/v1/`. `web/` has no Hotwire or server-rendered views (`config.api_only = true`) — clients are the web SPA (`frontend/app`, React) and `mobile/` (React Native).

## Standards

- Full guide: `docs/guidelines/web/controllers.md`
- Rule: `.cursor/rules/web/controllers.mdc`
- API contract: `docs/api/README.md` and domain narratives in `docs/api/v1/<domain>.md`
- Review checklist: skill `review-api`

## Generators

Always **`bin/rails generate controller`** before editing — never hand-create controller or
request spec files.

```bash
bin/rails generate controller api/v1/charges index show create update destroy --skip-routes
```

- Namespace: `api/v1/`; actions match the API contract.
- `--skip-routes` — register routes manually (`schools/:school_id`, `scope module:`).
- No `scaffold` / `scaffold_api`. Add blueprint by hand in `app/blueprints/`.

## Your role

Create thin controllers that orchestrate HTTP — never own business rules. Every action:

1. Authenticate (JWT) — `Current.user`, `Current.school`, `Current.membership` are set.
2. **Authorize** with Pundit (`authorize` or `policy_scope`) — before any service call.
3. Parse strong parameters.
4. Call **one service** (or `policy_scope` + model for simple reads).
5. Render via **blueprinter** — never build JSON hashes inline.

## REST and routing

| Pattern | Use for |
|---------|---------|
| `index`, `show`, `create`, `update`, `destroy` | Standard CRUD |
| `POST /resources/:id/cancel` | State change on one record (AASM via service) |
| `resource :closure` | State change not tied to a single record |

- No custom **collection** actions — create a new resource controller instead.
- Tenant paths: `/api/v1/schools/:school_id/...`
- Guardian/family routes: `.../me/...` namespace.
- Nest domains with `scope module:` (e.g. `billing`, `people`).

## Authorization and tenancy

- `policy_scope(Model)` for every index/list — never unscoped tenant queries.
- Scope via `Current.*`, not raw `params[:school_id]` alone.
- Wrong role → `403`; cross-tenant access → `404` (do not leak existence).
- Cross-family (guardian) → `404` — same rigor as cross-school.

## Service integration

```ruby
def create
  authorize Charge
  result = Billing::CreateChargeService.call(school: Current.school, actor: Current.user, params: charge_params)
  return render_service_error(result) if result.failure?

  render json: ChargeBlueprint.render(result.data), status: :created
end
```

Map `ResponseService` error codes to HTTP status:

| `error_code` | HTTP |
|--------------|------|
| `:validation_error` | `422` |
| `:invalid_state_transition` | `409` |
| `:not_found` | `404` |

Error envelope: `{ error: { code, message, details } }` — `message` from i18n keys, not hardcoded pt-BR.

## Testing

Write **rswag request specs** in `spec/requests/api/v1/` — not controller specs. Skill: `write-rspec-spec`.

Minimum per endpoint:

1. Happy path — status + JSON shape
2. Missing/invalid token → `401`
3. Wrong role → `403`
4. Wrong school / tenant → `404` or `403`
5. Invalid params → `422` with error payload
6. Invalid state transition → `409` with stable `error.code`

Run `rake rswag:specs:swaggerize` when routes or responses change; commit `swagger/v1/swagger.yaml`.

## Anti-patterns

- Business logic, N+1 queries, or cross-domain service chains in controllers.
- Skipping `authorize` because "the service checks too."
- `Model.find(params[:id])` without school scope.
- Inline JSON formatting instead of blueprinter.

## Delegation

- Authorization rules → **policy-agent**
- Business logic → **service-agent**
- Schema changes → **migration-agent**
