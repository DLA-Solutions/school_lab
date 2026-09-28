# Mapa de atrito

A premissa: **documentação é dívida de UX materializada.** Todo artigo existe porque o produto não se explicou sozinho. Volume, formato e tipo dessa documentação medem, indiretamente, onde o produto machuca.

A premissa é boa, mas não é infalível — leia "Limites" no fim antes de apresentar resultado a alguém.

## Sinais e pesos

`scripts/atrito.py` agrega por tarefa e pontua:

| Sinal | Peso | Por que importa |
|---|---|---|
| Artigos de `resolucao_problema` no fluxo | 3,0 | O sinal mais forte. Documentação de conserto significa quebra previsível e recorrente. |
| `aciona_suporte` verdadeiro | 2,5 | O fornecedor admite que o produto não resolve sozinho. Feature faltando, autodeclarada. |
| Pré-requisitos por artigo | 2,0 | Acoplamento escondido: o usuário chega na tela e não consegue concluir. |
| Armadilhas registradas | 2,0 | Efeito colateral e irreversibilidade. Cada uma é um caso de borda que você ganha de graça. |
| Callouts por artigo | 1,5 | Cada aviso é um ponto onde o produto surpreende e o texto compensa. |
| Passos acima da mediana do corpus | 1,5 | Comparado ao próprio produto, não a um ideal abstrato. |
| Total de artigos no fluxo | 1,0 | Volume bruto. Sinal fraco sozinho, útil como multiplicador. |
| Vídeo além do manual | 1,0 | O texto não bastou. Costuma marcar fluxo espacial ou com muitos estados. |
| Reescrito 2+ vezes em 12 meses | 1,0 | Área instável — ou o produto muda muito, ou a explicação nunca acertou. |

Os pesos são um ponto de partida calibrado para software de gestão B2B. Ajuste conforme o domínio e registre o ajuste no `README.md` do corpus.

## Como o score se comporta

É **ordinal**. Serve para ordenar fluxos entre si dentro do mesmo corpus. Não é porcentagem, não compara entre produtos de categorias diferentes, e a diferença entre 40 e 38 não significa nada. Use para escolher onde olhar primeiro, nunca como número em slide.

Compare o mesmo fluxo entre concorrentes — aí sim é informativo. Se matrícula dói nos dois, é dificuldade intrínseca do domínio e você precisa de uma solução real, não de um capricho de UI. Se dói só em um, o outro descobriu algo: vá ver o quê.

## A passada de julgamento

O script ordena; ele não explica. Para os cinco primeiros, escreva à mão:

1. **Qual é a dor**, em uma frase, do ponto de vista do usuário — não do sistema.
2. **Qual a causa provável** no modelo deles. Passo demais costuma ser sintoma de entidade mal modelada, não de tela ruim.
3. **O que decidimos diferente**, concretamente.
4. **O que isso custa.** Toda simplificação tira flexibilidade de alguém. Se você não consegue nomear quem perde, provavelmente não entendeu o fluxo.

O item 4 é o que impede o mapa de atrito de virar arrogância. O concorrente tem dez anos de cliente reclamando; a complexidade dele geralmente tem origem, mesmo quando a solução ficou ruim.

## Limites

**Documentação boa parece atrito.** Um fornecedor que documenta bem acumula artigos sem que o produto seja pior. Cheque a proporção de `resolucao_problema` — é o que separa "documenta muito" de "quebra muito".

**Documentação ausente esconde atrito.** Fluxo sem artigo nenhum pode ser óbvio, ou pode ser tão obscuro que ninguém usa. Cruze com a estrutura de menu do produto antes de concluir.

**Base de ajuda envelhece torto.** Artigo de 2019 pode descrever tela que não existe. Se `atualizado_em` for muito antigo, rebaixe o peso ou tire do corpus.

**O concorrente pode ter mudado.** Corpus é foto, não vídeo. Registre a data e recolha semestralmente.

**Você está lendo a documentação, não o produto.** Toda conclusão aqui é hipótese sobre o produto, derivada de um proxy. Ela ordena onde investigar — não substitui usar o sistema nem conversar com quem usa. Se a decisão for cara, valide antes.
