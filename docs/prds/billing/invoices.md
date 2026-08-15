# PRD — Billing: Service Invoices / NFS-e (BC7)

> Status: validated *(scope definition only — issuance P2)*  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `billing.issue_service_invoice` (MVP in taxonomy — **deferred to P2**), `billing.configure_nf_settings` (P2)  
> Divergence: [`DIV-financial-005`](../../ref/divergencias.md) — NFS-e services in billing; product NF later  
> Related: [`charges.md`](charges.md), [`payments.md`](payments.md)

---

## Objective

Document **phase boundary** for Brazilian **NFS-e** (Nota Fiscal de Serviço eletrônica) for
tuition and school services — competitor pattern capture and School Lab deferral decision —
without specifying implementation in MVP.

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
| **MVP (partner slice + this PRD)** | **No NFS-e issuance.** Charges and boletos only. Open item in historical [`fintech-first.md`](../fintech-first.md) closed as defer. |
| **P2** | Service NFS-e for tuition/education services after payment or on schedule; per-city adapter. |
| **Later** | Product NF (NFC-e) — out of core school billing. |

**Taxonomy note:** [`mvp-scope.md`](../../product/mvp-scope.md) lists `billing.issue_service_invoice`
as MVP for parity tracking; **product decision overrides** to P2 until legal/integrations scoped.
Update taxonomy phase in a future regen when stakeholder validates.

---

## Business Rules (P2 preview — not implemented)

BR-I01

NFS-e issuance is **optional per school** — module flag + municipal registration data.

BR-I02

Default trigger: **`PaymentConfirmed`** on tuition charges — one NFS-e per payment or
consolidated monthly `[product decision]` pending municipal rules.

BR-I03

Per-city adapter implements ISS parameters, service codes (LC 116), and RPS batch — TOTVS CST
pattern documented as complexity driver.

BR-I04

Failed NFS-e must not roll back payment — queue retry + staff alert (NFR-001).

BR-I05

Guardian portal shows NFS-e PDF link when issued — family-scoped.

---

## Use Cases (P2 preview)

### UC-I01 — Configure municipal NFS-e settings

Input: city code, ISS rate, service code, certificate.

**Status:** not started.

### UC-I02 — Issue NFS-e on payment confirmed

Input: payment id.

**Status:** not started.

---

## API (P2 placeholder)

No MVP routes. Planned namespace: `/billing/service_invoices`, `/billing/nf_settings`.

---

## Database (P2 placeholder)

Expected entities: `nf_settings`, `service_invoices`, `nf_issuance_attempts` — model after
city adapter choice.

---

## Permissions (P2)

`manage_billing` + optional `issue_service_invoice` key.

---

## Acceptance Criteria (P2 — not MVP)

AC-I01

- [ ] Given paid tuition charge and configured São Paulo NFS-e settings, when issuance job runs, then service invoice row is authorized and PDF URL is stored.
- Source: [`totvs/gestao-financeira/funcionalidades-por-ator.md`](../../ref/totvs/gestao-financeira/funcionalidades-por-ator.md) — **deferred**

---

## Open items

- [ ] First target municipalities (partner school city).
- [ ] ISS exigibility vs receipt timing — accountant review.
- [ ] Integration vendor (direct prefeitura vs aggregator).

---

## Out of Scope (MVP)

All NFS-e issuance, cancellation, and guardian download — **P2 only**.
