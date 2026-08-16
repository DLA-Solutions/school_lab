# Feature slice — School module flags

> Domain: [backoffice](backoffice.md)
> Status: approved — codelet execution contract (Phase 4C.1b / W3)
> Corpus area: n/a (operator surface; module gating grounded via Proesc commercial enablement)

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user (`memberships.role = backoffice`, `school_id: null`) with `manage_backoffice_ops` on SPA `/backoffice`; staff/guardian as adversarial actors on domain APIs and school SPA guards |
| Trigger and precondition | School S exists; module key ∈ `{communication, academic, billing, documents}`; user submits PATCH toggling `enabled`; on create (BR-BO05), `POST /api/v1/schools` seeds all four modules enabled unless overrides supplied |
| Observable outcome | `school_modules` row updated; `PATCH /api/v1/schools/:id/modules` returns 200 with module map; audit row with `actor_type: backoffice`, `school_id`; disabled module → domain API `403 module_disabled`; school SPA nav excludes disabled modules after next `GET /api/v1/me` |
| Adversarial cases | Non-backoffice PATCH → `403 backoffice_only`; unknown module key → `422 validation_error`; invalid school id → `404 not_found`; staff billing call with billing off → `403 module_disabled`; cross-school staff cannot affect other tenants |
| Non-goals | (see section below) |

## Bar

**Reference:** `docs/ref/proesc/comunicacao/modelo-de-dominio.md` § Access (module commercial enablement); `docs/ref/proesc/gestao-financeira/funcionalidades-por-ator.md` (priced module articles)
**Rationale:** Closest documented “feature hidden until module enabled” behavior in the competitive corpus; maps to BR-BO04 SPA/API gating without copying sales-led implantação.
**Recognizably bad:** yes — Proesc gates via sales/support (“solicite um atendimento”); School Lab must beat it with immediate operator toggle + explicit `403 module_disabled`, not a dead-end support message.

## Acceptance criteria

1. Given a backoffice user with role backoffice and platform permission `manage_backoffice_ops`, and school S exists with billing module enabled, when the user sends `PATCH /api/v1/schools/S/modules` with body `{"modules":{"billing":false}}`, then the response status is 200, the payload shows billing disabled, a `school_modules` row exists with `module_key` billing and `enabled` false scoped to school S, and an audit entry is persisted with `actor_type` backoffice and `school_id` S.
   → [invented] — BR-BO03, BR-BO06; no corpus operator UI

2. Given a school staff membership for school S without backoffice role, when the user sends `PATCH /api/v1/schools/S/modules` with body `{"modules":{"billing":false}}`, then the response status is 403 and error code is `backoffice_only`.
   → `docs/prds/platform-and-admin/backoffice.md` BR-BO01 / Errors table

3. Given backoffice user B and school S2 that exists, when B sends `PATCH /api/v1/schools/999999/modules` where 999999 is not a kept school id, then the response status is 404 `not_found`.
   → NFR-003

4. Given backoffice user with `manage_backoffice_ops` and school S, when the user sends `PATCH /api/v1/schools/S/modules` with body `{"modules":{"unknown_module":true}}`, then the response status is 422 `validation_error` and no `school_modules` row is created for `unknown_module`.
   → [invented]

5. Given school S with billing module disabled, and an active staff membership for school S with `manage_billing` permission, when the staff user sends `GET /api/v1/schools/S/billing/charges`, then the response status is 403 and error code is `module_disabled`.
   → `docs/prds/platform-and-admin/backoffice.md` AC-BO02 / BR-BO04

6. Given a backoffice user with `provision_school`, when the user sends `POST /api/v1/schools` with valid school profile, `onboarding_mode` white_glove, and `owner_email`, then the response status is 201, `onboarding_status` is `provisioning`, and `school_modules` rows exist for module keys `communication`, `academic`, `billing`, and `documents` each with `enabled` true for the new school.
   → `docs/prds/platform-and-admin/backoffice.md` UC-BO01 step 4 / BR-BO05

