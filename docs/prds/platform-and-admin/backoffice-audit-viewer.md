# Feature slice — Backoffice audit viewer

> Domain: [backoffice-evolution](backoffice-evolution.md) (E2)  
> Parent: BR-BOE05, UC-BOE05  
> Status: draft  
> Wave: **E2**

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with `manage_backoffice_ops` |
| Trigger and precondition | Audited gem populates `audits` table; new `GET /api/v1/platform/audits` endpoint |
| Observable outcome | Read-only paginated table at `/audits` with columns: timestamp, school_id, actor, action, auditable type, changed keys summary; filters: school_id, action, date_from, date_to |
| Adversarial cases | Non-backoffice → 403; filter injection sanitized; no CSV/export button; audit rows with PII in `audited_changes` display redacted or key names only |
| Non-goals | (see section below) |

## Bar

**Reference:** NFR-005 audit requirement for on-behalf-of ops  
**Rationale:** Operators need cross-tenant visibility without database access.  
**Recognizably bad:** yes — module toggles audited in DB but no UI to investigate incidents.

## Acceptance criteria

1. Given backoffice user B, when opening `/audits` without filters, then paginated audit rows appear newest-first with page/per_page from Pagy.
   → BR-BOE05

2. Given audits for schools S1 and S2, when B filters `school_id=S1`, then only S1 rows appear.
   → NFR-003

3. Given audit viewer page, when B searches UI for "export" or "download CSV", then no bulk export control exists.
   → BR-BOE05, NFR-003

4. Given backoffice user B, when opening `/audits?action=update&date_from=2026-01-01`, then URL is shareable and results match API query params.
   → UC-BOE05

5. Given school staff user, when requesting `GET /api/v1/platform/audits`, then response is 403 `backoffice_only`.
   → BR-BO01 parent

## Non-goals

- Per-school audit API for school staff (identity/documents domains own exports)
- Real-time audit stream
- Audit row diff UI for large JSON blobs (summary only MVP)
- Write/delete audit records

## Harness notes

- **Level B:** RSpec request spec for `Platform::AuditsController` + Pundit; Vitest for Audits page with MSW.
- **LGPD:** Serializer redacts email/CPF in `audited_changes` values for display; full values remain in DB for compliance retention policy.
- **Backend:** New controller under `/api/v1/platform/audits`; policy `manage_backoffice_ops`.
