# Flows — financial management (Sponte)

Harvest: 2026-08-14.

## Collect tuition via integrated payment

**Actor:** financial staff / guardian  
**Preconditions:** Sponte Pay enabled, enrollment with plan

1. System generates boleto / Pix / recurring card charge from enrollment plan.
2. School sends payment link via SMS, email, or WhatsApp.
3. Guardian pays; reconciliation automatic (no manual bank match per marketing).

Source: [gestão financeira](https://www.sponte.com.br/gestao-financeira)

## Run dunning sequence

**Actor:** system (automated)  
**Preconditions:** régua configured, overdue installments exist

1. Configure reminder rules in financial module.
2. System sends automated reminders and payment links on schedule.

Source: [gestão financeira](https://www.sponte.com.br/gestao-financeira)

## Emit service invoice (NFS-e)

**Actor:** financial staff  
**Preconditions:** fiscal homologation complete

1. Tuition payment or service triggers NFS-e/NF-e/NFC-e generation.
2. Document stored integrated with receivable record.

Source: [funcionalidades](https://www.sponte.com.br/funcionalidades)

## Enroll in Mensalidade Garantida

**Actor:** school director + Sponte commercial  
**Preconditions:** basic education segment, program eligibility

1. Contract guaranteed-tuition program with Sponte.
2. Receive 100% of scheduled tuition on calendar regardless of family default (vendor assumes risk).

Source: [mensalidade garantida](https://www.sponte.com.br/mensalidade-garantida)

## Guardian pays via app

**Actor:** guardian  
**Preconditions:** Agenda Plus / portal finance module enabled

1. Open financial area in portal or app.
2. View open installments; pay via integrated methods.

Source: [portal do aluno](https://www.sponte.com.br/portal-do-aluno), [app agenda](https://www.sponte.com.br/app-de-agenda-escolar)

## Monitor cash flow

**Actor:** manager  
**Preconditions:** receivables and payables recorded

1. Open cash-flow dashboard.
2. Compare projected vs realized inflows/outflows.

Source: [gestão financeira](https://www.sponte.com.br/gestao-financeira)
