# Feature slice — Backoffice module flags UI

> Domain: [backoffice-evolution](backoffice-evolution.md) (E1)  
> Parent: [backoffice.md](backoffice.md) UC-BO03, [school-module-flags.md](school-module-flags.md)  
> Status: draft  
> Wave: **E1**

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with `manage_backoffice_ops` on `/backoffice` |
| Trigger and precondition | School S exists; operator opens module toggles from tenant detail or dedicated control; backend PATCH exists; GET modules or show embed available (BR-BOE01) |
| Observable outcome | UI displays four module keys (`communication`, `academic`, `billing`, `documents`); toggle PATCH succeeds; success/error toast; state matches API on reload |
| Adversarial cases | Staff user cannot access backoffice module UI; missing permission → 403; unknown school → 404; optimistic UI rolls back on PATCH failure |
| Non-goals | (see section below) |

## Bar

**Reference:** [`school-module-flags.md`](school-module-flags.md) ACs #1–#7 (API approved)  
**Rationale:** Backend contract is merge-ready; bar is operator can complete UC-BO03 without API client or curl.  
**Recognizably bad:** yes — module state only changeable via API while grid shows schools without module visibility.

## Acceptance criteria

1. Given backoffice user B with `manage_backoffice_ops` and school S with all modules enabled, when B opens module toggles for S and disables billing, then UI shows billing off, `PATCH /api/v1/schools/S/modules` returns 200, and reloading the page shows billing still disabled.
   → BR-BOE01, [`school-module-flags.md`](school-module-flags.md) AC #1

2. Given backoffice user B and school S, when B opens module toggles before any PATCH, then displayed state matches `GET /api/v1/schools/S/modules` or `GET /api/v1/schools/S?include=modules`.
   → BR-BOE01 [invented]

3. Given school staff user (non-backoffice), when navigating to `/backoffice/schools/S/modules` or equivalent, then user is redirected away from backoffice or receives forbidden.
   → [`backoffice.md`](backoffice.md) AC-BO04

4. Given backoffice user B and school S, when PATCH fails with `422 validation_error`, then UI shows error message and reverts toggle to previous state.
   → [`school-module-flags.md`](school-module-flags.md) AC #4

5. Given backoffice user B without `manage_backoffice_ops`, when attempting to toggle modules, then controls are disabled or hidden and API returns 403 if invoked.
   → BR-BO01 parent

## Non-goals

- Batch toggle across multiple schools
- Module toggle history / audit browser (E2 audit viewer)
- School SPA nav verification (covered in school-module-flags slice AC #7)
- New module keys beyond MVP four
- `/api/v1/backoffice/` namespace migration

## Harness notes

- **Level B:** Vitest + MSW for `modulesApi.ts` and dialog/page component; RSpec existing `modules_spec.rb` stays green.
- **Target files:** `frontend/backoffice/src/api/modulesApi.ts`, tenant detail or dialog component, Vitest specs.
- **No browser MCP** required for slice sign-off.
