---
name: corpus-concorrente
description: Transforma bases de ajuda públicas de concorrentes (help center, central de suporte, documentação de produto) em um corpus de referência estruturado em docs/ref/ — modelo de domínio, glossário de nomenclatura, casos de borda, mapa de atrito e divergências entre concorrentes. Use sempre que o usuário mencionar raspar ou analisar concorrente, benchmark de produto, engenharia reversa de domínio, "base de ajuda do X", montar docs/ref/, descobrir como um produto existente resolve um fluxo, ou quiser fundamentar critérios de aceite em comportamento real observado em vez de inventado — mesmo que ele não use as palavras "skill", "raspagem" ou "corpus".
---

# Corpus de concorrente

Uma base de ajuda pública é o backlog de features do concorrente, já ordenado por dor. Cada artigo existe porque alguém abriu chamado. Quinze artigos sobre lançamento de nota significam que lançamento de nota é confuso no produto deles — isso é pesquisa de UX que o concorrente pagou e publicou.

Esta skill converte essa base em quatro artefatos que alimentam o desenvolvimento: **modelo de domínio**, **glossário**, **mapa de atrito** e **divergências**. O alvo é sempre o domínio, nunca o layout.

## Antes de qualquer coisa: higiene

Leia `references/higiene.md` na primeira execução de cada projeto. O resumo operacional:

- **Só conteúdo público.** Nada atrás de login, paywall ou trial. Se a página pede autenticação, ela sai do escopo — sem exceção, sem "só pra ver".
- **Respeite robots.txt e vá devagar.** Um artigo a cada 1–2 segundos. Você está lendo documentação, não fazendo carga.
- **O corpus é derivado, não cópia.** Guarde fatos, estrutura, nomes de campo, transições de estado, contagem de passos. Não guarde parágrafos verbatim no `docs/ref/` final, e não versione HTML bruto no repositório.
- **Screenshot serve para entender fluxo, nunca para reproduzir.** Copiar a UI significa herdar os defeitos que você acabou de mapear.
- **Proveniência sempre.** Toda afirmação em `docs/ref/` carrega a URL de origem. Sem URL, é palpite, e palpite entra marcado como tal.

Se o usuário pedir para raspar algo autenticado, para copiar textos inteiros ou para clonar telas, recuse essa parte e explique o porquê — o resto do trabalho continua valendo.

## Pipeline

Seis fases. Não pule a 0 nem a 5 — são as que separam corpus útil de pilha de arquivos.

### Fase 0 — Reconhecimento

Antes de baixar nada, entenda o terreno:

1. Localize a base de ajuda. Padrões comuns: `suporte.<dominio>`, `ajuda.<dominio>`, `help.<dominio>`, `docs.<dominio>`, ou um site externo (Zendesk, Intercom, Document360, HelpScout, Notion, Google Sites).
2. Identifique a plataforma — determina o método de colheita. `scripts/harvest.py --detect <url>` faz isso.
3. **Registre a taxonomia. Ela é um achado, não um detalhe de navegação.** Como o concorrente organiza a ajuda revela seu modelo mental de produto. Segmentar por cargo (Secretaria, Financeiro, Professor) indica produto pensado por persona; segmentar por módulo indica produto pensado por estrutura de software. Isso muda o que você vai encontrar e vale anotar no `README.md` do corpus.
4. Conte os artigos por categoria antes de baixar. A distribuição já é sinal.

Relate ao usuário o que encontrou e confirme o escopo antes de colher. Base grande (500+ artigos) pede recorte por domínio.

### Fase 1 — Colheita

```bash
python scripts/harvest.py --url <base-url> --out .corpus-raw/<concorrente>/ --rate 1.5
```

O script detecta a plataforma e usa o método certo: API pública do Zendesk quando existe, `sitemap.xml` quando existe, varredura de links do índice como último recurso. Salva um `.md` por artigo com a URL e a data de atualização no cabeçalho, mais um `indice.json`.

Coloque `.corpus-raw/` no `.gitignore`. O material bruto é insumo de trabalho, não artefato do projeto.

Se o script falhar contra uma plataforma nova, colha manualmente com as ferramentas disponíveis e mantenha o mesmo formato de saída — o resto do pipeline depende só do formato.

### Fase 2 — Classificação

Agrupe os artigos por domínio funcional, não pela categoria do concorrente. Os domínios saem do produto que está sendo construído; num sistema escolar, por exemplo: matrícula, diário, boletim, financeiro, transferência, comunicação.

Um artigo pode cair em mais de um domínio. Quando cai, anote — **fluxo que aparece em vários domínios é fluxo com acoplamento**, e isso vira caso de borda depois.

### Fase 3 — Extração

Aqui é onde o julgamento importa, e por isso é feito lendo, não com script. Leia `references/extracao.md` para o schema completo e os exemplos.

Para cada artigo, produza uma linha em `.corpus-raw/<concorrente>/extracao.jsonl` com: ator, tarefa, contagem de passos, pré-requisitos, entidades, campos, estados, transições, vocabulário, contagem de avisos, armadilhas e formato do recurso.

