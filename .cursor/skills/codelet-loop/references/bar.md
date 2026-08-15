# Definição do bar (fase 3)

## O que é o bar

O **bar** é uma referência externa concreta e observável contra a qual o resultado é comparado — **nunca** um adjetivo, **sempre** algo que se pode apontar e dizer "aqui está, compare".

| Bar válido | Bar inválido |
|------------|--------------|
| "Fluxo de reenvio de boleto do Proesc documentado em `docs/ref/proesc/gestao-financeira/fluxos.md`, seção X" | "Ficar bom o suficiente" |
| "Tela de login do GitHub — 2 campos, submit, erro inline" | "Seguir boas práticas de UX" |
| "Endpoint existente `POST /api/v1/invites` como referência de estrutura de erro" | "Ser consistente com o resto do app" (sem instância) |
| "Tempo de resposta < 300ms medido com `curl` contra staging" | "Ser rápido" |

O bar existe para que o crítico de **paridade com o bar** (fase 5) tenha algo comparável — passos, ambiguidade, pré-requisitos, casos de borda.

---

## Caminho com corpus disponível

Se o projeto tiver pasta de referência de concorrentes/benchmarks, detectar automaticamente. Exemplos comuns:

- `docs/ref/` (corpus gerado por skill de pesquisa de concorrência)
- `docs/benchmarks/`
- `references/competitors/`
- Qualquer estrutura equivalente encontrada via busca no repositório

### Procedimento

1. Identificar o fluxo ou componente documentado **mais próximo** da tarefa.
2. Extrair do documento: contagem de passos, pré-requisitos, casos de borda já mapeados, nomenclatura usada.
3. Propor ao usuário: "Sugiro como bar: [citação concreta do corpus]. Confirma?"
4. Só travar o bar após confirmação explícita do usuário (ou confirmação implícita se o usuário já nomeou o concorrente no pedido original).

### O que registrar

- Caminho do arquivo ou URL do corpus.
- Seção ou trecho específico.
- Uma frase: por que este fluxo é o bar (proximidade funcional, não marketing).

---

## Fallback sem corpus (caminho padrão)

Trate como **primeira classe**, não exceção. A maioria dos projetos não terá corpus estruturado.

O builder (ou o script de levantamento) deve **nomear um bar antes de codar qualquer coisa**.

### Opções válidas, em ordem de preferência

1. **Produto real equivalente** que o usuário conhece e pode nomear.
   - Ex.: "Wizard de checkout do Stripe", "Modal de confirmação do Linear", "Fluxo de invite do Slack."

2. **Exemplo já existente no próprio repositório** que resolve problema parecido bem.
   - Ex.: "Mesmo padrão de `InvitesController#create` para estrutura de erro 422."
   - Ex.: "Componente `ConfirmDialog` usado em billing/delete."

3. **Métrica mensurável** independente de opinião.
   - Tempo de resposta (ms, p95).
   - Número de passos/cliques para completar tarefa.
   - Taxa de erro em conjunto de casos de teste nomeados.

### Bar inválido — fase não avança

- "O que eu acho que fica bom."
- "Seguir boas práticas" sem instância concreta anexada.
- "Melhor que antes" sem definir "antes".
- Adjetivo sem proxy (volta para fase 2).

Se o builder não conseguir nomear bar concreto após as três opções, **volta a perguntar ao usuário** — não assume.

---

## Bar reconhecidamente ruim

Às vezes o bar externo é ruim de propósito ("não queremos pior que X, mas X também é confuso"). Neste caso:

1. Registrar explicitamente no topo do AC: "Bar reconhecidamente ruim: [motivo]."
2. O crítico de paridade **reprova empate** — implementação deve ser **estritamente melhor** que o bar em pelo menos uma dimensão mensurável (menos passos, menos ambiguidade, ou caso adverso coberto que o bar ignora).

---

## Registro

O bar escolhido, com justificativa em uma frase, fica escrito na seção **Bar** de `docs/prds/<domain>/<feature-slug>.md`:

```markdown
## Bar

**Referência:** [nome ou caminho concreto]
**Justificativa:** [uma frase — por que este bar]
**Reconhecidamente ruim:** [sim/não — se sim, em que dimensão deve superar]
```

Todos os críticos consultam este bloco. O crítico de **usuário hostil** é o único que **não** recebe o bar (por design — ver `references/criticos.md`).
