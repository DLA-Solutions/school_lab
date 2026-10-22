# API v1 — Billing

> PRDs: [`docs/prds/billing/`](../../prds/billing/)  
> Baseline (implemented): [`fintech-first.md`](fintech-first.md)  
> Modeling: [`docs/modeling/001-fintech-first.md`](../../modeling/001-fintech-first.md)  
> Platform contract: [`platform-and-admin.md`](platform-and-admin.md) — **frozen W1 (4C.1)**  
> Conventions: [`docs/api/README.md`](../README.md)

Full MVP billing domain narrative. **All routes below extend** the fintech-first partner slice;
paths not yet in `web/` return `501` until their wave ships.

---

## School year context

Charge generation and contract scoping align with the active school year per the frozen Platform
contract ([`platform-and-admin.md`](platform-and-admin.md) § Cross-domain contract):

- New charge generation for a cycle resolves the **active** school year via
  `Platform::ActiveSchoolYearService` (or explicit `school_year_id` on future batch routes).
- **Archived** years block new charge generation (`422 archived_school_year`) per BR-SY07.
- Contracts with `enrollment_id` inherit the enrollment's `school_year_id`; legacy student-only
  contracts without enrollment linkage remain a migration concern
  ([`open-questions.md`](../../open-questions.md) § Legacy billing year resolution).
- Optional `?school_year_id=` on delinquency dashboard and summary filters when multi-year views
  ship in billing W2+.

---

## Relationship to fintech-first

| Area | fintech-first status | billing PRD extension |
|------|---------------------|------------------------|
| Charges, boletos, Cora | **implemented** | Adjustments, plan bands, batch pay |
| Guardian portal | **implemented** | Forward-only history (unchanged) |
| Dunning dashboard | **partial** | Summary + filters — régua deferred |
| NFS-e | — | **implemented (BC7 v1)** — [`invoices.md`](../../prds/billing/invoices.md) |
| Card/Pix checkout | stub | W4+ per [`payments.md`](../../prds/billing/payments.md) |

---

## Implemented routes (reference)

See [`fintech-first.md`](fintech-first.md) for request/response examples:

- `GET/POST /schools/:id/billing/charges`
- `POST /billing/charges/:id/issue`, `/reissue`, `/cancel`
- `GET /billing/summary`
- `GET /schools/:id/me/charges` (guardian)
- `school_payment_providers`, `school_billing_settings`
- Webhooks: `POST /webhooks/:provider/:token`

---

## Expected payments by class report (implemented)

A printable PDF for the school dashboard's "Novo relatório" button: per class, each child, their
guardians and the monthly amount their contract expects, with a subtotal per class and a grand
total. Not paginated; there is no JSON body on success.

| | |
|---|---|
| Request | `GET /api/v1/schools/:school_id/billing/reports/expected_payments` |
| Auth | Bearer JWT, staff membership of `:school_id` |
| Permission | `manage_billing` (`ExpectedPaymentsReportPolicy#show?`). `view_billing_summary` alone is **not** enough: that permission unlocks dashboard aggregates, this report exposes each family's figure |
| Module gate | `billing` module must be enabled (`403 module_disabled` otherwise) |

Query params (all optional):

| Param | Values | Default |
|-------|--------|---------|
| `school_class_id` | A class of this school. Another school's class, or a discarded class, is `404` | every class |
| `status` | Student status: `active`, `transferred` or `all`. Discarded students are never listed | `active` |
| `columns` | Comma-separated keys, drawn in the report's own order; unknown keys are dropped | `student,guardians,expected_amount` |

Column keys: `student` (Estudante), `guardians` (Responsáveis, the payer marked "(pagador)"),
`plan` (Plano), `signature_status` (Assinatura), `expected_amount` (Valor previsto (mensal)).
Subtotal and grand total are drawn only when `expected_amount` is selected. Guardian CPF is never
printed, whatever `columns` asks for.

