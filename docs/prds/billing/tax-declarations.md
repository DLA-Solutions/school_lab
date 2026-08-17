# PRD — Billing: Annual Tax Declarations (BC8)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `raw:proesc:billing.export_imprimir_a_declaracao_de_quita` (adjacent evidence); School Lab calculation rules are product decisions  
> Related BCs: [`charges.md`](charges.md), [`payments.md`](payments.md), [`settings.md`](settings.md), [`guardian-portal.md`](guardian-portal.md)  
> Modeling: [`docs/modeling/001-fintech-first.md`](../../modeling/001-fintech-first.md)  
> API: [`docs/api/v1/billing.md`](../../api/v1/billing.md)

---

## Objective

Automatically produce one annual income-tax declaration aggregate per **payer guardian, school, and
calendar year**, consolidating all children whose eligible charges that payer actually settled,
with immutable calculation versions, PDF, verification, and audit.

---

## Context

The declaration is a billing calculation, not a generic archive certificate. Billing owns
eligibility, settled-amount selection, corrections, and versioning. Documents/archive may store or
index the final PDF, but must not recalculate it.

This is a self-service flow: no manual school request is required. The annual scheduler and the
guardian generation endpoint call the same idempotent service. Product UI uses **Responsável**;
technical payer identity is `guardian_id`.

**Release gate:** Brazilian legal/accounting review must approve eligible billing purposes,
declaration wording, signatory requirements, and retention. Engineering must not infer tax
eligibility.

---

## Competitive grounding

No canonical corpus capability describes this exact payer/year calculation. Proesc documents
guardian/student-portal issuance of a tax/payment declaration under
`raw:proesc:billing.export_imprimir_a_declaracao_de_quita`; see
[`catalogo-funcionalidades.md`](../../ref/catalogo-funcionalidades.md) and
[`proesc/gestao-financeira/funcionalidades-por-ator.md`](../../ref/proesc/gestao-financeira/funcionalidades-por-ator.md).
That is grounding for self-service availability only. Payer consolidation, amount composition,
versioning, release gates, and routes are School Lab `[product decision]`.

---

## Actors and surfaces

| Actor | Surface | Actions |
|-------|---------|---------|
| guardian payer (UI: **Responsável**) | Web first; mobile parity later | List years/versions, ensure automatic generation, view, download PDF |
| staff with `manage_billing` | Web SPA/API | Configure eligible billing purposes and declaration identity/signatory |
| system | Solid Queue/API | Generate after calendar-year close and regenerate idempotently after approved corrections |

---

## Segment applicability

Applies to `infantil` and `fundamental_medio`. `pj_financeiro` is out of MVP: the payer is a
guardian person identified by CPF. Multi-unit groups remain isolated per `school_id`; there is no
cross-school consolidated declaration.

---

## Business Rules

BR-TD01 — logical uniqueness

Exactly one `tax_declaration` aggregate exists per `(school_id, guardian_id, calendar_year)`.
Corrections create immutable numbered versions under that aggregate; they never create a second
logical declaration for the same payer/year.

BR-TD02 — payer ownership and consolidation

The payer is the `guardian_id` captured on each charge. The declaration consolidates all students
on eligible charges paid by that guardian in the selected school/year. Family relationship alone
does not include a payment, and another guardian's payment never appears even when both guardians
are linked to the same child.

BR-TD03 — calendar-year calculation

Include immutable confirmed `payments` whose `paid_at` falls within the requested Gregorian
calendar year in the school's timezone. For each payment, the declared amount is **settled
principal after discounts only**:

`declared_principal_amount_cents = paid_amount_cents - fine_amount_cents - interest_amount_cents`.

The value must be non-negative. Discounts remain reflected in the lower settled principal and are
never added back. Fine and interest are always excluded from the declared total under this
conservative product decision, even if counsel later approves additional billing purposes. Due
date, billing period, invoice face value, unpaid/cancelled charges, and management-ledger
`school_transactions` do not determine the total. Legal/accounting approval of this amount rule and
eligible purposes remains a release gate.

BR-TD04 — eligible billing purposes

