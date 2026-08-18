# Feature slice — Backoffice operational dashboard

> Domain: [backoffice-evolution](backoffice-evolution.md) (E1)  
> Parent: [backoffice-evolution.md](backoffice-evolution.md) BR-BOE04, UC-BOE04  
> Status: draft  
> Wave: **E1**

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with `manage_backoffice_ops` |
| Trigger and precondition | Operator lands on `/` or `/dashboard` |
| Observable outcome | Dashboard shows existing onboarding KPIs plus alert widgets: credentials expiring within 30 days, schools with any module disabled, schools stuck in provisioning; each widget links to filtered list or tenant detail |
| Adversarial cases | Empty fleet → empty states; no PII in alert rows (school name + id only) |
| Non-goals | (see section below) |

## Bar

**Reference:** Fintech-first ops need — Cora mTLS cert expiry is production incident driver.  
**Rationale:** E1 completes operator situational awareness without E2 audit API.  
**Recognizably bad:** yes — dashboard only shows school count while certs expire silently.

## Acceptance criteria

1. Given school S with Cora credential `certificate_expires_at` within 30 days, when operator loads dashboard, then "Credenciais expirando" widget lists S with days remaining and link to `/schools/S/bank-credentials` or detail.
   → BR-BOE04

2. Given school S with billing module disabled, when loading dashboard, then "Módulos desativados" widget includes S with indication of which modules are off.
   → BR-BO04 parent

3. Given schools in `onboarding_status == provisioning` older than configurable threshold (default 14 days), when loading dashboard, then provisioning backlog card counts them with link to filtered schools list.
   → [product decision]

4. Given no schools match alert criteria, when loading dashboard, then widgets show empty-state copy without errors.
   → [invented]

5. Given operator clicks alert row for school S, when navigation completes, then destination is tenant detail or credentials page for S only — no cross-tenant data leak in URL params beyond id.
   → NFR-003

## Non-goals

- Cross-tenant analytics charts (E3)
- Real-time websocket updates
- Email/Slack alerting to operators (future ops)
- Dedicated aggregated API in E1 if client composition from `GET /schools` + credential batch is sufficient

## Harness notes

- **Level B:** Vitest for dashboard widgets with MSW fixtures for schools list and credential metadata.
- **Data source:** Prefer composing from existing endpoints in E1; document in API narrative if `GET /platform/ops/summary` added later in E2.
- **Refinement:** E2 credential badges on grid may share helper with dashboard widget.
