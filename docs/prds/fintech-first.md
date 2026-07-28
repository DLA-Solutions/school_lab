# PRD — Módulo Financeiro (Estratégia "Fintech-first" para Escolas)

> Status: rascunho para validação com parceiro (diretor de escola infantil)
> Relação com School Lab: frente derivada, não substitui a ordem de MVP
> validada em `vision.md` (comunicação → acadêmico → financeiro). Ver seção
> 10 para a discussão explícita dessa diferença de estratégia.

## 1. Contexto e motivação

O parceiro (diretor de escola infantil, amigo de longa data) reporta troca
frequente de sistema de gestão escolar, com a dor recorrente sendo o
**financeiro**, especificamente a **gestão de boletos**: emissão manual ou
pouco confiável, conciliação manual, falta de visibilidade sobre
inadimplência, e cobrança que depende de esforço humano (ligar, mandar
mensagem) em vez de processo automatizado.

Diferente da abordagem "ERP completo desde o dia 1", a proposta aqui é
nascer como um produto **fintech-like**, focado exclusivamente em resolver a
dor de cobrança recorrente com excelência, e só depois expandir para gestão
acadêmica e comunicação — nessa ordem.

## 2. Objetivo (north star)

Eliminar o trabalho manual e a incerteza do fluxo de cobrança de
mensalidades escolares: da geração da cobrança até a confirmação do
pagamento, sem intervenção manual da secretaria, com visibilidade completa
de inadimplência para o diretor.

## 3. Público-alvo do MVP

- **Cliente inicial**: a escola do parceiro validador (escola infantil).
- **Perfil de expansão**: escolas particulares de pequeno/médio porte,
  ensino infantil e fundamental, com processo de cobrança hoje manual ou mal
  atendido pelo sistema atual.
- **Usuários diretos**: administração da escola (emissão e acompanhamento) e
  responsáveis financeiros/pais (recebimento e pagamento).

## 4. Problema a resolver (detalhado)

| Dor relatada | Impacto |
|---|---|
| Emissão de boleto manual ou pouco confiável | Atraso na cobrança, erro de valor |
| Sem conciliação automática | Secretaria baixa pagamento manualmente, sujeito a erro |
| Sem régua de cobrança | Inadimplência descoberta tarde, cobrança informal e inconsistente |
| Sem visão consolidada de inadimplência | Diretor não sabe fluxo de caixa esperado do mês |
| Descontos e negociações tratados fora do sistema | Falta de rastreabilidade, retrabalho na secretaria |

## 5. Escopo do MVP

### Dentro do MVP

- Cadastro de escola, responsáveis e alunos (fundação mínima — sem módulo
  acadêmico).
- Vínculo `student_guardians` com suporte a múltiplos responsáveis
  financeiros por aluno (ex.: pais separados, percentual de divisão).
- Cadastro de planos de cobrança (`billing_plans`): mensalidade, matrícula,
  taxas avulsas (material, evento).
- Contratos por aluno (`contracts`): valor negociado, dia de vencimento,
  vigência, descontos aplicados (ex.: desconto de irmão).
- Geração automática e recorrente de cobranças (`charges`) a partir do
  contrato ativo.
- Emissão de boleto e Pix via integração com PSP (gateway de pagamento —
  decisão de fornecedor em aberto, ver seção 9).
- Conciliação automática via webhook do PSP (`webhook_events` →
  `payments`).
- Régua de cobrança automatizada: lembrete antes do vencimento, aviso no
  dia, cobrança após atraso — via e-mail e/ou WhatsApp.
- Cálculo de multa/juros por atraso, configurável por escola.
- Dashboard de inadimplência para o diretor: cobranças em aberto, atrasadas,
  pagas, previsão de recebimento do mês.
- Portal/tela simples para o responsável: ver cobranças, 2ª via de boleto,
  copiar código Pix, histórico de pagamento.

### Fora do MVP (fases seguintes)

- Gestão acadêmica (notas, turmas, chamada, plano de aula).
- Comunicação estruturada pai↔professor↔escola (mensagens, imagens).
- Arquivo digital / documentos do aluno.
- Livro Ata e assinatura digital.
- Antecipação de recebíveis para a escola (produto fintech mais avançado —
  a escola recebe adiantado, plataforma assume risco de inadimplência).
  Mencionado como visão de médio prazo, não como requisito deste PRD.
- App mobile dedicado — MVP pode rodar 100% web/responsivo.
- Multi-unidade/rede de escolas (`school_groups`) — schema já contempla,
  mas fluxo de produto para múltiplas unidades fica para quando houver
  cliente com mais de uma unidade ativa.

## 6. Fluxos principais

### 6.1 Geração de cobrança recorrente

```
Contrato ativo (dia de vencimento definido)
  → Job agendado gera charge do mês (competência)
  → Aplica desconto vigente (se houver)
  → Calcula valor_total (original - desconto)
  → Emite boleto/Pix junto ao PSP
  → Envia notificação ao responsável (e-mail/WhatsApp)
```

