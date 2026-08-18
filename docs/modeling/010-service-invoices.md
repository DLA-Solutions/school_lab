# Data Model — Service Invoices / NFS-e (010)

> PRD: [`docs/prds/billing/invoices.md`](../prds/billing/invoices.md)  
> Executable schema: [`docs/database/schema.dbml`](../database/schema.dbml)  
> API: [`docs/api/v1/billing.md`](../api/v1/billing.md)

Narrative DSL for NFS-e issuance via Spedy. Authoritative schema for migrations is DBML.

## Entity groups

### Fiscal configuration

| Table | Role |
|-------|------|
| `school_fiscal_settings` | Per-school NFS-e parameters — city, codes, ISS, enabled gate |
| `school_payment_providers` | Spedy credentials (`instrument: service_invoice`, `api_key`, `settings.spedy_company_id`) |

### Issuance

| Table | Role |
|-------|------|
| `service_invoices` | One row per payment — business fiscal document lifecycle (AASM) |
| `service_invoice_attempts` | Provider HTTP attempts — idempotency, errors (mirrors `charge_issuances`) |

## State machine — `service_invoices`

```
pending → enqueued → authorized
                  ↘ rejected
                  ↘ failed
authorized → canceled
```

| State | Meaning |
|-------|---------|
| `pending` | Row created; job not yet dispatched |
| `enqueued` | Spedy accepted submission; awaiting municipal authorization |
| `authorized` | NFS-e authorized — number, verification code, PDF/XML stored |
| `rejected` | Municipality rejected (permanent for this payload) |
| `failed` | Permanent provider/validation error |
| `canceled` | Staff/system canceled authorized document |

Timestamps: `enqueued_at`, `authorized_at`, `rejected_at`, `failed_at`, `canceled_at`.

## Webhook — account-level Spedy

Spedy webhooks are registered at **platform account** level (not per school).

| Concern | Approach |
|---------|----------|
| Ingress route | `POST /webhooks/spedy/:token` — token matches `ENV["SPEDY_WEBHOOK_TOKEN"]` |
| School resolution | `settings["spedy_company_id"]` or `schools.cnpj` ↔ `company.federalTaxNumber` in payload |
| Idempotency | `webhook_events(provider: spedy, provider_event_id)` — same pattern as Cora |
| Processing | `Billing::ReconcileFiscalWebhookJob` → `Billing::ReconcileFiscalDocumentService` |

## LGPD

| Data | Handling |
|------|----------|
| Guardian CPF/address on NFS-e | Required by fiscal law as tomador — pre-validated before emission |
| Student name on NFS-e v1 | **Not sent** — tomador is financially responsible guardian only |
| PDF/XML | Active Storage blobs; guardian download family-scoped; staff via `manage_billing` |
| `last_error` | Redacted via `Billing::PiiRedactor` — no CPF, email, PEM |
| Audit | `service_invoices` change history via `SchoolAuditable` |

Retention for fiscal documents follows legal requirements — pending formal policy in
[`open-questions.md`](../open-questions.md).

## Spedy payload matrix (three layers)

### Layer 1 — Onboarding (once per school)

Sent to Spedy on company provisioning (`POST /v1/companies`, settings, certificate):

| Spedy field | School Lab source |
|-------------|-------------------|
| CNPJ, legal name, address | `schools.cnpj`, `schools.name`, school address fields |
| Issuance municipality | `school_fiscal_settings.spedy_city_code`, `issuance_city_name`, `issuance_state` |
| Certificate A1 (.pfx) | Upload staff → forwarded to Spedy |
| `serviceInvoice.issueType` | `school_fiscal_settings.issue_type` |
| RPS/DPS numbering | Spedy company settings |
| Prefecture credentials | Only if `provider_options_snapshot.authentication` requires — stored in Spedy settings |
| Reforma Tributária | `reform_tributaria_enabled`, `ibs_cbs_config` |

Issuer (school) is **not** repeated on each invoice — Spedy resolves via per-school `X-Api-Key`.

### Layer 2 — Per payment (`POST /v1/service-invoices`)

Built by `Gateways::ServiceInvoice::IssueRequestBuilder.from_payment` → `Spedy::RequestPayload`.

| Spedy field | Source | Notes |
|-------------|--------|-------|
| `integrationId` | `"pay-{payment.id}"` | Max 36 chars; idempotency |
| `description` | See priority below | Service discrimination |
| `total.invoiceAmount` | `payment.paid_amount_cents / 100.0` | Amount actually paid |
| `total.issRate` | `school_fiscal_settings.iss_rate_percent` | Accountant-defined |
| `receiver.*` | Charge guardian | BR-I08 completeness |
| `federalServiceCode` | settings | When required by city |
| `cnaeCode`, `cityServiceCode`, `nbsCode` | settings | When required |
| `taxationType`, `taxLocation` | settings | Defaults: municipality taxation |
| `effectiveDate` | `payment.paid_at` | Competence = receipt date |
| `sendEmailToCustomer` | true if guardian email present | |

**Description priority:**

1. `charges.description`
2. Tuition: `"{service_description} - ref. {MM/YYYY}"` from `billing_period`
3. `billing_purposes.name`
4. `school_fiscal_settings.service_description` or i18n default

### Layer 3 — Not sent per invoice

- School issuer data (already at Spedy)
- SGISS / municipal webservice details
- Student PII
- Product NF-e line items

## Integration with payments

```
PaymentConfirmed (RecordPaymentService)
  → IssueServiceInvoiceJob (if school_fiscal_settings.enabled)
    → IssueServiceInvoiceService
      → service_invoice_attempts (idempotency)
      → Gateways::ServiceInvoice::Registry → Spedy::Adapter
```

Payment failure rollback is **never** triggered by fiscal failure (BR-I04).

## Permissions

| Actor | Scope |
|-------|-------|
| Staff `manage_billing` | CRUD fiscal settings, credentials, list all school invoices |
| Guardian | Read invoices for own family charges only |
| Backoffice | Provision Spedy company (platform operator) |
