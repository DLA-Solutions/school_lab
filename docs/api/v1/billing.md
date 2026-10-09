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
| Guardian portal | **implemented** | Unified pending/overdue/paid list — see below |
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

### Guardian charges — unified list (`GET /schools/:id/me/charges`)

The guardian portal shows one list instead of separate open/history tabs. `GET
/schools/:school_id/me/charges` now returns `pending`, `overdue`, **and** `paid` charges together
(never `cancelled`), always ordered ascending by `due_date`. `status` is driven by the existing
provider webhook → reconciliation flow (`Billing::IngestProviderWebhookService`) — this endpoint
only reads the already-computed column.

Query params (all optional):

| Param | Type | Notes |
|-------|------|-------|
| `student_id` | integer | Narrows to one linked child; unlinked child → `404` |
| `status` | string | One of `pending`, `overdue`, `paid`. Any other value (including `cancelled`) yields an empty result — it never leaks outside the guardian-visible set |
| `due_date_from` | date (ISO 8601) | Inclusive lower bound on `due_date` |
| `due_date_to` | date (ISO 8601) | Inclusive upper bound on `due_date` |

Naming follows the existing `due_date_from`/`due_date_to` convention already used by the staff
billing index (`Api::V1::Schools::Billing::ChargesController`), not the `date_from`/`date_to`
convention used by analytics/audit endpoints.

Response shape — one `ChargeBlueprint` view (`:guardian`) for both list and detail now, with:
`due_date`, `status`, `payment_methods` (`boleto_url`, `pix_copy_paste`), `interest_rate_percent`,
and `paid_at` (`null` until the charge is paid), plus the shared identity/amount fields.

`GET /schools/:id/me/charges/history` **still exists** (paid-only, `:guardian_history` view,
`updated_at desc`) — kept as a legacy route because `mobile/` (React Native) still calls it
directly. It was **not** removed; the web SPA simply stops calling it in favor of the unified
`index` above. Do not remove `history` until `mobile/` migrates off it.

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
