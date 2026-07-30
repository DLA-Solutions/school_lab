# Gherkin Acceptance Criteria

Use **Given / When / Then** (GWT) for every task and issue acceptance criterion. English only.

## Structure

Each scenario must be **specific, testable, and unambiguous**:

```gherkin
### Scenario: [Short outcome name]

**Given** [actor + tenant context + data preconditions]
**And** [additional preconditions as needed]
**When** [single action or trigger]
**Then** [observable outcome]
**And** [additional outcomes]
```

## Quality rules

| Rule | Good | Bad |
|------|------|-----|
| **Concrete actors** | `a school admin with role school` | `a user` |
| **Tenant context** | `school A` with `school_id` scoping | omitting school isolation |
| **Single When** | one API call or user action | multiple unrelated actions |
| **Observable Then** | `response status is 403`, `Charge.count` increases by 1 | `it works correctly` |
| **Named entities** | `charge C with status open` | `some data` |
| **Traceability** | cite `BR-004`, PRD §section | no source link |

## Minimum scenarios per task type

| Phase | Required scenarios |
|-------|-------------------|
| `backend` / `api` | Happy path + unauthorized role + wrong-school isolation (when applicable) + validation error |
| `jobs` | Happy path + idempotent retry + failure/alert path |
| `modeling` / `docs` | Artifact exists + cross-references PRD entities + open questions flagged |
| `discovery` | Decision recorded + downstream tasks unblocked or explicitly still blocked |
| `web-ui` / `app` | Happy path + error/empty state + role guard (when applicable) |

## Mapping to RSpec

GWT scenarios should be implementable as behavior-focused specs (`write-rspec-spec` skill). Avoid implementation details in Then clauses (no "calls Service X") unless testing integration boundaries.

## Examples

### Backend service

```gherkin
### Scenario: School admin creates a charge for an enrolled student

**Given** school S with an active admin membership
**And** student St is enrolled in school S
**And** an active contract exists for St with due day 10
**When** the admin calls `Billing::CreateChargeService` for St for the current billing period
**Then** a charge is persisted with `status: open`
**And** `total_amount` reflects the contract amount minus applied discounts
**And** the charge is scoped to school S (`school_id`)

### Scenario: Teacher cannot create a charge

**Given** school S with a teacher membership for user U
**When** user U attempts to create a charge for a student in school S
**Then** authorization fails (Pundit raises `NotAuthorizedError`)
```

### API endpoint

```gherkin
### Scenario: Guardian lists only their family's charges

**Given** school S with guardian G linked to student St
**And** student St has open charge C1
**And** another family in school S has open charge C2
**When** G sends `GET /api/v1/schools/S/billing/charges`
**Then** the response status is 200
**And** the payload includes C1
**And** the payload does not include C2
```

### Documentation / modeling

```gherkin
### Scenario: DBML reflects PRD billing entities

**Given** approved PRD `docs/prds/fintech-first.md` §7 entity list
**When** `docs/database/database_dml.md` is reviewed
**Then** tables `charges`, `contracts`, `payments`, and `webhook_events` are defined
**And** each tenant-scoped table includes `school_id`
**And** LGPD-sensitive columns are noted in `docs/modeling/001-fintech-first.md`
```

## When GWT is not enough

If behavior depends on an unresolved decision in `open-questions.md`, do **not** write speculative scenarios. Create a `discovery` task or ask the user first.
