# Feature slice — Backoffice discarded schools

> Domain: [backoffice-evolution](backoffice-evolution.md) (E2)  
> Parent: BR-BOE06, UC-BOE07  
> Status: draft  
> Wave: **E2**

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with `manage_backoffice_ops` |
| Trigger and precondition | School discarded via `DiscardSchoolService`; `discarded_at` set |
| Observable outcome | "Arquivadas" tab on schools list shows discarded tenants; restore action calls `POST /api/v1/schools/:id/restore`; restored school appears in default tab |
| Adversarial cases | Restore non-discarded → 409; staff cannot see discarded schools in school SPA; double restore idempotent or 409 |
| Non-goals | (see section below) |

## Bar

**Reference:** Soft-delete pattern with operator recovery — standard SaaS ops.  
**Rationale:** Mistaken discard must be reversible without DB console.  
**Recognizably bad:** yes — discard is one-way with no operator UI.

## Acceptance criteria

1. Given discarded school S, when operator opens Arquivadas tab, then S appears with discarded_at date and no active login for school staff until restored.
   → BR-BOE06

2. Given discarded school S, when operator confirms restore, then `POST /api/v1/schools/S/restore` returns 200, S appears on active tab, and staff login works again.
   → UC-BOE07

3. Given active school S, when operator views default schools tab, then S does not appear on Arquivadas tab.
   → [invented]

4. Given backoffice user without `manage_backoffice_ops`, when calling restore API, then 403 forbidden.
   → Permissions table

5. Given restore of S, when complete, then audit row records restore action with actor backoffice.
   → NFR-005

## Non-goals

- Hard delete / GDPR erasure (separate legal process)
- Bulk restore
- Discarded user accounts (identity scope)
- Auto-purge schedule for discarded schools

## Harness notes

- **Level B:** RSpec for restore service + request spec; Vitest tab + confirm dialog.
- **Backend:** `GET /schools?discarded=true` or dedicated route; `POST /schools/:id/restore` inverse of DiscardSchoolService.
- **Default index:** Excludes discarded unless param set.
