# Controllers (API)

Conventions for `web/app/controllers/api/v1/`. Complements `docs/api/README.md` (contract)
and `docs/web-stack.md` (architecture).

Rule: `.cursor/rules/web/controllers.mdc`. Skill: `review-api`.

## Role

`web/` is **API-only** — JSON under `/api/v1`. Controllers orchestrate; they do not own
business rules. Clients (`frontend/app`, `mobile/`) consume the same API.

## Creating controllers

Always generate controllers with **`bin/rails generate`** — never hand-create files in
`app/controllers/api/v1/` or `spec/requests/api/v1/`.

```bash
bin/rails generate controller api/v1/charges index show create update destroy --skip-routes
```

- Use the `api/v1/` namespace — matches `app/controllers/api/v1/`.
- Pass only the actions you need (`index`, `show`, `create`, `update`, `destroy`, or member
  routes like `cancel`).
- Use `--skip-routes` — add routes manually in `config/routes.rb` (tenant paths, `scope module:`).
- Do **not** use `scaffold` or `scaffold_api` — they generate views and inline JSON this stack
  does not use.

After generation:

1. Make the controller thin — Pundit, one service per action, blueprinter.
2. Replace the generated request spec stub with an **rswag** request spec in
   `spec/requests/api/v1/`.
3. Add the blueprint in `app/blueprints/` (blueprints are hand-written — no generator).

## Thin controllers

Each action should:

1. Authenticate (JWT) and set `Current.user` / `Current.school` / `Current.membership`.
2. `authorize` with Pundit (reads and writes).
3. Parse strong parameters.
4. Call **one service** (or `policy_scope` + model for simple reads).
5. Render via **blueprinter** — never build JSON hashes inline.

Avoid N+1 queries, cross-domain service chains, and logic that belongs in `app/services/`.

```ruby
# Good
def create
  authorize Charge
  result = Billing::CreateChargeService.call(school: Current.school, params: charge_params)
  render json: ChargeBlueprint.render(result.data), status: :created
end
```

## REST and routing

| Pattern | Use for |
|---------|---------|
| `index`, `show`, `create`, `update`, `destroy` | Standard CRUD |
| `POST /resources/:id/cancel` | State change on one record (AASM event via service) |
| `resource :closure` | State change not tied to a single record |

- No custom **collection** actions — create a new resource controller instead.
- Tenant-scoped paths include `schools/:school_id`.
- Guardian/family routes use `.../me/...` namespace.
- Nest domains with `scope module:` (e.g. `billing`, `people`).

See domain narratives in `docs/api/v1/<domain>.md` for route shapes.

## Authorization and tenancy

- `policy_scope(Model)` for every index/list — never unscoped tenant queries.
- Scope via `Current.*`, not raw `params[:school_id]` alone.
- Wrong role → `403`; cross-tenant access → `404` (or `403` when documented per domain).
- Shared auth/scoping logic → controller concern only on the **third** stable case.

## Request and response

- Strong params: `params.require(:charge).permit(:amount_cents, :due_date)`.
- Error envelope: `{ error: { code, message, details } }` — `message` from i18n keys.
- Lists: Pagy envelope (`data` + `meta` with `page`, `per_page`, `total`).
- `DELETE` → soft delete via Discard when the domain uses it.

## Testing

Request specs in `spec/requests/api/v1/` with **rswag** metadata — not controller specs.

Minimum per endpoint:

1. Happy path — status + JSON shape
2. Missing/invalid token → `401`
3. Wrong role → `403`
4. Wrong school / tenant → `404` or `403`
5. Invalid params → `422` with error payload
6. Invalid state transition → `409` with stable `error.code` (e.g. `invalid_state_transition`)

Run `rake rswag:specs:swaggerize` when routes or responses change; commit `swagger/v1/swagger.yaml`.

See [`testing.md`](testing.md) for behavior-focused RSpec principles.
