> Pundit authorization — roles, scopes, school and family isolation
>
> **Relevant when touching:** `web/app/policies/**/*.rb`, `web/spec/policies/**/*.rb`, `web/app/controllers/**/*.rb`

# web/ — Policies (Pundit)

Full guide: `docs/guidelines/web/policies.md`. Related: `multi-tenancy`, `controllers`, `lgpd-privacy`.

## Layout

- One policy per model: `app/policies/<model>_policy.rb`; inherit `ApplicationPolicy`.
- Specs in `spec/policies/` — test every action per role and `Scope`.

## Default deny

- Return `false` unless explicitly allowed for `Current.membership.role` and context.
- Roles: `backoffice`, `school`, `teacher`, `guardian` — from membership, not params.

## Controller contract

- `authorize` on every action; `policy_scope(Model)` for index/list — never unscoped queries.
- Wrong role → `403`; cross-school or cross-family → `404` (do not leak existence).
- Services assume authorization already ran — do not skip `authorize`.

## Scope

- Every tenant model policy defines `Scope#resolve` filtering by school and role.
- Guardian scope: only linked children/family records (`.../me/...` routes).

## Anti-patterns

- God policy, business logic in policy, `Model.all` without `policy_scope`.
