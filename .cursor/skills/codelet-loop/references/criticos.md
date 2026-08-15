# Fan-out e loop de críticos (fase 5)

Este documento define a mecânica de builder + cinco críticos adversariais. É o núcleo do Codelet Loop.

---

## Pré-requisito: Task subagents reais

Esta fase **exige** Task subagents com contexto isolado (ferramenta `Task` no Cursor, ou `/multitask`).

| Situação | Comportamento |
|----------|---------------|
| Task subagents disponíveis | Prosseguir conforme este documento. |
| Task subagents **não** disponíveis | **Parar.** Informar o usuário: "Codelet Loop exige subagentes de contexto isolado. Simular isolamento por instrução textual é proibido — ative multitask/subagents ou execute manualmente cada crítico em chat separado." **Não** continuar fingindo contexto limpo. |

---

## Detecção de harness (antes de qualquer fan-out)

Antes de disparar builder ou críticos, detectar nível de harness conforme [`references/harness.md`](harness.md).

- **Nível C:** parar fase 5 inteira — nenhum crítico roda.
- **Nível A ou B:** registrar nível no prompt de cada crítico; prosseguir.

---

## Mecânica de fan-out — builder

Para **cada codelet**, disparar **um** Task subagent de **builder** com prompt **autocontido**:

### Conteúdo mínimo do prompt do builder

```
Codelet: [nome e número]
Escopo (uma frase): [...]
ACs deste codelet:
- Dado ..., quando ..., então ...
Bar: [referência concreta da fase 3]
Caminhos pertinentes: [arquivos/dirs prováveis no repo]
Não-objetivos: [lista do AC file]
Casos adversos deste codelet: [...]

Construa apenas este codelet. Não expanda escopo.
Ao terminar, liste arquivos alterados e como verificar manualmente em uma frase.
Não declare "pronto para críticos" — o orquestrador dispara críticos.
```

### Paralelismo entre codelets

- Codelets **sem dependência** entre si: disparar builders em paralelo (múltiplos `Task` numa mensagem ou `/multitask`).
- Codelets **com dependência**: builder do dependente só após antecessor **aprovado** (ver regra de aprovação abaixo).

---

## Mecânica de fan-out — cinco críticos

Após o builder de um codelet terminar, disparar **cinco** Task subagents de críticos — **sempre separados**, **sempre contexto limpo**:

| Proibição | Motivo |
|-----------|--------|
| Reutilizar subagente do builder | Builder racionaliza próprio código |
| Um crítico ver veredito de outro | Ancoragem e convergência falsa |
| Orquestrador atuar como crítico | Mesmo modelo, mesmo viés |
| Reaproveitar evidência do builder | Viola regra de evidência própria |

Cada crítico recebe prompt autocontido. **Nenhum** recebe o raciocínio chain-of-thought do builder — apenas artefatos verificáveis (código, URLs, paths) e instruções deste documento.

Críticos do **mesmo codelet na mesma rodada** podem rodar em paralelo **se** o harness permitir isolamento de sessão (ver `references/harness.md`).

---

## Os cinco críticos

### 1. Contrato

**Recebe:**

- AC(s) específicos deste codelet (texto completo Dado/Quando/Então).
- Descrição do harness disponível e nível (A/B).
- Paths dos arquivos alterados pelo builder (lista, não diff interpretativo).

**Não recebe:** bar, não-objetivos completos (opcional: só se ajudar a não expandir — preferir omitir), vereditos de outros críticos.

**Procedimento:**

1. **Pré-registro** (obrigatório, antes de abrir resultado): escrever em 1–2 frases o que espera encontrar ao verificar cada AC.
2. Executar **cada** critério contra o resultado **rodando de verdade** (harness).
3. Para cada AC: aprovar só com evidência própria gerada nesta rodada (log, screenshot, output de teste, response HTTP).
4. **Depois** dos ACs confirmados: tentar **quebrar** o codelet **fora** deles — entrada inesperada, ordem de operação diferente, valores limite, campos omitidos, double-submit.

**Veredito:** binário — aprovação ou reprovação. Reprovação = lacuna mais grave em uma frase acionável.

---

### 2. Padrão / consistência

**Recebe:**

- Paths dos arquivos alterados.
- Convenções detectadas no repositório (lint config, estrutura de pastas, nomenclatura de código vizinho).
- Design system ou style guide **se existir** (`docs/`, `packages/design-tokens/`, Storybook, etc.) — senão, instrução para inferir de código adjacente.

**Não recebe:** AC verbatim como checklist (pode receber escopo em uma frase), bar, outros críticos.

**Procedimento:**

1. **Pré-registro:** o que espera em termos de estilo/estrutura antes de abrir arquivos.
2. Ler arquivos alterados e comparar com vizinhos (imports, naming, error handling, test placement).
3. Rodar lint/formatters do projeto se disponíveis — evidência = output do comando.
4. Se codelet for **interface**: auditar acessibilidade básica — foco visível, navegação por teclado, labels em inputs, contraste óbvio, árvore de acessibilidade se nível A.

**Veredito:** binário. Reprovação nomeia a inconsistência mais grave (ex.: "Modal não usa `ConfirmDialog` como os outros fluxos de delete em billing/").

---

### 3. Usuário hostil

**Recebe SOMENTE:**

- História de uso em linguagem natural — derivada do AC, **sem** gramática Dado/Quando/Então exposta, **sem** bar, **sem** paths de código, **sem** lista de casos adversos.

**Exemplo do que recebe:**