### 6.2 Conciliação de pagamento

```
Pagamento confirmado no PSP
  → PSP dispara webhook
  → webhook_event registrado (bruto, idempotente)
  → Job processa evento de forma assíncrona
  → Localiza charge via psp_transaction_id
  → Cria/atualiza payment
  → Atualiza status da charge (paid)
  → Notifica responsável (confirmação) e escola (baixa automática)
```

### 6.3 Régua de cobrança (atraso)

```
Charge vence sem pagamento confirmado
  → Job diário verifica charges vencidas
  → Aplica multa/juros configurado
  → Dispara lembrete (D+1, D+3, D+7 — configurável)
  → Atualiza status (overdue)
  → Reflete no dashboard de inadimplência
```

## 7. Modelo de dados (referência)

O modelo de dados detalhado (schema DBML) já foi definido em conversa
anterior e cobre as entidades centrais deste PRD: `schools`, `guardians`,
`students`, `student_guardians`, `billing_plans`, `contracts`, `charges`,
`applied_discounts`, `payments`, `webhook_events` (+ `school_groups` para
suporte futuro a rede de escolas).

Este PRD não repete o schema — qualquer ajuste de modelagem decidido aqui
deve ser refletido de volta no DBML.

## 8. Requisitos não funcionais

- **Confiabilidade de cobrança**: falha na geração ou emissão de uma charge
  não pode passar despercebida — requer alerta/monitoramento (o paralelo
  aqui com o princípio de `vision.md` de "estabilidade acima de features" se
  aplica: erro no financeiro tem o mesmo peso jurídico/reputacional que erro
  em nota ou chamada).
- **Idempotência de webhook**: eventos duplicados ou fora de ordem do PSP
  não podem gerar cobrança duplicada nem baixa incorreta.
- **Auditoria**: toda alteração em `charges` e `payments` deve ser
  rastreável (quem/quando), especialmente descontos manuais aplicados pela
  secretaria.
- **LGPD**: CPF, e-mail e telefone de responsáveis são dados pessoais;
  tratamento e retenção seguem o mesmo princípio de privacidade-por-padrão
  de `vision.md`. Base legal e política de retenção específicas para dados
  financeiros ainda não foram validadas com jurídico — tratar como pendência,
  não como decisão fechada.

## 9. Pendências / perguntas em aberto

Itens que precisam de decisão antes ou durante a implementação — não devem
ser tratados como resolvidos por este PRD:

- [ ] Escolha do PSP (Asaas, Iugu, Pagar.me ou outro) — critérios: suporte a
      boleto + Pix recorrente, split de pagamento (útil se houver rede no
      futuro), qualidade de webhook, custo por transação.
- [ ] Canal da régua de cobrança: e-mail, WhatsApp (API oficial ou não),
      SMS — ou combinação, configurável por escola.
- [ ] Regra de multa/juros: percentual fixo por escola ou configurável por
      plano de cobrança?
- [ ] Fluxo de desconto negociado manualmente (ex.: bolsa, acordo pontual):
      quem aprova, fica registrado onde, afeta o contrato ou só a charge
      pontual?
- [ ] Emissão de nota fiscal (NFS-e) — dentro do MVP ou fase seguinte? (Não
      mencionado como dor inicial pelo parceiro, mas é tabela de entrada no
      mercado, conforme `competitive-analysis.md`.)
- [ ] Responsável acessa via login próprio (conta) ou link mágico/token por
      cobrança (sem necessidade de senha)?
- [ ] Modelo de cobrança da própria plataforma para a escola (SaaS fee) —
      por aluno ativo, por escola, percentual sobre volume processado?

## 10. Nota de posicionamento — relação com o School Lab

Este PRD propõe uma ordem de construção **invertida** em relação à validada
em `vision.md`/`open-questions.md` para o School Lab (onde comunicação é a
prioridade #1, validada com a escola NSR em jul/2026). Isso é intencional e
contextual a este parceiro específico, cuja dor primária e explícita é
financeira.

Duas leituras possíveis, a decidir mais adiante e fora do escopo deste PRD:

1. Tratar como **produtos separados** com bases de cliente diferentes
   (School Lab para o perfil "comunicação como dor #1"; este módulo
   financeiro para o perfil "financeiro como dor #1").
2. Tratar como **a mesma base de código com dois pontos de entrada** —
   nesse caso, o modelo de dados aqui precisa, em algum momento, convergir
   com as entidades já definidas no School Lab (`School`, `User`,
   `Membership`, `Student`, `StudentGuardian` já existentes na modelagem
   fundacional) em vez de duplicar `schools`/`students`/`guardians` como
   entidades paralelas.

Recomendo explicitar essa decisão antes de começar a implementação, porque
ela muda se este PRD gera um repositório novo ou um módulo dentro do
monorepo do School Lab.