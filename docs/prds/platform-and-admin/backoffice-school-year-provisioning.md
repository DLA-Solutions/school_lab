# Feature slice — Backoffice school year provisioning

> Domain: [backoffice-evolution](backoffice-evolution.md) (E1)  
> Parent: [school-year.md](school-year.md) UC-SY01, [backoffice.md](backoffice.md) UC-BO02  
> Status: draft  
> Wave: **E1**

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with `provision_school` during `onboarding_status == provisioning` |
| Trigger and precondition | School S in provisioning; no active school year yet (typical greenfield) |
| Observable outcome | Wizard step creates draft year with template periods, activates year, checklist marks school year step complete, audit includes `on_behalf_of: school_id` |
| Adversarial cases | Activate without periods → 422; staff without provision_school cannot create via backoffice; guardian blocked on all year routes |
| Non-goals | (see section below) |

## Bar

**Reference:** Proesc implantação — first exercício configured during onboarding  
**Rationale:** Operator must finish white-glove onboarding without switching to school SPA as fake director.  
**Recognizably bad:** yes — wizard completes but school has no active year → downstream 422 on enrollments/charges.

## Acceptance criteria

1. Given provisioning school S and backoffice user with `provision_school`, when operator completes wizard "Ano letivo" step with name "2026", dates, and template `trimester`, then `POST /api/v1/schools/S/school_years` returns 201 with draft year and three periods, and `POST …/activate` returns 200 with `status: active`.
   → BR-BOE02, BR-SY04, BR-SY06

2. Given activated year for S, when operator views provisioning checklist or SchoolActivation page, then school year item is marked complete.
   → UC-BO02 flow extension [invented]

3. Given provisioning school S, when backoffice activates year, then audit log contains actor backoffice and school_id S (on_behalf_of).
   → identity BR-O04, NFR-005

4. Given school S with an active year already, when operator opens wizard year step, then UI shows existing active year summary and skips create or warns before second activate attempt.
   → BR-SY01 [product decision]

5. Given operator submits invalid dates (ends_on before starts_on), when submitting wizard step, then UI shows validation errors from API `422 validation_error` without silent failure.
   → BR-SY02

## Non-goals

- Editing periods after activate (school staff `/app` responsibility)
- Year rollover for existing mature tenants
- Holiday entry in wizard (optional follow-up)
- Archive prior year during first activate (N/A for greenfield)

## Harness notes

- **Level B:** Vitest for wizard step component with MSW mocking school_years endpoints; RSpec school_years request specs (W1 frozen) remain reference.
- **Integration:** ProvisioningWizard.tsx new step; SchoolActivation.tsx checklist update.
- **API:** Uses frozen W1 routes under `/api/v1/schools/:school_id/school_years` — no new backend routes required for happy path.
