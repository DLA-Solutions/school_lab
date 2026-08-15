---
name: codelet-loop
description: Constrói uma feature de código até bater um critério de qualidade
  verificável, conduzindo primeiro um levantamento de requisitos e critérios
  de aceite, depois decompondo em pedaços pequenos e julgáveis (codelets) e
  rodando builder + cinco críticos adversariais em subagentes de contexto
  isolado contra um harness de teste real, comparados a uma referência
  externa concreta. Use quando o usuário pedir para "construir com qualidade
  impecável", "não parar até ficar perfeito", "codelet loop", "gauntlet
  loop", quando pedir para levantar critérios de aceite ou requisitos de uma
  feature nova, quando pedir para comparar a implementação contra um
  concorrente ou benchmark real, ou quando o pedido tiver um resultado que
  precisa ser validado por alguém que não é quem construiu — mesmo que o
  usuário não use nenhuma dessas palavras exatas.
---

# Codelet Loop

## Abertura

O gargalo de qualidade em desenvolvimento assistido por IA não é o builder — é a avaliação. Sem uma referência externa concreta e sem contexto limpo no crítico, "impecável" é um adjetivo que qualquer modelo aprova com facilidade. Esta skill existe para transformar "impecável" em algo binário e verificável: ou há evidência gerada por quem julga, ou há um relatório honesto de lacuna.

## As sete fases

### 1. Requirements gate

O feature slice deve existir em `docs/prds/<domain>/<feature-slug>.md` com seções **Bar** e **Acceptance criteria** preenchidas.

Se estiver ausente → **pare** e execute a skill `codelet-requirements`. **Não** conduza elicitação inline nesta skill.

### 2. Acceptance criteria gate

Revalide o slice com:

```bash
python3 .cursor/skills/codelet-loop/scripts/montar_prompt.py \
  --validate-only --ac-file docs/prds/<domain>/<feature-slug>.md
```

Exit code 0 obrigatório antes de prosseguir. Se falhar, volte ao `codelet-requirements` ou corrija o slice com o usuário.

### 3. Bar (read-only)

O bar já deve estar no slice file (seção **Bar**). Leia e use como referência dos críticos — não redefina aqui.

Detalhe: [`references/bar.md`](references/bar.md).

### 4. Decomposição em codelets

Quebra a feature no menor pedaço julgável isoladamente — cada codelet com escopo em uma frase e subconjunto de ACs que precisa cumprir. Aplica testes de granularidade fina demais e grossa demais.

Detalhe completo: [`references/decomposicao.md`](references/decomposicao.md).

### 5. Fan-out e loop de críticos

Para cada codelet: um Task subagent de **builder**, depois **cinco críticos** adversariais como Task subagents separados, cada um com contexto limpo. Nenhum crítico vê o raciocínio do builder nem os vereditos dos outros. Se subagentes reais não estiverem disponíveis, a skill **recusa** simular contexto limpo por instrução textual — informa o usuário e para.

Detalhe completo: [`references/criticos.md`](references/criticos.md).

### 6. Harness de verificação

Cada crítico só aprova o que ele mesmo verificou nesta rodada, com evidência que ele mesmo gerou. Três níveis (A completo, B parcial, C nenhum) conforme o ambiente disponível. No nível C, nenhum crítico aprova nada — a skill para e pede ambiente ou MCP de automação.

Detalhe completo: [`references/harness.md`](references/harness.md).

### 7. Teto e consolidação

Limite de 5 rodadas por codelet (ajustável para cima só se o usuário pedir). No teto sem aprovação unânime: relatório de lacuna residual, nunca aprovação por exaustão. O orquestrador agrega um único relatório final — codelets aprovados com evidência-chave, codelets com gap residual com a lacuna mais grave.

Detalhe completo: [`references/orcamento.md`](references/orcamento.md).

## Elicitação de requisitos

As fases 1–3 de levantamento, portão de AC e definição de bar foram extraídas para a skill **`codelet-requirements`**. Esta skill assume que o slice já existe e foi aprovado pelo usuário.

Referência histórica (fases 1–2 do levantamento): [`references/levantamento.md`](references/levantamento.md).

## Quando NÃO usar

Use apenas a fase 6 (harness) sem o resto do aparato quando **todas** estas condições forem verdadeiras:

| Condição | Exemplo |
|----------|---------|
| Escopo de uma linha ou mudança trivial | Corrigir typo, renomear variável local |
| Sem ambiguidade de comportamento | Bug com reprodução conhecida e fix óbvio |
| Sem critério aspiracional | Não há pedido de "impecável" ou paridade com benchmark |

**Como o agente decide:**

1. Conte quantos ACs distintos seriam necessários — se zero ou um, provavelmente trivial.
2. Verifique se há adjetivos sem proxy ou bar externo pedido — se não, provavelmente trivial.
3. Se trivial: execute a mudança, rode o harness disponível (testes existentes, lint, execução manual mínima), reporte evidência. **Não** dispare levantamento, decomposição, nem painel de cinco críticos.
4. Se houver dúvida entre trivial e não-trivial, pergunte ao usuário em uma frase: "Isso parece uma correção pontual — quer só verificação com harness ou o loop completo?"

## Como iniciar

O ponto de entrada é sempre:

```bash
python3 .cursor/skills/codelet-loop/scripts/montar_prompt.py \
  --sem-interacao \
  --domain <domain> \
  --feature "<Feature name>" \
  --ac-file docs/prds/<domain>/<feature-slug>.md
```

(`--bar` opcional se já estiver no slice file.)

**Pré-requisito:** feature slice em `docs/prds/<domain>/<feature-slug>.md` — use `codelet-requirements` se não existir.

**Modo interativo (legado):** `python3 .cursor/skills/codelet-loop/scripts/montar_prompt.py` — faz levantamento simplificado e grava slice.

**Validação isolada:**

```bash
python3 .cursor/skills/codelet-loop/scripts/montar_prompt.py \
  --validate-only --ac-file docs/prds/<domain>/<feature-slug>.md
```

O prompt gerado usa [`templates/prompt-base.md`](templates/prompt-base.md) como esqueleto e deve ser executado como **nova tarefa** do agente principal — autocontido, sem depender desta skill estar carregada na sessão.

Após gerar o prompt:

1. Cole o prompt em um chat de agente novo (contexto limpo para o orquestrador).
2. O orquestrador segue as sete fases, delegando builders e críticos via Task subagents.
3. No final, entrega o relatório consolidado ao usuário.

## Princípios inegociáveis

- **Genérica** — não assume stack fixo; detecta `docs/prds/` e `docs/ref/` e trata como opcional com fallback.
- **Nada de aprovação por presunção** — crítico só aprova o que verificou nesta rodada com evidência própria. Reaproveitar evidência do builder ou de outro crítico é **proibido**.
- **Contexto limpo** — cada crítico é Task subagent separado. Simular isolamento por instrução textual é modo de falha; se Task subagents não estiverem disponíveis, recuse e informe o usuário.
- **Honestidade sobre convergência** — no teto de rodadas: aprovar com evidência ou entregar relatório de lacuna. Nunca "aprovar porque já rodou muito".
