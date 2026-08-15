# Teto e consolidação (fase 7)

## Teto de rodadas

| Parâmetro | Valor padrão | Ajuste |
|-----------|--------------|--------|
| Rodadas máximas por codelet | **5** | Aumentar **somente** se usuário pedir explicitamente maior rigor em codelet específico |
| Reduzir teto por pressa | **Proibido** | Orquestrador nunca encurta por "já rodou muito" |

Contagem: cada reabertura após reprovação de qualquer crítico = nova rodada (builder + cinco críticos de novo).

---

## Comportamento no teto

Quando um codelet atinge **5 rodadas** sem **aprovação unânime** dos cinco críticos:

### O que a skill NÃO faz

- ❌ Aprovar por exaustão
- ❌ Aprovar "com ressalvas" silenciosas
- ❌ Escolher "melhor tentativa" como mergeável
- ❌ Ocultar críticos ainda reprovando

### O que a skill faz

Produz **relatório de lacuna residual** para aquele codelet:

```markdown
## Codelet [N]: [nome] — GAP RESIDUAL (teto de rodadas)

Rodadas executadas: 5/5

Críticos ainda reprovando:
| Crítico | Última lacuna |
|---------|---------------|
| Contrato | ... |
| Padrão | — (aprovado rodada 5) |
| Usuário hostil | ... |
| Paridade bar | ... |
| Estado adverso | ... |

Histórico resumido:
- Rodada 1: Contrato reprovou — [lacuna]
- Rodada 2: Estado adverso reprovou — [lacuna]
- ...
- Rodada 5: Usuário hostil reprovou — [lacuna]

Artefato atual: [paths]
```

Entregue ao usuário como parte do resultado final — **não escondido**.

---

## Teto de concorrência de agentes

Ao disparar fan-out de builders ou críticos em paralelo:

1. Observar limite prático de subagentes simultâneos do ambiente (ferramenta Task / multitask).
2. Se codelets pendentes > capacidade: processar em **lotes** (ex.: 3 builders, depois próximo lote).
3. Mesma regra para críticos — 5 críticos × N codelets pode exceder limite; serializar por codelet (5 paralelos max por codelet) e codelets em lote.

**Prioridade:** isolamento de harness > velocidade máxima.

---

## Consolidação final

Após **todos** os codelets terminarem (aprovados **ou** no teto):

O **agente orquestrador** (chat principal — **não** subagente novo) agrega **um único relatório** para o usuário.

### Estrutura do relatório consolidado

```markdown
# Codelet Loop — Resultado: [nome da feature]

## Resumo
- Codelets aprovados: X/Y
- Codelets com gap residual: Z/Y
- Harness: nível [A/B/C]
- Bar: [referência uma linha]

## Aprovados

### Codelet 1: [nome]
Evidência-chave: [uma frase — o que provou qualidade]
Arquivos: [...]

### Codelet 2: ...

## Gaps residuais

### Codelet 4: [nome]
Lacuna mais grave: [uma frase]
Críticos ainda reprovando: [lista]
Sugestão: [próximo passo concreto — opcional, uma frase]

## Limitações de harness
- [casos manuais pendentes, se houver]

## Artefatos
- AC: docs/prds/[domain]/[slug].md
- [paths principais alterados]
```

### O que NÃO incluir no relatório final

- Vereditos crus completos dos cinco críticos de cada rodada (ruído)
- Chain-of-thought do builder
- Evidência duplicada de múltiplos críticos para o mesmo fato

O relatório consolidado **é o produto** — denso, acionável, honesto.

---

## Decisão explícita de entrega

| Estado final | Mensagem ao usuário |
|--------------|---------------------|
| Todos codelets aprovados | "Feature completa no critério do loop. Evidência em [seção]." |
| Algum gap residual | "Feature **não** aprovada pelo loop. Gaps em [seção]. Não mergear assumindo qualidade impecável." |
| Parado em nível C | "Loop não executado — ambiente insuficiente. [pedido específico]." |

**Nunca** um terceiro caminho: "aprovar porque já rodou muito" ou "bom o suficiente para MVP" sem o usuário pedir explicitamente **fora** desta skill.

---

## Honestidade sobre convergência

O objetivo aspiracional ("impecável", "sem hesitar") **pode não ser alcançado** dentro do teto.

A skill trata isso como **sucesso do processo**, não falha:

- Aprovar **com evidência** = entrega confiável.
- Entregar **relatório de lacuna** = entrega honesta — usuário decide se aumenta teto, aceita gap, ou muda escopo.

Ambos são resultados válidos. Aprovação forçada não é.
