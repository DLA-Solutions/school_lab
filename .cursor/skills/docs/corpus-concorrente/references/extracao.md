# Extração por artigo

Um objeto JSON por artigo, uma linha por objeto, em `.corpus-raw/<concorrente>/extracao.jsonl`.

O trabalho aqui é ler como engenheiro de domínio, não como leitor de manual. A pergunta em cada artigo é: *o que este texto revela sobre como o sistema deles está modelado por dentro, e onde o usuário tropeça?*

## Schema

```json
{
  "fonte": "https://suporte.exemplo.com/hc/pt-br/articles/360001",
  "concorrente": "proesc",
  "titulo": "Como lançar notas de recuperação",
  "atualizado_em": "2025-11-03",
  "dominio": ["boletim", "diario"],
  "ator": "professor",
  "tarefa": "lançar nota de recuperação em etapa encerrada",
  "passos": 9,
  "pre_requisitos": [
    "etapa precisa estar reaberta pela coordenação",
    "regra de recuperação configurada no ano letivo"
  ],
  "entidades": ["etapa", "avaliacao", "nota", "aluno", "turma"],
  "campos": [
    {"entidade": "avaliacao", "nome": "peso", "tipo": "decimal", "obrigatorio": true},
    {"entidade": "nota", "nome": "tipo", "tipo": "enum", "valores": ["regular", "recuperacao", "conselho"]}
  ],
  "estados": {"etapa": ["aberta", "encerrada", "reaberta"]},
  "transicoes": [
    {"entidade": "etapa", "de": "encerrada", "para": "reaberta", "ator": "coordenacao", "condicao": "ano letivo aberto"}
  ],
  "vocabulario": {"etapa": "período avaliativo (bimestre/trimestre)"},
  "callouts": 3,
  "armadilhas": [
    "reabrir etapa recalcula média de toda a turma, não só do aluno editado",
    "nota de recuperação não aparece no boletim se a regra não estiver configurada antes do lançamento"
  ],
  "recurso": "ambos",
  "tipo_artigo": "como_fazer",
  "aciona_suporte": false
}
```

## Campo a campo

**`ator`** — quem executa. Use o vocabulário de cargo do concorrente quando ele segmenta assim; normalize depois no glossário.

**`tarefa`** — uma frase, verbo no infinitivo, do ponto de vista do usuário. "Lançar nota de recuperação", não "Acessar o menu Avaliações".

**`passos`** — quantidade de ações discretas do usuário no caminho feliz. Conte cliques e preenchimentos, não parágrafos. Aproximação honesta serve; a métrica é comparativa.

**`pre_requisitos`** — tudo que precisa estar verdadeiro antes de começar. **Este campo é ouro.** Pré-requisito é acoplamento escondido: significa que o usuário pode chegar na tela e não conseguir concluir, o que é a forma mais frustrante de falha.

**`campos`** — só os que o artigo revela. Não invente tipos; se o artigo não diz, omita. Campo obrigatório citado explicitamente costuma indicar validação que já gerou chamado.

**`estados` / `transicoes`** — muitas vezes implícitos. "Só é possível cancelar antes da primeira parcela paga" é uma transição com guarda. Extraia mesmo quando o artigo não usa a palavra "estado".

**`callouts`** — quantidade de blocos ATENÇÃO / IMPORTANTE / OBSERVAÇÃO / NOTA. Cada um marca um ponto onde o produto surpreende o usuário e a documentação teve que compensar.

**`armadilhas`** — comportamento não óbvio, efeito colateral, irreversibilidade. Escreva com suas palavras, sempre. É o insumo direto de `casos-de-borda.md`.

**`recurso`** — `manual`, `video` ou `ambos`. Vídeo além do texto indica fluxo que não coube em texto.

**`tipo_artigo`** — classifique em:
- `como_fazer` — procedimento normal
- `resolucao_problema` — "por que X não aparece", "erro ao Y", "como corrigir Z"
- `conceitual` — explica o modelo
- `configuracao` — setup inicial

A proporção de `resolucao_problema` num domínio é o sinal mais forte de todo o corpus. Documentação de conserto existe porque o produto quebra de forma previsível.

**`aciona_suporte`** — `true` se o artigo, em algum ponto do fluxo normal, manda falar com o suporte. Isso significa que o produto não resolve sozinho: é uma feature faltando, documentada pelo próprio fornecedor.

## Erros comuns

**Copiar o texto para dentro do JSON.** Se `armadilhas` virou transcrição, a extração falhou. Reescreva com suas palavras — o objetivo é entender, e reescrever é o teste de que entendeu.

**Extrair só o caminho feliz.** O artigo de "como fazer" quase sempre esconde a borda numa frase solta no meio. Essa frase vale mais que o procedimento.

**Ignorar a data.** Artigo atualizado três vezes em seis meses indica área instável do produto. Sem `atualizado_em`, esse sinal se perde.

**Tratar cada artigo isolado.** Se três artigos descrevem a mesma tarefa por caminhos diferentes, o fluxo tem ramificação mal resolvida. Anote na extração do terceiro.
