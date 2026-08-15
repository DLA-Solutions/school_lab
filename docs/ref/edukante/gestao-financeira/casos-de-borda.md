# Edge cases — financial management (Edukante)

Harvest: 2026-08-14.

## Receivable modified after boleto issued

If receivable changes, a **new** boleto can be generated; multiple electronic
transactions may exist per receivable — any successful one marks paid.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Overdue boleto without reissue

Expired boletos can still be paid with auto-calculated fine/interest unless
school renegotiates and issues exception.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Tiered early-payment discounts

Example: 20% if paid by day 10, 10% by day 20 — multiple discount tiers on same
receivable.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Selective receivable cancellation on enrollment deactivate

Deactivating enrollment may cancel only **selected** linked receivables, not
necessarily all.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Manual settlement risk

Cash/transfer payments require manual write-off — described as slower, less
secure, error-prone vs automated rails.
→ Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

## Boleto payer always financial guardian

Email/WhatsApp boleto delivery targets financial guardian contact; school can
add CC/BCC addresses.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Payment gateway onboarding

Enabling boleto/card requires support-led KYC (CNPJ docs, partner ID, bank
account); PF or PJ account supported.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## International card

International credit cards accepted; recurring charges supported — relevant for
language schools / foreign guardians.
→ Source: [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Boleto protest

Integrated path to protest overdue boletos — strong delinquency tool with legal
implications; schools must understand workflow.
→ Source: [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Carnê (payment booklet) manual path

Physical carnê with all installments for manual signature after payment proof —
parallel to digital rails for schools still on paper.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Anticipation of future card installments

School can request early settlement of future card-paid installments (cash-flow
advance scenario).
→ Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

## Coupon on online enrollment

Promotional discount codes on public enrollment funnel.
→ Source: [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Commission on sales

Seller users earn commissions on captured enrollments; commission reports cross
CRM and finance.
→ Source: [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## NFS-e tied to tuition

Service invoices generated from tuition receivables — financial guardian data
feeds NF payload.
→ Source: [controle acadêmico](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-escolar-web-controle-academico.aspx)

## Audit on financial mutations

Every create/update/settle/cancel/delete on receivables logged with user and
field-level diff.
→ Source: [financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx)
