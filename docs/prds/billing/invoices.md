# PRD — Billing: Service Invoices / NFS-e (BC7)

> Status: **implementable**  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `billing.issue_service_invoice`, `billing.configure_nf_settings`  
> Divergence: [`DIV-financial-005`](../../ref/divergencias.md) — NFS-e services in billing; product NF later  
> Related: [`charges.md`](charges.md), [`payments.md`](payments.md)  
> Modeling: [`docs/modeling/010-service-invoices.md`](../../modeling/010-service-invoices.md)

---

## Objective

Issue Brazilian **NFS-e** (Nota Fiscal de Serviço eletrônica) for tuition and school services
via **Spedy** aggregator, triggered automatically when a payment is confirmed. National scope from
v1 — municipality chosen in school configuration using Spedy `GET /v1/service-invoices/cities`.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Issue service invoice | `billing.issue_service_invoice` | Proesc NF module, Sophia/TOTVS per-city NFS-e CST articles |
| Configure NF settings | `billing.configure_nf_settings` | TOTVS per-city parameters dominate corpus |

[`DIV-financial-005`](../../ref/divergencias.md): **NFS-e services in billing PRD; product NF later.**

---

## Scope decision

| Phase | Scope |
|-------|-------|
| **MVP billing slice** | Charges and boletos only — unchanged |
| **This delivery (BC7 v1)** | Service NFS-e for tuition/education services **one invoice per confirmed payment**; Spedy adapter; national city selection |
| **Later** | Product NF (NFC-e/NF-e) — out of core school billing; consolidated monthly issuance |

---

## Business Rules

BR-I01

NFS-e issuance is **optional per school** — `school_fiscal_settings.enabled` plus complete
configuration (city, fiscal codes, active Spedy credentials, valid certificate at Spedy).

BR-I02

Default trigger: **`PaymentConfirmed`** — exactly **one NFS-e per payment** (`integration_id`
= `pay-{payment_id}`).

BR-I03

National adapter via **Spedy** — municipality validated against `GET /v1/service-invoices/cities`;
no hardcoded city; `provider_options_snapshot` cached at selection time.

BR-I04

Failed NFS-e must **not** roll back payment — queue retry for transient errors; permanent failure
records `service_invoices.status = failed` and staff alert; payment stays `confirmed`.

BR-I05

Guardian portal shows NFS-e PDF when issued — family-scoped via `student_guardians`.

BR-I06

NFS-e may be enabled only if the selected city exists in Spedy `/cities` response at save time.

BR-I07

School without NFS-e configured continues operating boleto and payment flows normally — no side
effects when `school_fiscal_settings.enabled` is false or missing.

BR-I08

Receiver (tomador) = **financially responsible guardian** on the charge; issuance blocked when CPF
or complete address is missing — same completeness gate as boleto issuance.

---

## Use Cases

### UC-I01 — Configure municipal NFS-e settings

Input: city (from Spedy search), ISS rate, service codes (LC 116, CNAE, municipal code), service
description, issue type.

Output: `school_fiscal_settings` row; `enabled` only when complete and city validated.

### UC-I02 — Issue NFS-e on payment confirmed

Input: `payment_id`.

Output: `service_invoice` row + async job; Spedy POST `/v1/service-invoices`.

### UC-I03 — Guardian downloads authorized PDF

Input: authenticated guardian, `service_invoice_id`.

Output: PDF stream — family-scoped.

---

## API

See [`docs/api/v1/billing.md`](../../api/v1/billing.md) — fiscal settings, credentials, staff and
guardian service invoice routes.

---

## Database

See [`docs/database/schema.dbml`](../../database/schema.dbml) and
[`docs/modeling/010-service-invoices.md`](../../modeling/010-service-invoices.md):

- `school_fiscal_settings`
- `service_invoices`
- `service_invoice_attempts`
- `school_payment_providers` extended (`instrument: service_invoice`, provider `spedy`)

---

## Permissions

Staff: `manage_billing` for configuration and staff list/detail/PDF.

Guardian: family-scoped read via `student_guardians` on linked charges.

---

## Acceptance Criteria

AC-I01

- [ ] Given paid tuition charge, complete fiscal settings, and valid Spedy config, when issuance
  job runs, then `service_invoice` reaches `authorized` and PDF/XML are stored.

AC-I02

- [ ] Given invalid Spedy city code, when staff enables NFS-e, then API returns validation error
  and `enabled` stays false.

AC-I03

- [ ] Given duplicate job for same `payment_id`, when issuance runs again, then no second Spedy
  document is created.

AC-I04

- [ ] Given permanent Spedy failure, when issuance completes, then payment remains confirmed and
  invoice is `failed`.

AC-I05

- [ ] Given guardian A, when listing service invoices, then only invoices for guardian A's family
  charges are returned.

---

## Open items (closed for v1 architecture)

- [x] Integration vendor — **Spedy**
- [x] First municipalities — **national via Spedy cities API** (pilot may use Goiânia through config)
- [ ] ISS exigibility vs receipt timing — accountant review (does not block implementation)
- [ ] LC 116 / CNAE / ISS codes per school — filled in config; validated manually in pilot

---

## Out of Scope (v1)

- NF-e / NFC-e (product)
- Consolidated monthly issuance
- Inbound NF-e (Spedy received invoices)
- Second fiscal provider (port prepared; implementation when demanded)
- SPA screens — deferred to W7
