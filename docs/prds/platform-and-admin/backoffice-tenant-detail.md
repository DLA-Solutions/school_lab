# Feature slice — Backoffice tenant detail

> Domain: [backoffice-evolution](backoffice-evolution.md) (E1)  
> Parent: [backoffice.md](backoffice.md) UC-BO04  
> Status: draft  
> Wave: **E1**

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with `manage_backoffice_ops` or `provision_school` (read) |
| Trigger and precondition | School S exists; operator navigates from schools grid or dashboard link |
| Observable outcome | Page at `/schools/:id` shows profile, onboarding_status, onboarding_mode, module chips, active school year summary, aggregate counts (students, staff — no names), quick links to wizard/credentials/activation/modules |
| Adversarial cases | Invalid id → 404 page; non-backoffice → redirect; response must not include guardian email/CPF or student names (BR-BOE03) |
| Non-goals | (see section below) |

## Bar

**Reference:** Parent UC-BO04 tenant overview — list exists; detail is the missing operator cockpit.  
**Rationale:** Operator cannot assess tenant health from grid alone.  
**Recognizably bad:** yes — only schools list with no drill-down while API supports show.

## Acceptance criteria

1. Given backoffice user and school S, when navigating to `/schools/S`, then page renders school name, CNPJ, onboarding_status, onboarding_mode, created_at, and module enablement chips matching API modules payload.
   → UC-BO04, BR-BOE01

2. Given school S with active school year, when loading tenant detail, then active year name, dates, and status display without requiring separate school SPA login.
   → BR-BOE02 follow-on

3. Given school S, when API returns aggregate_counts `{ students: 42, staff: 5 }`, then page shows counts only — no student or guardian PII fields in DOM or network tab response used by page.
   → BR-BOE03, parent BR-BO04

4. Given provisioning school S, when viewing detail, then prominent links navigate to `/schools/S/provisioning`, `/schools/S/bank-credentials`, and `/schools/S/activation`.
   → UC-BO02 [invented]

5. Given unknown school id, when backoffice user opens `/schools/999999`, then UI shows not-found state and does not leak whether id existed before discard.
   → NFR-003

## Non-goals

- Inline edit of school profile (keep on list/create flows)
- Cross-tenant user list with PII
- Guardian/student search
- Module toggles inline (may link to module UI slice — can embed toggles if same page ships together)

## Harness notes

- **Level B:** Vitest for TenantDetail page + MSW for `GET /schools/:id?include=…`; optional RSpec for SchoolBlueprint `:backoffice_detail` view if added in `web/`.
- **Rails gap:** Extend `SchoolBlueprint` or add view with modules, active_school_year, aggregate_counts — minimal fields only.
- **Routes:** Add to `frontend/backoffice/src/routes/paths.ts` and router.
