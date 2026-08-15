# Edge cases — financial management (Proesc)

Harvest: 2026-08-14.

## Remessa without prior parcelas

Support tip: remessa requires parcelas pre-created — common mis-order at year start.

## Batch pay across guardians

Batch pay works for same responsável across different students — cashier must switch search
mode from aluno to responsável.

## NFS-e per débito tipo

Checkbox controls which débito types generate NF — misconfiguration yields tuition paid but
no invoice for IR.

## IR declaration partial quitação

Filter by débito tipo on declaração — guardian may request subset; wrong filter denies proof of payment.

## PJ guardian billing

Corporate guardian adds tax ID complexity; linking errors block boleto generation.

## Lia escalation for finance tickets

Support article lists required fields (student name, débito, vencimento, unidade) — missing
context delays human ticket after chat bot failure.
([acionar suporte](https://suporte.proesc.com/hc/pt-br/articles/360041948714))

## Boleto update em lote

Updating all parcelas of a débito may have side effects on remessa already sent — article
cluster suggests manual verification.

## Portal finance not in reports

Troubleshooting: “financeiro do aluno não aparece nos relatórios” — data scope/filter issue.

## Bank account change

Dedicated article for cadastro/troca conta bancária — blocks remessa until complete.

## Payment plan change mid-year

Altering plano after trilha paid may orphan first parcela vs remaining schedule (inferred from
matrícula/finance cross-articles).
