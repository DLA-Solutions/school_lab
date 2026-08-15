# Flows — financial management (Proesc)

Harvest: 2026-08-14.

## Create enrollment débito

**Actor:** secretariat / finance  
**Preconditions:** matrícula confirmed, plano selected

1. Financeiro → create débito de matrícula (or linked from matrícula flow).
2. System generates parcelas per plan.

Source: [criar débito de matrícula](https://suporte.proesc.com/hc/pt-br)

## Generate bank remittance

**Actor:** finance  
**Preconditions:** parcelas already created on student débitos

1. Financeiro → remessa workflow.
2. Select parcelas; export arquivo de remessa.

Source: [gerar remessa](https://suporte.proesc.com/hc/pt-br)

## Batch pay parcelas at cashier

**Actor:** cashier  
**Preconditions:** caixa aberto

1. Financeiro → Meu caixa.
2. Search by aluno or responsável (for siblings).
3. Select parcelas across débitos → Pagar lote.

Source: [pagamento em lote](https://suporte.proesc.com/hc/pt-br/articles/22082323484823)

## Update overdue boletos

**Actor:** finance  
**Preconditions:** boleto vencido

1. Locate débito/parcela.
2. Update single parcela or all parcelas of débito in batch.

Source: [atualizar boletos](https://suporte.proesc.com/hc/pt-br)

## Emit NFS-e for tuition

**Actor:** finance  
**Preconditions:** NFS-e module configured per city

1. Financeiro → Nota Fiscal.
2. Filter parcelas → emit → track status → download or cancel.

Source: [checklist NF](https://suporte.proesc.com/hc/pt-br/articles/22082323484823)

## Guardian pays in Proesc Agenda

**Actor:** guardian  
**Preconditions:** app login, open parcelas

1. Open Financeiro in app.
2. Filter by status/year → pay selected parcela.

Source: [Proesc Agenda](https://suporte.proesc.com/hc/pt-br/articles/16533531345431)

## Track dunning sends

**Actor:** finance  
**Preconditions:** régua/reminders configured

1. Open reminder tracking report.
2. Filter by exercício, turma, vencimento, tipo débito, boleto status.

Source: [acompanhar lembretes](https://suporte.proesc.com/hc/pt-br)

## Register corporate financial guardian

**Actor:** secretariat  
**Preconditions:** empresa cadastro

1. Cadastrar pessoa jurídica as responsável financeiro.
2. Link to student(s); generate débitos to PJ.

Source: [PJ responsável](https://suporte.proesc.com/hc/pt-br)