Success: `200`, `Content-Type: application/pdf`, `Content-Disposition: attachment`, filename
`valores-previstos-<school-name-parameterized>-<YYYY-MM-DD>.pdf`. A caller should save the
response as a blob (the SPA's students/guardians reports do the same).

Errors (standard `{ error: { code, message, details } }` envelope):

- `401` — no/invalid token.
- `403 forbidden` — guardian, or staff without `manage_billing`; `403 module_disabled`.
- `404 not_found` — school the caller does not belong to, or a `school_class_id` outside it.
- `422 validation_error` — unknown `status`, or a name the PDF font cannot draw.

### Expected amount rule

One definition, shared with the dashboard's `average_ticket.total_monthly_cents` and with charge
generation and the contract template (`Billing::ContractTuitionAmounts`): what the contract
**agrees the family pays** per month, not the plan's list price.

```
Contract.expected_tuition (kept, status = active, signature_status != cancelled)
one contract per child (see below), then
amount = plan_discount present and plan has a price -> plan price less the discount band
                                                       (100% "Bolsa integral" = 0)
         otherwise                                  -> COALESCE(negotiated_amount_cents,
                                                                billing_plan.base_amount_cents, 0)
```

- **One contract per child, never a sum.** Each report row is one child and shows only that
  child's own agreed figure; nothing is added across children or across a child's contracts. The
  rule lives in `Billing::ExpectedTuitionContracts` and is shared with the dashboard, so the
  report's grand total equals `average_ticket.total_monthly_cents`:
  1. contracts with `signature_status = cancelled` (called off before signing, usually reissued)
     are not agreements and never count;
  2. if a child still has several eligible contracts, the one whose `starts_on`..`ends_on` window
     covers today counts (an absent bound is open); otherwise any of them; among those left, the
     most recent (highest id);
  3. a child left with more than one eligible contract is **flagged**, not hidden: the amount is
     printed with `*` and a footnote at the end says how many students have more than one active
     contract. The school should end or discard the duplicate (charge generation still bills
     every `Contract.active`).
- Punctuality (early-payment) discounts are **not** in this amount; the dashboard shows them
  separately (see below).
- A child with no active contract is listed as "Sem contrato" and adds nothing to the total.
- Students without a class (or whose class was discarded) are printed last under "Sem turma".
- Contracts awaiting signature (`pending_signature`) count like signed ones, as the dashboard
  counts them; contracts whose signature was cancelled do not. Use the `signature_status` column
  to see them.
- Money is formatted in BRL (`R$ 1.234,56`) inside the PDF only. Any future JSON form of this
  report must carry `amount_cents` as integer cents.

---

## School dashboard: average ticket (implemented)

`GET /api/v1/schools/:school_id/dashboard` (`?month=YYYY-MM`). The billing block
(`average_ticket`, `monthly_revenue`, ...) is returned only to staff with the dashboard billing
permission. `average_ticket` is the **agreed** ticket: what the active contracts say families pay,
after scholarships (bolsa), discount bands and negotiated amounts, in integer cents.

```json
"average_ticket": {
  "value": 80000,
  "previous": 80000,
  "change_percent": 0.0,
  "is_up": true,
  "total_monthly_cents": 80000,
  "students": 1,
  "punctuality_value": 72000,
  "punctuality_total_monthly_cents": 72000,
  "punctuality_percent": 10.0
}
```

| Field | Meaning |
|-------|---------|
| `total_monthly_cents` | Sum, over **active, non-discarded students**, of each student's one counted contract's agreed monthly tuition (rules above: signature-cancelled contracts excluded, one contract per student, never summed). Contracts that are not `active` or are discarded, contracts of students who are discarded or no longer `active`, and other schools' contracts are excluded |
| `students` | Active, non-discarded students |
| `value` | `total_monthly_cents / students`, rounded to the cent; `0` with no students. Always contract-based, whether or not the month's charges exist yet |
| `punctuality_total_monthly_cents` | The same sum if **every** family earns the punctuality discount. The discount is computed **per contract** and rounded to the cent (the same rounding as the contract template's `contrato.pontualidade.desconto`), then summed - it is not applied to the grand total. It stacks on the already-agreed amount (a 20% band then 10% punctuality is 72% of the table price) |
| `punctuality_value` | `punctuality_total_monthly_cents / students`; `0` with no students |
| `punctuality_percent` | The percentage actually applied: the school's `school_billing_settings.early_payment_discount_percent`, **or 10.0 when the school has not configured one** (platform default, `SchoolBillingSettings::DEFAULT_EARLY_PAYMENT_DISCOUNT_PERCENT`) |
| `previous`, `change_percent`, `is_up` | Contracts have no history, so `previous` is the average tuition **charged** per contract in the month before the reference month when that month has tuition charges, and equal to `value` (0%, `is_up: true`) otherwise. `change_percent` is `0.0` when `previous` is `0` |

---

## Planned extensions (W2–W6)

### Charges & contracts

| Method | Path | Wave |
|--------|------|------|
| `POST` | `/billing/charges/:id/adjust` | W2 |
| `GET` | `/billing/contracts` | W2 |
| `POST` | `/billing/charge_generations` | W2 — manual fan-out |

### Payments

| Method | Path | Wave |
|--------|------|------|
| `POST` | `/billing/charges/:id/pay_manual` | W3 |
| `POST` | `/billing/payment_links` | W4 — Pix/card gateway |

### Dunning (MVP scope)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/billing/delinquency` | Dashboard — **MVP** |
| `PATCH` | `/billing/notification_policy` | Policy config only — no auto-send |
| — | régua builder | **Deferred** post-MVP |

### Settings

| Method | Path | Notes |
|--------|------|-------|
| `PATCH` | `/billing/settings` | Mora, multa, pontualidade — partial in fintech-first |

### Annual tax declarations (BC8 — draft narrative; executable OpenAPI pending)

Billing owns the calculation. One logical declaration exists per payer `guardian_id`, school, and
closed Gregorian calendar year; immutable versions consolidate all children whose eligible charges
that payer actually settled. Purpose eligibility is captured on each charge when created, so later
school configuration changes do not rewrite historical classification.

Guardian routes:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/me/tax_declarations` | Own annual aggregates and active version metadata |
| `POST` | `/me/tax_declarations` | Idempotently ensure `calendar_year` is generated |
| `GET` | `/me/tax_declarations/:tax_declaration_id` | Aggregate detail with active version metadata |
| `GET` | `/me/tax_declarations/:tax_declaration_id/versions` | Immutable version list |
| `GET` | `/me/tax_declarations/:tax_declaration_id/versions/:version_id` | Exact version detail |
| `GET` | `/me/tax_declarations/:tax_declaration_id/versions/:version_id/pdf` | Family-scoped PDF for that exact version |

Staff configuration:

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/billing/purposes` | List/create school billing purposes |
| `PATCH` | `/billing/purposes/:id` | Configure eligibility for future charges |
| `GET/PATCH` | `/billing/tax_declaration_settings` | Approved legal text/signatory/release gate |

`POST /me/tax_declarations` body:

```json
{ "tax_declaration": { "calendar_year": 2025 } }
```

It returns `200` when the stored calculation/configuration digest is unchanged and `201` when the
first or a corrected version is created. `:tax_declaration_id` is the logical aggregate id;
`:version_id` is the child `tax_declaration_versions.id`, never its sequential number. Responses
carry both `tax_declaration_id` and `active_version_id`. Version lifecycle is computed as `active`
when those ids match and `superseded` otherwise; version rows are append-only and have no lifecycle
status column.

Selection uses immutable confirmed `payments.paid_at`, matching `charges.guardian_id` and captured
`charges.tax_declaration_eligible`. Each source line declares
`paid_amount_cents - fine_amount_cents - interest_amount_cents`: settled principal after discounts
only. Discounts are not added back; fine and interest are always excluded by conservative product
decision pending legal/accounting approval. It does not use due dates, billing periods, current
settings, descriptions, or `school_transactions`.

Each immutable item stores `source_paid_amount_cents`, `source_fine_amount_cents`,
`source_interest_amount_cents`, and their non-negative `declared_principal_amount_cents`; the PDF
total sums only the final field. Each version also snapshots the approved settings version, legal
text version, one signatory, eligible-purpose configuration/digest, and approval actor/time.

After an authorized exact-version PDF response succeeds, the API appends a
`tax_declaration_access_events` row and emits `TaxDeclarationPdfDownloaded`, both idempotently keyed
by request UUID. Audit payloads contain resource/actor ids and timestamps only—no CPF, student
names, amounts, or payment lines.

Errors:

- `404 not_found` — cross-school/family aggregate/version/PDF, unknown version, or version not
  nested under the requested aggregate.
- `409 generation_in_progress` — the same payer/year is already calculating.
- `422 calendar_year_not_closed` — current/future year.
- `422 no_eligible_payments` — create no empty document.
- `422 tax_declaration_configuration_incomplete` — legal/accounting approval, school CNPJ,
  payer CPF, legal text, or signatory missing.
- `422 unclassified_legacy_charge` — candidate payment has no verified purpose snapshot.

Release remains blocked until legal/accounting approval of eligible purposes, provisional
tuition/enrollment defaults, principal-after-discounts/excluded-fee rule, wording, the single
configured `document_signatory_id`, and retention.

### NFS-e / Service invoices (BC7)

Modeling: [`010-service-invoices.md`](../../modeling/010-service-invoices.md).

Staff routes (under `schools/:school_id/billing`):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/fiscal/supported_cities` | Proxy Spedy city search (`query`, `state`, `code`) |
| `GET` | `/fiscal_settings` | School NFS-e configuration |
| `PATCH` | `/fiscal_settings` | Update settings; validates city against Spedy when changed |
| `GET` | `/fiscal_credentials` | Active Spedy provider row (masked api_key) |
| `POST` | `/fiscal_credentials` | Register Spedy api_key (supersedes previous active row) |
| `POST` | `/fiscal_credentials/certificate` | Upload A1 certificate (.pfx) to Spedy |
| `GET` | `/service_invoices` | Paginated staff list |
| `GET` | `/service_invoices/:id` | Detail |
| `GET` | `/service_invoices/:id/pdf` | Authorized PDF download |

Guardian routes (`schools/:school_id/me`):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/service_invoices` | Family-scoped list |
| `GET` | `/service_invoices/:id/pdf` | Family-scoped PDF |

`PATCH /fiscal_settings` body (partial):

```json
{
  "fiscal_settings": {
    "enabled": true,
    "issuance_city_name": "Goiânia",
    "issuance_state": "GO",
    "spedy_city_code": 5208707,
    "federal_service_code": "8.01",
    "cnae_code": "8513900",
    "iss_rate_percent": "5.0",
    "service_description": "Mensalidade escolar"
  }
}
```

Errors:

- `422 validation_error` — incomplete guardian data would block issuance (BR-I08 preview), invalid
  Spedy city (BR-I06), or incomplete fiscal codes when enabling.
- `422 fiscal_configuration_incomplete` — `enabled: true` without credentials or certificate at Spedy.
- `404 not_found` — cross-school or cross-family access.
- `409 generation_in_progress` — not used for NFS-e (reserved).

Webhook: `POST /webhooks/spedy/:token` — account-level; token matches `SPEDY_WEBHOOK_TOKEN`.
School resolved from `spedy_company_id` or issuer CNPJ in payload.

---

### NFS-e (legacy placeholder — removed)

The former `POST /billing/invoices/nfs_e` stub is superseded by automatic issuance on payment
confirmation and the routes above.

---

## Resend boleto

Absorbed from [`fintech-first/resend-boleto.md`](../../prds/fintech-first/resend-boleto.md) into
[`boletos.md`](../../prds/billing/boletos.md) — `POST /billing/charges/:id/resend_notification`.

---

## Taxonomy note

`billing.build_dunning_workflow` and `billing.send_payment_reminder` remain MVP in
[`capability-map.md`](../../product/capability-map.md) with **product override**: platform régua
deferred Aug 2026; overdue detection + dashboard ship in MVP.

---

## OpenAPI tags

`Billing`, `Tax Declarations`, `Guardian Me`, `Webhooks`
