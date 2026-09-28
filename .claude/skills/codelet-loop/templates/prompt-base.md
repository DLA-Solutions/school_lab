# Prompt base — Codelet Loop

> Template preenchido por `scripts/montar_prompt.py`. O prompt final deve ser autocontido — executável por um agente que nunca viu o restante da skill.

---

Construa: **[FEATURE]**

## CRITÉRIOS DE ACEITE

Arquivo: `docs/prds/[domain]/[slug].md`

```
[CRITERIOS_ACEITE]
```

## BAR

```
[BAR_REFERENCIA]
Justificativa: [BAR_JUSTIFICATIVA]
Reconhecidamente ruim: [BAR_RUIM_SIM_NAO]
```

## NÃO-OBJETIVOS

```
[NAO_OBJETIVOS]
```

## DECOMPOSIÇÃO EM CODELETS

```
[LISTA_CODELETS]
```

---

## INSTRUÇÕES DE EXECUÇÃO — CODELET LOOP

Você é o **orquestrador**. Siga as fases abaixo. Não pule etapas. Não aprove no lugar dos críticos.

### Pré-voo

1. Confirme que **Task subagents** estão disponíveis. Se não estiverem: **pare** e informe o usuário que simular contexto limpo é proibido — não continue.
2. Detecte **nível de harness** (A/B/C) conforme abaixo. Se nível **C**: **pare** e peça ambiente ou MCP de navegador — nunca julgue só pelo diff.
3. Nível detectado para esta execução: **[HARNESS_NIVEL]**
4. Comandos de verificação detectados: **[HARNESS_COMANDOS]**

### Fase 5 — Por cada codelet (respeitar dependências)

#### Builder

Dispare **um Task subagent** por codelet com prompt autocontido: escopo, ACs deste codelet, bar, paths pertinentes, não-objetivos, casos adversos.

Codelets independentes: builders em **paralelo** (múltiplos Task numa mensagem).

#### Críticos (após builder do codelet)

Dispare **cinco Task subagents separados** — contexto limpo inegociável:

| Crítico | Input principal |
|---------|-----------------|
| **Contrato** | AC deste codelet + harness |
| **Padrão/consistência** | Convenções do repo + paths alterados |
| **Usuário hostil** | **SOMENTE** história de uso em linguagem natural — sem AC, bar, código |
| **Paridade com bar** | Bar + resultado via harness |
| **Estado adverso** | Casos adversos deste codelet |

**Proibições explícitas para críticos:**

- ❌ Ver raciocínio do builder
- ❌ Ver veredito de outro crítico
- ❌ Reaproveitar evidência do builder ou de outro crítico
- ❌ Aprovar sem evidência gerada por si nesta rodada
- ❌ Aprovar por inspeção de diff sem execução real (nível A/B)

**Pré-registro obrigatório:** cada crítico escreve o que espera encontrar **antes** de abrir o resultado.

**Veredito binário:** APROVADO ou REPROVADO + lacuna mais grave em uma frase.

**Isolamento paralelo:** sessões de navegador/estado separadas por crítico quando em paralelo.

### Reabertura

- **Uma** reprovação de **qualquer** crítico → reabre **só este codelet**.
- Builder recebe lacuna nomeada — não recebe vereditos dos que aprovaram.
- Nova rodada = builder + cinco críticos de novo, evidência nova.

### Teto de rodadas

- **5 rodadas por codelet** (padrão).
- No teto **sem** aprovação unânime: **relatório de lacuna residual** — **nunca** aprovar por exaustão.
- Comportamento no teto: listar críticos ainda reprovando, última lacuna de cada, histórico resumido.

### Consolidação final (orquestrador — você)

Após todos codelets (aprovados ou no teto), entregue **um único relatório**:

1. Codelets **aprovados** — evidência-chave de cada (uma frase).
2. Codelets com **gap residual** — lacuna mais grave de cada (uma frase).
3. Limitações de harness / verificação manual pendente.
4. **Não** despeje vereditos crus dos cinco críticos — consolide.

---

## Referência rápida de qualidade

- Objetivo aspiracional: qualidade verificável, não adjetivo.
- Resultado válido: aprovação com evidência **ou** relatório honesto de lacuna.
- Terceiro caminho proibido: "aprovar porque já rodou muito".

---

## Metadados (preenchimento automático)

- Slug: `[slug]`
- Domain: `[domain]`
- Gerado em: `[timestamp]`
- Modo: `[interativo|parametrizado]`
