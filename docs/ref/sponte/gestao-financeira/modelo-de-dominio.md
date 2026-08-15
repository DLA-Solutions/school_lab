# Domain model — financial management (Sponte)

Harvest: 2026-08-14.

## Core entities

### Receivable (`mensalidade` / parcela)

Tuition and fees tied to enrollments; due dates drive dunning and payment links.
([gestão financeira](https://www.sponte.com.br/gestao-financeira))

### Payment methods (Sponte Pay)

Integrated rails:

- Automated boleto
- Recurring credit card
- Pix

Payment links deliverable via SMS, email, or WhatsApp.
([gestão financeira](https://www.sponte.com.br/gestao-financeira), [funcionalidades](https://www.sponte.com.br/funcionalidades))

### Cash flow (`fluxo de caixa`)

Real-time inflows/outflows dashboard for school treasury.
([gestão financeira](https://www.sponte.com.br/gestao-financeira))

### Dunning sequence (`régua de cobrança`)

Configurable automated reminders; marketing claims **30%+ reduction** in late payments.
([gestão financeira](https://www.sponte.com.br/gestao-financeira))

### Fiscal documents

Automated NF-e, NFS-e, NFC-e emission integrated with billing.
([funcionalidades](https://www.sponte.com.br/funcionalidades))

### Guaranteed tuition (`mensalidade garantida`)

Commercial program: Sponte assumes delinquency risk; school receives **100%** of
scheduled tuition (basic education segment). Distinct from standard dunning.
([mensalidade garantida](https://www.sponte.com.br/mensalidade-garantida))

### Bank reconciliation

Marketing claims **“zero conciliação bancária”** — payments auto-reconcile in system.
([software de gestão escolar](https://www.sponte.com.br/software-de-gestao-escolar))

## Key relationships

```
enrollment → receivables[] (tuition plan)
receivable → installments[], payment_links[], fiscal_documents[]
financial_guardian → receivables[] (payer)
dunning_sequence → receivable.status (overdue triggers)
```

## States (inferred)

| Entity | States |
|--------|--------|
| installment | pending, paid, overdue |
| guaranteed_tuition_enrollment | active in program, standard billing otherwise |

## Risk analytics (inferred)

Marketing references **AI risk alerts** for delinquency prevention — details not public.
([blog/how to choose](https://www.sponte.com.br/blog/como-escolher-um-sistema-de-gestao-escolar) — cited in competitive-analysis.md)