7. Given school S with communication module disabled, and a staff user of S with an active membership, when the staff user loads the school SPA after the next `GET /api/v1/me`, then billing and communication menu entries for disabled modules are not present in the navigation payload returned to the client.
   → `docs/prds/platform-and-admin/backoffice.md` UC-BO03 step 3 / BR-BO04 [product decision]

## Non-goals

- Platform SaaS subscription billing to schools (P2)
- Impersonation / login-as-school support
- White-glove provisioning dashboard actions (`POST …/provisioning/*`) — separate slice
- Tenant list enhancements / cross-tenant user edit (BR-BO08)
- Batch module toggles across schools
- Module toggle audit UI / history browser
- Migrating routes to `/api/v1/backoffice/` (keep existing `/api/v1/schools` + member `/modules`)
- Help center CMS / analytics dashboards

## Roadmap decisions (confirmed Phase 7)

| Decision | Value |
|----------|-------|
| First W3 slice | `school-module-flags` (UC-BO03 + BR-BO05/06 + AC-BO02) |
| API namespace | `/api/v1/schools/:id/modules` (no `/backoffice/` migration) |
| Module key catalog (MVP) | `communication`, `academic`, `billing`, `documents` |
| Default on create | all four enabled (BR-BO05); partial overrides allowed on POST |
| Enforcement scope | API `403 module_disabled` + school SPA nav hide via `GET /me` |
| External bar | Proesc module commercial enablement vs operator toggle |

---

**Distinction from domain PRD ACs:** `backoffice.md` acceptance criteria are product-level outcomes. These ACs are full GWT scenarios verifiable by codelet critics for one shippable engineering unit.

**Parent PRD:** [`backoffice.md`](backoffice.md) — remaining UCs (`tenant-overview-w3`, `provisioning-dashboard-w3`) are follow-on slices.

## Codelet loop verification (2026-08-15)

| AC | Status | Notes |
|----|--------|-------|
| #1 | Approved (5/5) | PATCH toggle + audit via `modules_spec.rb` |
| #2 | Approved (5/5) | Staff → `403 backoffice_only` |
| #3 | Approved (5/5) | Invalid school → `404 not_found` |
| #4 | Approved (5/5) | Unknown key → `422 validation_error` |
| #5 | Approved | GET + billing mutations (`cancel`, `destroy`, `reissue`) → `403 module_disabled` |
| #6 | Approved | White-glove POST documented in OpenAPI with `owner_email`/`onboarding_mode` examples |
| #7 | Approved | Nav hide + deep-link route guard; communication nav N/A (see Accepted limitations) |

**Codelets:** 1/4 unanimous (PATCH + audit). Remaining gaps closed in this ship slice.

**Harness:** Level B — RSpec + Vitest; no browser MCP. Targeted slice specs green; OpenAPI regenerated; RuboCop clean on touched files.

**Decision:** Merge-ready with documented accepted limitations below.

## Accepted limitations

| Limitation | Rationale | Follow-up |
|------------|-----------|-----------|
| **Communication nav N/A** | No Communication W1 sitemap entries exist yet (`messages`, `announcements`, etc.). Module flag is stored and returned on `GET /me`; SPA has nothing to hide. | Communication W1 slice adds sitemap entries + same nav/route guard pattern as billing/academic. |
| **Deep-link guard redirects to dashboard** | Disabled-module deep-links (`/boletos`, `/pessoas/estudantes`, …) redirect to `/` rather than a dedicated forbidden screen. API still returns `403 module_disabled` on data calls. | Optional dedicated "module disabled" page if product wants explicit messaging. |
| **Off-menu routes partially gated** | `team` (permissions editor) is intentionally ungated — not module-specific. `collaborators` and `job-positions` gate on `academic`. | Revisit when academic submodule split is defined. |