Each school configures which `billing_purposes` are tax-declaration eligible. `tuition` and
`enrollment` are seeded as **provisional defaults** only; they remain disabled for release until
legal/accounting approval. Material, activity, transport, meal, fine, interest, and other purposes
default ineligible unless counsel explicitly approves them.

BR-TD05 — immutable charge classification

Every new charge captures `billing_purpose_id`, `billing_purpose_code`, and
`tax_declaration_eligible` at creation. Later purpose/configuration changes do not reclassify that
charge. Legacy charges without a verified purpose are excluded and surfaced as a configuration
error rather than guessed from description or plan name.

BR-TD06 — configuration prerequisites

Generation requires school legal name/CNPJ, payer name/CPF, approved legal text version, and an
active school declaration signatory. Missing or invalid identity/configuration creates no empty or
partial declaration and returns a structured error.

BR-TD07 — automatic and idempotent generation

After a calendar year closes, the system automatically enqueues generation for payers with at
least one eligible settled payment. `POST /me/tax_declarations` is an idempotent "ensure generated"
fallback using the same service. If the calculation/configuration digest matches the active version,
return it; otherwise create the next version and supersede the prior version.

BR-TD08 — immutable traceability

Each version snapshots school legal identity, payer identity, approved legal text plus its version,
exactly one signatory's id/name/title, `tax_declaration_settings.configuration_version`, the
approved eligible-purpose configuration/digest and its approval actor/time, totals per student and
purpose, and every source payment/charge.
Purpose eligibility evidence comes from the immutable
`charges.billing_purpose_code`/`tax_declaration_eligible` classification captured at charge
creation; a mutable live `billing_purposes` row is never used to reinterpret history. Published
versions and PDFs are append-only. A version row has no mutable lifecycle status: `active` is
derived when `tax_declarations.active_version_id == tax_declaration_versions.id`; every other
version under that aggregate is derived as `superseded`. Generation failures create
operational/audit errors, never failed version rows.

BR-TD09 — no empty document

When no eligible settled payments exist, return `422 no_eligible_payments` and create no aggregate,
version, or PDF.

BR-TD10 — access and audit

Guardian list/detail/PDF routes scope to `Current.guardian` in the active school; cross-family or
cross-school ids return `404`. Generation/configuration/version supersession and PDF download are
audited. Every successful PDF response appends one `tax_declaration_access_events` row with the
aggregate/version, guardian, actor user, request UUID, and timestamp, then emits
`TaxDeclarationPdfDownloaded` keyed by that request UUID. The event carries ids only—never CPF,
student names, amounts, or line items. Denied/not-found probes may use redacted security logs but
must not create a misleading successful-download event.

---

## Use Cases

### UC-TD01 — Configure eligible purposes

1. Staff with `manage_billing` creates/updates school billing purposes.
2. Staff explicitly sets future-charge eligibility after acknowledging legal ownership.
3. Approval stores the selected purpose-configuration digest, approval actor/time, and increments
   `tax_declaration_settings.configuration_version`.
4. Existing charge snapshots remain unchanged.

### UC-TD02 — Ensure annual declaration

Input: `calendar_year`.

1. Validate that the year has ended in school timezone and configuration is complete.
2. Select payments by `paid_at`, school, payer `guardian_id`, and captured eligible purpose.
3. Subtract each payment's bank-reported fine and interest, reject a negative result, and group the
   remaining principal-after-discounts by student and purpose while preserving source lines.
4. Compute digest. Return current version if unchanged; otherwise create the next immutable version
   and PDF.

### UC-TD03 — Automatic annual generation

After year close, a retry-safe job invokes UC-TD02 for each payer with candidate payments.
Per-payer failure does not block others and is observable through redacted operational logs,
metrics, alerts, and audit events. A staff-facing failure-inspection endpoint is not in this MVP
contract.

### UC-TD04 — Download as Responsável

List logical declarations and active version metadata, list/read a version by its explicit child
resource id, and download that exact version's PDF. Superseded versions may be shown with correction
notice but remain auditable.

---

## API

Base: `/api/v1/schools/:school_id`