Duas regras que decidem a qualidade:

- **Extraia o modelo, não o texto.** "Clique em Salvar e depois em Confirmar" vira `passos: 2` e uma nota de que a operação tem confirmação em dois estágios. Não vira citação.
- **Vocabulário é dado de primeira classe.** Registre o termo exato do concorrente. Uma secretária que vem de outro sistema fala "ocorrência"; se o seu produto chamar de "registro disciplinar", ela erra. Nomenclatura é custo de migração.

### Fase 4 — Síntese por domínio

Para cada domínio, escreva três arquivos em `docs/ref/<dominio>/`:

**`modelo-de-dominio.md`** — entidades, atributos, estados e transições, com a URL de origem em cada afirmação. Quando um estado só aparece implícito ("o contrato só pode ser cancelado antes da primeira parcela"), registre como inferido e marque.

**`fluxos.md`** — o caminho feliz de cada tarefa, em passos numerados, com ator e pré-condições. É a base dos critérios de aceite.

**`casos-de-borda.md`** — tudo que o caminho feliz não cobre: aluno que entra no meio do ano, etapa já encerrada, estorno, dado faltando, permissão insuficiente. **Este é o arquivo de maior valor do corpus.** Casos de borda são o que separa demo de produto, e o concorrente já pagou para descobri-los.

### Fase 5 — Mapa de atrito

```bash
python scripts/atrito.py .corpus-raw/<concorrente>/extracao.jsonl --out docs/ref/lacunas.md
```

O script pontua cada fluxo por sinais de dor e devolve um ranking. Leia `references/atrito.md` para o que cada sinal significa e como interpretar o resultado — o número é ordinal, serve para ordenar, não para medir.

Depois do script, faça a passada de julgamento: para os cinco fluxos mais atritados, escreva **por que** o fluxo dói e **qual decisão de produto** o seu sistema toma diferente. Sem essa frase, o mapa de atrito é estatística inútil.

Esse arquivo é a vantagem competitiva declarada do produto. Trate como documento de posicionamento, não como anexo técnico.

### Fase 6 — Divergências

Com dois ou mais concorrentes no corpus, compare os modelos de domínio e escreva `docs/ref/divergencias.md`.

**Onde os concorrentes discordam, o domínio é genuinamente difícil.** Se um trata rematrícula como novo contrato e o outro como renovação do mesmo, não é capricho — é uma tensão real do negócio que alguém vai te cobrar depois. Cada divergência vira uma decisão explícita e registrada, não uma escolha acidental de implementação.

Se houver só um concorrente no corpus, diga ao usuário o que ele está perdendo e sugira o segundo.

## Estrutura de saída

```
docs/ref/
├── README.md          # escopo, data da colheita, concorrentes, taxonomia de cada um
├── glossario.md       # termo do concorrente → termo nosso → definição
├── divergencias.md    # onde os concorrentes discordam + decisão tomada
├── lacunas.md         # mapa de atrito ordenado + posicionamento
└── <dominio>/
    ├── modelo-de-dominio.md
    ├── fluxos.md
    └── casos-de-borda.md
```

O `README.md` precisa registrar a **data da colheita**. Corpus envelhece: o concorrente lança versão, reescreve a ajuda, e afirmação sem data vira lenda interna. Recolha semestralmente ou quando o concorrente anunciar release grande.

### Glossário

Tabela com uma coluna por concorrente:

| Nosso termo | Sponte | Proesc | Definição | Decisão |
|---|---|---|---|---|
| ocorrência | ocorrência | registro | evento disciplinar ou pedagógico ligado a um aluno | adotamos "ocorrência" — mais difundido na base instalada |

Regra: **prefira o termo que o usuário já conhece**, a menos que ele seja ativamente errado ou ambíguo. Vocabulário novo é imposto de migração cobrado do cliente.

## Ligação com docs/ac/

O corpus só cumpre função se os critérios de aceite se ancorarem nele. Ao escrever `docs/ac/`, cada critério carrega uma âncora:

```markdown
- [ ] Matrícula de transferido no meio do ano aceita histórico parcial
      da escola anterior sem travar o boletim.
      → docs/ref/matricula/casos-de-borda.md#transferencia-parcial
```

Critério sem âncora leva a marca `[inventado]`. Não é proibido — parte do produto é original, e deve ser. Mas a proporção de inventados é um indicador: alta demais no começo geralmente significa que a extração foi rasa, e você está projetando suposições em cima de um domínio que já tem resposta documentada.

## Como relatar ao usuário

Ao terminar, entregue nesta ordem: quantos artigos por concorrente e por domínio, os cinco fluxos mais atritados com o motivo, as divergências encontradas, e o que ficou de fora do escopo. Depois pergunte qual domínio ele quer aprofundar primeiro — o corpus é vivo e a primeira passada é sempre irregular.

Não apresente o mapa de atrito como veredito. Apresente como hipótese ordenada que ainda precisa de validação com usuário real.
