# Domain model — financial management (Proesc)

Harvest: 2026-08-14.

## Core entities

### Débito

Billable container (matrícula, material, balé, avulso) with one or more **parcelas**.
Linked to exercício, tipo de débito, optional NFS-e generation flag per type.
([criar débito](https://suporte.proesc.com/hc/pt-br), [release notes](https://suporte.proesc.com/hc/pt-br))

### Parcela

Single due line; statuses for cobrança; boleto generation and update (single or batch).
([atualizar boletos](https://suporte.proesc.com/hc/pt-br))

### Cash session (`meu caixa`)

Open/close cashier; pay single or **batch** parcelas across débitos and even across siblings
sharing financial guardian.
([meu caixa](https://suporte.proesc.com/hc/pt-br), [pagamento em lote](https://suporte.proesc.com/hc/pt-br/articles/22082323484823))

### Financial guardian

PF or **PJ**; corporate guardian receives consolidated charges for multiple students.
([PJ responsável](https://suporte.proesc.com/hc/pt-br))

### Bank remittance (`arquivo de remessa`)

Batch boleto file generation — parcelas must exist before remessa.
([gerar remessa](https://suporte.proesc.com/hc/pt-br/articles/360056436834))

### NFS-e module

Emit, view status, cancel, report; checklist article enumerates menu paths.
([checklist NF](https://suporte.proesc.com/hc/pt-br/articles/22082323484823))

### Dunning / reminders

Track envio de lembretes e cobranças with filters by turma, vencimento, tipo débito.
([acompanhar lembretes](https://suporte.proesc.com/hc/pt-br))

### IR declaration (`declaração de quitação`)

Configurable by débito tipo for annual guardian tax statement.
([declaração IR](https://suporte.proesc.com/hc/pt-br))

## Key relationships

```
matrícula → débitos[] (matrícula fee, tuition, material)
débito → parcelas[] → boleto / cartão / PIX (guardian app)
parcela → NFS-e (optional)
responsável financeiro → parcelas[] (batch pay scope)
```

## States

| Entity | States |
|--------|--------|
| parcela | em aberto, paga, vencida, negociada (batch selection) |
| caixa | aberto, fechado |
| NFS-e | emitida, cancelada |

## Analytics

Finance dashboards in Proesc Analytics (enrollment + receivables KPIs).