| Method | Path | Actor | Purpose |
|--------|------|-------|---------|
| `GET` | `/me/tax_declarations` | guardian | List own annual aggregates and active versions |
| `POST` | `/me/tax_declarations` | guardian | Ensure generation for `calendar_year` |
| `GET` | `/me/tax_declarations/:tax_declaration_id` | guardian | Aggregate detail with active version metadata |
| `GET` | `/me/tax_declarations/:tax_declaration_id/versions` | guardian | List immutable versions under that aggregate |
| `GET` | `/me/tax_declarations/:tax_declaration_id/versions/:version_id` | guardian | Exact immutable version detail |
| `GET` | `/me/tax_declarations/:tax_declaration_id/versions/:version_id/pdf` | guardian | PDF bytes for that exact family-scoped version |
| `GET` | `/billing/purposes` | staff | List purpose eligibility |
| `POST` | `/billing/purposes` | staff | Create school purpose |
| `PATCH` | `/billing/purposes/:id` | staff | Configure future-charge eligibility |
| `GET` | `/billing/tax_declaration_settings` | staff | Read legal text/signatory configuration |
| `PATCH` | `/billing/tax_declaration_settings` | staff | Update approved configuration |

Ensure-generation request:

```json
{ "tax_declaration": { "calendar_year": 2025 } }
```

Response `200` for unchanged/current or `201` for first/new version:

```json
{
  "data": {
    "tax_declaration_id": 81,
    "calendar_year": 2025,
    "active_version_id": 94,
    "version": {
      "id": 94,
      "number": 2,
      "lifecycle": "active",
      "supersedes_version_id": 88,
      "total_declared_principal_amount_cents": 2450000,
      "issued_at": "2026-01-08T14:00:00Z",
      "students": [
        {
          "student_id": 42,
          "student_name": "Student",
          "declared_principal_amount_cents": 2450000
        }
      ],
      "pdf_url": "/api/v1/schools/7/me/tax_declarations/81/versions/94/pdf"
    }
  }
}
```

`:tax_declaration_id` always identifies the logical `(school, payer, calendar_year)` aggregate.
`:version_id` always identifies a `tax_declaration_versions.id` that must belong to that aggregate;
it is never the sequential version number. `lifecycle` is a computed response field: `active` when
the version id equals aggregate `active_version_id`, otherwise `superseded`. List responses use
`{ data, meta }`; aggregate/version responses use `{ data }`. PDF routes return bytes and never
recalculate.

---

## Errors

| Status | Code | Meaning |
|--------|------|---------|
| `403` | `forbidden` | Wrong role or missing `manage_billing` |
| `404` | `not_found` | Cross-school/family, unknown aggregate/version, or version not under the aggregate |
| `409` | `generation_in_progress` | Same payer/year is currently being generated |
| `422` | `calendar_year_not_closed` | Current/future year cannot be declared |
| `422` | `no_eligible_payments` | No qualifying settled payment; no empty PDF created |
| `422` | `tax_declaration_configuration_incomplete` | Missing CNPJ, CPF, legal text, signatory, or legal approval |
| `422` | `unclassified_legacy_charge` | Candidate payment references a charge without verified purpose |

---

## Database

| Entity | Purpose |
|--------|---------|
| `billing_purposes` | School-owned purpose and future-charge eligibility |
| charge classification fields | Immutable purpose code and eligibility captured when charge is created |
| `tax_declaration_settings` | School legal text/signatory and approval state |
| `tax_declarations` | One logical payer/school/calendar-year aggregate |
| `tax_declaration_versions` | Append-only calculation, identity, wording, digest, PDF/version metadata; no stored active/superseded status |
| `tax_declaration_items` | Payment/charge/student/purpose traceability, including paid/fine/interest components and declared principal |
| `tax_declaration_access_events` | Append-only successful PDF-download access audit keyed by request UUID |

Executable definitions: [`schema.dbml`](../../database/schema.dbml).

---

## Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `TaxDeclarationGenerated` | New active version | Audit/optional guardian notification |
| `TaxDeclarationSuperseded` | Correction creates next version | Audit/correction notice |
| `TaxDeclarationGenerationFailed` | Automatic generation fails | Staff operations |
| `TaxDeclarationPdfDownloaded` | Exact version PDF successfully delivered; idempotency key `request_uuid` | Access audit/observability |

