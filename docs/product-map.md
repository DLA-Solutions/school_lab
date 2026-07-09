# Mapa do Produto (Monorepo)

## 1. Estrutura

```
school_lab/
  web/     # superfícies web + API
  app/     # aplicativos mobile
  docs/    # visão, âncoras, PRDs e guidelines
```

Monorepo por decisão de produto/organização: contexto único facilita o trabalho
com agentes de IA e mantém web, app e docs coesos. Stack da camada web está
fechada em `docs/web-stack.md`; stack do app mobile ainda é intenção.

## 2. Responsabilidades

### web/

- Superfícies web: backoffice, área da escola, área do professor, área dos pais.
- API que serve web e app (fonte única de regras de negócio).
- (Futuro) landing / página de vendas — pasta dedicada ou dentro de web.

### app/

- Apps mobile: escola, professor, pais.
- Consome a mesma API; não duplica regra de negócio.

### docs/

- `vision.md` — visão e MVP.
- `actors-and-surfaces.md` — atores × canais.
- `product-map.md` — este documento.
- `web-stack.md` — stack da camada web (Rails + Hotwire + API).
- `open-questions.md` — dúvidas em aberto.
- `prds/` — PRDs de domínio (fase posterior) + `template.md`.

## 3. Princípios de organização

- **Uma API, múltiplos canais**: regra de negócio vive na camada de API.
- **Isolamento por escola**: dados de uma escola não se misturam com outra;
  atravessa web e app (detalhes na modelagem).
- **Docs guiam a implementação**: âncoras fechadas → PRDs → (depois) modelagem
  (DSL → DER) → implementação.

## 4. Sequência de trabalho

1. Fechar documentos âncora (vision, actors, product-map, web-stack,
   open-questions).
2. Escrever PRDs de domínio (um por domínio, no template).
3. Modelagem de dados a partir dos PRDs (DSL → DER).
4. Implementação (`web/` com stack definida em `web-stack.md`).
