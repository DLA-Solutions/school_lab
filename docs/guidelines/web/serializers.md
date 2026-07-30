# Serializers (Blueprinter)

API output conventions for `web/app/blueprints/`. Stack: **blueprinter** (provisional —
see `docs/web-stack.md` §6). Complements `docs/api/README.md` (JSON shape).

Rule: `.cursor/rules/web/serializers.mdc`. Skill: `review-api`.

## Role

Blueprints transform domain objects into **JSON-serializable hashes** for API responses.
They own field selection and nesting — not business rules, authorization, or i18n strings
for errors (those stay in controllers/services via i18n keys).

Controllers render via blueprints — never build ad-hoc JSON hashes inline.

```ruby
render json: ChargeBlueprint.render(result.data), status: :created
render json: ChargeBlueprint.render(charges, root: :data, meta: pagy_meta(pagy))
```

## Layout

| Piece | Location |
|-------|----------|
| Blueprints | `app/blueprints/<model>_blueprint.rb` |
| Nested views | `view :summary`, `view :detail` on same blueprint |

One blueprint per primary API resource. Nested associations use child blueprints or
`association` blocks — avoid duplicating field lists across views.

## Conventions

| Rule | Detail |
|------|--------|
| **snake_case keys** | Match API contract and OpenAPI (`docs/api/README.md`) |
| **No business logic** | Formatting only — no `if charge.overdue?` workflows; expose `status` field |
| **Views for shape variants** | `summary` for lists, `detail` for show — not separate classes per endpoint |
| **Timestamps** | ISO 8601 strings in JSON (blueprinter default or explicit formatter) |
| **Money** | Expose `amount_cents` (integer) — not formatted currency strings |
| **IDs** | Integer `id` fields; include `school_id` only when client needs it |
| **Associations** | Eager-load in controller/service before render — blueprints must not trigger N+1 |

```ruby
class ChargeBlueprint < Blueprinter::Base
  identifier :id

  view :summary do
    fields :status, :amount_cents, :due_date
    association :guardian, blueprint: GuardianBlueprint, view: :summary
  end

  view :detail do
    include_view :summary
    fields :created_at, :updated_at
  end
end
```

## Lists and pagination

List endpoints return Pagy envelope — blueprint renders the `data` array; `meta` is
assembled in the controller:

```ruby
pagy, charges = pagy(policy_scope(Charge).includes(:guardian))
render json: {
  data: ChargeBlueprint.render_as_hash(charges, view: :summary),
  meta: pagy_metadata(pagy)
}
```

Adjust to match project's Pagy helper naming when implemented.

## Errors

Error responses use the standard envelope — **not** blueprints:

```json
{ "error": { "code": "validation_failed", "message": "...", "details": {} } }
```

`message` comes from i18n via controller mapping of `ResponseService` / validation errors.

## Testing

- **Request specs (rswag)** are the contract test — assert JSON keys and types in response.
- Do not unit-test blueprints in isolation unless a view has non-trivial formatting logic.
- When routes or response shape change, run `rake rswag:specs:swaggerize` and commit OpenAPI.

## Anti-patterns

- Inline `render json: { id: charge.id, ... }` in controllers.
- Blueprints that call services or `authorize`.
- Different field names per endpoint without a documented view (`summary` vs `detail`).
- Lazy-loading associations inside blueprint blocks without `includes` upstream.