---

## Permissions

| Action | guardian | `manage_billing` staff |
|--------|----------|------------------------|
| list/show/PDF | own payer + active school | no MVP product route |
| ensure generation | own payer + closed year | operational retry |
| configure purposes/settings | no | yes |

---

## Non-functional requirements

- NFR-001: digest-based idempotency, immutable payment facts/snapshots, retry-safe annual jobs.
- NFR-002: CPF and child/payment details minimized; strict family isolation; download audit.
- NFR-003: every entity and query is `school_id` scoped; no cross-school consolidation.
- NFR-005: configuration, generation, supersession, and downloads are observable/audited.
- PDF must be accessible and deterministic from the stored snapshot, never recalculated on download.

---

## Acceptance Criteria

AC-TD01

- [ ] Given one payer settled eligible charges for two children in 2025, when generation runs,
      then one declaration aggregate/version consolidates both children and lists each payment.
- Source: stakeholder "Imposto de renda" requirement `[product decision]`

AC-TD02

- [ ] Given another guardian paid a charge for the same child, when the first guardian generates,
      then the other payer's payment is absent.
- Source: NFR-002/payer ownership `[product decision]`

AC-TD03

- [ ] Given an eligible tuition settlement of 1,030.00 containing 1,000.00 principal after
      discounts, 10.00 fine, and 20.00 interest, plus an ineligible material payment, when
      generation runs, then exactly 1,000.00 contributes to the declaration and the fine, interest,
      and material payment contribute zero.
- Source: legal-gated School Lab calculation `[product decision]`

AC-TD04

- [ ] Given unchanged inputs/configuration, when generation is requested again, then the current
      version is returned and no duplicate PDF/version is created.
- Source: NFR-001 `[product decision]`

AC-TD05

- [ ] Given an approved payment correction changes the total, when generation runs again, then a
      new version supersedes the prior version without mutating it.
- Source: NFR-001/NFR-005 `[product decision]`

AC-TD06

- [ ] Given no eligible settled payments, when generation is requested, then `422
      no_eligible_payments` is returned and no empty document is stored.
- Source: `[product decision]`

AC-TD07

- [ ] Given another family or school requests a declaration id/PDF, then the API returns `404`.
- Source: NFR-002/NFR-003 `[product decision]`

AC-TD08

- [ ] Given aggregate 81 has versions 88 and 94 and `active_version_id = 94`, when either version is
      read, then 94 reports computed lifecycle `active`, 88 reports `superseded`, and neither
      version row is updated to store that lifecycle.
- Source: NFR-001 append-only versioning `[product decision]`

AC-TD09

- [ ] Given version 94 belongs to aggregate 81, when its detail or PDF is requested, then only
      `/me/tax_declarations/81/versions/94[(/pdf)]` resolves; using aggregate 82 or sequential
      version number `2` as `:version_id` returns `404`.
- Source: API resource identity `[product decision]`

AC-TD10

- [ ] Given an authorized guardian downloads version 94 with request UUID R, when delivery
      succeeds, then exactly one access-event row and one `TaxDeclarationPdfDownloaded` event
      reference aggregate 81/version 94 and R without CPF, names, amounts, or line items.
- Source: NFR-002/NFR-005 `[product decision]`

---

## Open items / release blockers

- [ ] Legal/accounting approval of eligible purpose taxonomy, provisional tuition/enrollment
      defaults, and the conservative principal-after-discounts calculation that always excludes
      fine and interest.
- [ ] Approved declaration wording, signatory qualification, school CNPJ presentation, and payer
      CPF requirements.
- [ ] Fiscal/LGPD retention period for versions, PDFs, line items, and download audit.
- [ ] Whether superseded versions remain downloadable to guardians or staff/audit only.

---

## Out of Scope

- NFS-e issuance, tax filing, tax advice, deductible eligibility inference, or Receita Federal
  submission.
- Cross-school or corporate-payer consolidated declarations.
- Management-ledger (`school_transactions`) based calculations.
- Mobile delivery before web/API acceptance.