> "Você é responsável financeiro. Precisa reenviar uma cobrança para um responsável que não pagou. Encontre como fazer isso no sistema."

**Não recebe:** AC, bar, código, harness doc, vereditos.

**Procedimento:**

1. **Pré-registro:** como tentaria completar a tarefa em passos naturais.
2. Tentar cumprir via harness (app real nível A, ou API/docs nível B) **como usuário faria** — não ler código-fonte como atalho.
3. Registrar **cada hesitação**: "Não sei se cliquei certo", "Dois botões parecem fazer a mesma coisa", "Não ficou claro se funcionou".
4. Cada hesitação deve ter **motivo suspeito** anexado (ambiguidade de label, falta de feedback, fluxo oculto).

**Veredito:** binário. Uma hesitação material = reprovação com a hesitação citada.

**Propósito:** detectar complexidade herdada que críticos informados não percebem.

---

### 4. Paridade com o bar

**Recebe:**

- Bar completo da fase 3 (referência, justificativa, flag "reconhecidamente ruim").
- Resultado do codelet (acesso via harness — app, API, ou teste).
- **Não** recebe AC detalhado (só escopo em uma frase para orientar comparação).

**Procedimento:**

1. **Pré-registro:** dimensões de comparação — passos, tempo, ambiguidade, pré-requisitos.
2. Executar ou observar o bar (corpus doc + produto se possível, ou exemplo no repo).
3. Executar o codelet pelo mesmo caminho de usuário.
4. Comparar diretamente:
   - Quem completa mais rápido?
   - Menos passos/cliques?
   - Menos ambiguidade em labels/feedback?
   - Casos adverso coberto que o bar ignora?

**Regras de reprovação:**

- Codelet **pior** que o bar em qualquer dimensão material → reprova.
- Codelet **empatado** com bar **reconhecidamente ruim** → reprova (deve superar).
- Codelet empatado com bar aceitável → aprova nesta dimensão (outros críticos podem reprovar).

**Veredito:** binário com lacuna concreta (ex.: "Bar exige 2 cliques; implementação exige 5 e confirmação modal extra").

---

### 5. Estado adverso

**Recebe:**

- Lista de casos adversos mapeados a **este codelet** na decomposição (fase 4).
- Paths / ponto de entrada do codelet.
- Harness e nível.

**Não recebe:** bar, história de usuário hostil, vereditos.

**Procedimento:**

1. **Pré-registro:** para cada caso adverso, o comportamento esperado.
2. **Ativamente tentar cada caso:**
   - Input hostil (XSS, SQL injection strings, unicode, overflow).
   - Rede fora (offline, timeout, 503) — interceptação se nível A.
   - Concorrência (dois tabs, double-click).
   - Dado faltando (registro deletado mid-flow).
   - Permissão insuficiente (usuário wrong role).
   - **Tempo/data:** mock de relógio ou avanço de tempo para transições temporais (vencimento, TTL, scheduled job).

3. Evidência própria por caso tentado.

**Veredito:** binário. Um caso adverso mal tratado = reprovação citando o caso.

---

## Regra de pré-registro (todos os críticos)

Antes de abrir qualquer resultado do codelet, cada crítico escreve **o que espera encontrar** — 1–2 frases.

Ordem obrigatória no output do crítico:

```
## Pré-registro
[expectativa antes de verificar]

## Verificação
[o que fez, evidência gerada]

## Veredito
APROVADO | REPROVADO
Lacuna (se reprovado): [uma frase]
```

Isso impede racionalização retroativa (ajustar expectativa para bater com o que foi visto).

---

## Regra de veredito

| Permitido | Proibido |
|-----------|----------|
| APROVADO (com evidência citada) | Nota 7/10, "quase lá" |
| REPROVADO + lacuna mais grave em uma frase | "Não está bom o suficiente" sem dizer o quê |
| Evidência gerada nesta rodada por este crítico | "Builder disse que funciona" |
| Lacuna acionável ("Adicionar label ao botão X") | Lista de 20 nitpicks sem prioridade |

---

## Regra de reabertura

- **Uma única reprovação** de **qualquer** um dos cinco críticos → **reabre a rodada daquele codelet**.
- Codelets **já aprovados** na mesma feature **não** reabrem.
- Builder recebe:
  - Nome do crítico que reprovou.
  - Lacuna exata (uma frase).
  - **Não** recebe vereditos dos críticos que aprovaram (evita overfitting).
- Nova rodada: builder corrige → **cinco críticos de novo** (contexto limpo, rodada nova, evidência nova).

Contagem de rodadas: ver [`references/orcamento.md`](references/orcamento.md).

---

## Fluxo resumido por codelet

```
Rodada N:
  1. Builder (Task) → artefatos
  2. Detectar harness / isolar sessões
  3. Cinco críticos (Task × 5, paralelo se possível)
  4. Todos aprovaram? → codelet APROVADO → próximo codelet ou consolidação
  5. Algum reprovou? → N < teto? → Rodada N+1 com lacuna
  6. N = teto? → relatório de lacuna residual (não aprovar)
```

---

## Orquestrador vs subagentes

| Papel | Quem |
|-------|------|
| Builder | Task subagent |
| Cada crítico | Task subagent separado |
| Agregar vereditos, decidir reabertura, contar rodadas, relatório final | Agente **orquestrador** (chat principal) — **não** delegar consolidação a novo subagente |

O orquestrador **pode** ler vereditos dos críticos para coordenar — mas **não** substitui crítico nem aprova no lugar deles.
