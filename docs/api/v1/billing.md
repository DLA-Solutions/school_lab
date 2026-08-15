# API v1 — Billing

> PRDs: [`docs/prds/billing/`](../../prds/billing/)  
> Baseline (implemented): [`fintech-first.md`](fintech-first.md)  
> Modeling: [`docs/modeling/001-fintech-first.md`](../../modeling/001-fintech-first.md)  
> Conventions: [`docs/api/README.md`](../README.md)

Full MVP billing domain narrative. **All routes below extend** the fintech-first partner slice;
paths not yet in `web/` return `501` until their wave ships.

---

## Relationship to fintech-first

| Area | fintech-first status | billing PRD extension |
|------|---------------------|------------------------|
| Charges, boletos, Cora | **implemented** | Adjustments, plan bands, batch pay |
| Guardian portal | **implemented** | Forward-only history (unchanged) |
| Dunning dashboard | **partial** | Summary + filters — régua deferred |
| NFS-e | — | **P2** — [`invoices.md`](../../prds/billing/invoices.md) |
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

### NFS-e (P2)

| Method | Path | Returns |
|--------|------|---------|
| `POST` | `/billing/invoices/nfs_e` | `501` until phase 2 |

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

`Billing`, `Guardian Me`, `Webhooks`
