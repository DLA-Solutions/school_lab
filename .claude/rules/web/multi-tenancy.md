> school_id isolation, Current attributes, guardian family scope, jobs
>
> **Relevant when touching:** `web/app/models/**/*.rb`, `web/app/controllers/**/*.rb`, `web/app/services/**/*.rb`, `web/app/jobs/**/*.rb`, `web/db/migrate/**/*.rb`, `web/spec/**/*`

# web/ — Multi-Tenancy

Full guide: `docs/guidelines/web/multi-tenancy.md`. Related: `policies`, `controllers`, `models`, `jobs`.

## Isolation

- Tenant path: `/api/v1/schools/:school_id/...`; global: `auth/*`, `GET /me`, backoffice.
- `Current.user`, `Current.school`, `Current.membership` set after JWT auth.
- Every tenant table has `school_id` (`null: false` unless documented).
- **No `default_scope`** for tenancy — use `policy_scope` or explicit `school_id`.

## Queries

- Lists: `policy_scope(Model)` in controllers.
- Finds: `school.records.find(id)` — never global `Model.find(params[:id])`.
- No `app/queries/` by default — scopes + services; extract query object on third stable case.
- `strict_loading` in development where practical.

## Family (guardian)

- Routes: `.../me/...`; policies scope to guardian's `student_guardians` links.
- Cross-family access → `404` — same rigor as cross-school.

## Jobs

- Pass IDs + `school_id`; re-scope in `perform` through school association.
- Idempotent — safe to retry.

## Testing

- Request and policy specs must cover cross-school and cross-family isolation.
