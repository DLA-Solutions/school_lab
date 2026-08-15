# Domain model — financial management (Edukante)

Harvest: 2026-08-14.

## Core entities

### Receivable (`recebimento`)

Central financial line item. Types observed:

- Enrollment fee (`tarifa de matrícula`)
- Tuition (`mensalidade`)
- Material fee (`taxa de material`)
- Document fee (`taxa de geração de documentos`)
- Product/service sale

**Status:** paid, pending, overdue, cancelled  
**Payment methods:** boleto, Pix, credit card, cash, bank transfer  
Linked to enrollment (tuition path) or standalone sale.

Sources: [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx), [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

### Financial plan on enrollment

Created/edited with enrollment; rules for:

- Discount until day N (multiple tiers, % or fixed)
- Late payment fine and interest (auto-calculated on boleto)

Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

### Product / service catalog

Sellable items (uniforms, books, events, room rental); stock control for
physical goods; payer can be PF or PJ.

Source: [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx)

### Expense (`despesa`)

Hierarchical chart: suppliers, categories, expense types; tree structure defined
by school. Feeds cash flow as outflow.

Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

### Payroll (`folha de pagamento`)

Employees with role types and contract types (CLT, PJ, pró-labore, internship);
per-contract tax configuration (INSS, FGTS, etc.); payments as cash outflows.

Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

### NFS-e (service invoice)

Accounts, billing runs, service NF generation tied to tuition receivables; tax
calculation and history for audits.

Source: [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx)

### Electronic transaction (`transação eletrônica`)

One receivable may have many transactions (multiple boleto generations or card
attempts). Any successful payment marks receivable paid.

Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

### Bank transfer batch (`transferência bancária`)

Daily automatic settlement to school's bank account for card/boleto/Pix
payments (T+1 on business days); fee deducted per transaction.

Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

### Price tables / financial settings

Official tuition tables by grade/shift; default fine/interest rules.

Source: [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Payment rails (observed capabilities)

| Rail | Features |
|------|----------|
| Boleto | Individual, bulk, per enrollment, per class; no remessa/retorno; auto registration & settlement; protest overdue; email/WhatsApp |
| Pix | QR + copy-paste; portal, online enrollment, payment links |
| Card | Tokenized card on file; installments; recurring; international cards; payment links without login |
| Manual | Cash/transfer with manual write-off |

Sources: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx), [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Reporting views

- Cash flow (monthly/daily): forecast vs realized revenue, expenses, profit
- Financial statement (`extrato`)
- Receivables report, expenses report, delinquency report
- Sales & seller commissions (CRM overlap)

## Audit

Change history per receivable (who/when/what); system-wide user activity log.

Source: [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Integration with academic domain

```
enrollment created → receivables auto-created
online enrollment paid → student + enrollment + receivables + cash flow
financial_guardian → boleto/NFS-e/contract payer
```

Source: [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx)
