# Feature slice — Backoffice advanced search

> Domain: [backoffice-evolution](backoffice-evolution.md) (E2)  
> Parent: UC-BOE06, UC-BO04 extension  
> Status: draft  
> Wave: **E2**

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with `manage_backoffice_ops` |
| Trigger and precondition | Schools index endpoint extended with query params |
| Observable outcome | Schools list filters by `q` (name/CNPJ partial), `saas_plan`, `created_after`, `created_before`, existing `onboarding_status`; URL query string sync; pagination preserved |
| Adversarial cases | Empty q → full list; invalid date → 422; SQL injection via q blocked; CNPJ normalized client-side |
| Non-goals | (see section below) |

## Bar

**Reference:** Operator fleet grows beyond scroll-and-find.  
**Rationale:** Tenant overview UC-BO04 requires usable filters at scale.  
**Recognizably bad:** yes — only client-side filter on first page of results.

## Acceptance criteria

1. Given schools "Escola Alpha" and "Escola Beta", when operator sets `q=Alpha`, then list shows only Alpha and URL contains `?q=Alpha`.
   → UC-BOE06

2. Given schools with different platform plans, when filtering `saas_plan=starter` (legacy
   query name), then only schools whose **kept** `platform_subscriptions` plan key matches appear
   (not `schools.saas_plan` as source of truth).
   → UC-BOE06 / BR-PSB14 — E3 catalog keys `starter` / `pro` / `enterprise`

3. Given operator sets `created_after=2026-01-01`, when applying filter, then only schools created on or after that date appear.
   → UC-BOE06

4. Given operator combines `onboarding_status=provisioning&q=Escola`, when loading page, then both filters apply (AND semantics).
   → [invented]

5. Given operator shares URL with query params, when another backoffice user opens link, then same filtered result set loads.
   → [invented]

## Non-goals

- Full-text search across audit or user tables
- Saved filter presets
- Export search results
- Elasticsearch — SQL ILIKE sufficient for E2 fleet size

## Harness notes

- **Level B:** RSpec `SchoolsController#index` filter specs; Vitest schools list filter component.
- **Backend:** Extend existing `GET /api/v1/schools` — no new resource.
- **UI:** Schools.tsx filter bar + react-router searchParams sync.
