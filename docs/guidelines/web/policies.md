# Policies (Pundit)

Authorization conventions for `web/app/policies/`. Complements `docs/web-stack.md` §5
(roles and isolation) and `docs/api/README.md` (authorization).

Rule: `.cursor/rules/web/policies.mdc`. Skill: `review-api`.

## Role

Pundit policies answer **who may do what** on a record or collection. They do not contain
business rules — those live in services. Controllers call `authorize` before every action;
services receive already-authorized context (`Current.*`, scoped records).

## Layout

| Piece | Location |
|-------|----------|
| Base policy | `app/policies/application_policy.rb` |
| Model policies | `app/policies/<model>_policy.rb` |
| Specs | `spec/policies/<model>_policy_spec.rb` |

One policy per model. Inherit from `ApplicationPolicy`.

## Default deny

Return `false` unless an action is explicitly allowed for the actor's role and context.
Do not rely on implicit `true` from a parent class for new actions.

```ruby
class ChargePolicy < ApplicationPolicy
  def show?
    school_member? && record.school_id == membership.school_id
  end

  def create?
    school_member? && membership.role.in?(%w[school backoffice])
  end
end
```

## Roles

| Role | Context | Typical scope |
|------|---------|-------------|
| `backoffice` | Platform (DLA) | Cross-school admin; explicit policy per action |
| `school` | School staff | Full school domain per membership |
| `teacher` | School staff | Subset of school data (classes, attendance) |
| `guardian` | Family | Own children and linked records only |

Role comes from `Current.membership.role` (JWT + `GET /me` memberships). Policies must
not trust `params[:role]` or client-supplied role hints.

## Scope class

Every tenant-scoped model policy defines a `Scope` for `policy_scope`:

```ruby
class Scope < Scope
  def resolve
    case membership.role
    when "backoffice"
      scope.all
    when "school", "teacher"
      scope.where(school_id: membership.school_id)
    when "guardian"
      scope.where(id: guardian_visible_charge_ids)
    else
      scope.none
    end
  end
end
```

Controllers use `policy_scope(Charge)` for index/list — never `Charge.where(school_id: ...)`
without going through Pundit.

## Multi-tenancy and family isolation

| Violation | HTTP | When |
|-----------|------|------|
| Wrong role for action | `403` | User authenticated but not permitted |
| Cross-school access | `404` | Record exists in another school (do not leak existence) |
| Cross-family (guardian) | `404` | Another guardian's child/charge/message |

Guardian routes use `.../me/...` namespaces. Policies filter by the logged-in guardian's
links (`student_guardians`, family-scoped charges) — same rigor as per-school isolation.
See `docs/guidelines/web/multi-tenancy.md` and `core/lgpd-privacy` rule.

## Controller contract

1. Authenticate → set `Current.user`, `Current.school`, `Current.membership`.
2. `authorize @record` or `authorize Model` (class-level for `create`).
3. `policy_scope(Model)` for collections.
4. On `Pundit::NotAuthorizedError` → map to `403` or `404` per domain doc (never `500`).

Services assume authorization already ran in the controller. Do not skip `authorize`
because "the service checks too."

## Testing

Specs in `spec/policies/` with real users, memberships, and records (FactoryBot).

Minimum per policy action:

1. Allowed role → `permit`
2. Denied role → `not_to permit`
3. Wrong school → `not_to permit` (scope returns empty or excludes record)
4. Guardian: other family's record → `not_to permit`

Use [pundit-matchers](https://github.com/chrisalley/pundit-matchers) or explicit `subject`
examples. Test **Scope** separately when list filtering is non-trivial.

## Anti-patterns

- **God policy** — one policy covering unrelated domains; split by model.
- **Business logic in policy** — e.g. computing boleto eligibility; keep that in services,
  policy checks role + ownership only.
- **Unscoped index** — `Model.all` in controller without `policy_scope`.
- **Params-based auth** — trusting `params[:school_id]` without matching `Current.membership`.
