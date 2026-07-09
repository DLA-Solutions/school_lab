# Perguntas em Aberto

Backlog vivo de decisões que ainda não estão fechadas. Cada item deve virar
decisão registrada (em vision/actors) ou PRD.

## MVP e escopo

- [ ] Confirmar escopo do MVP: acadêmico (notas) + financeiro (boleto) +
      arquivo digital. Contratos/assinatura entram em fase 2?
- [ ] Backoffice no MVP: só cadastro de escolas, ou também billing da plataforma?
- [ ] Pais no MVP: só app, ou web também?
- [ ] Professor no MVP: web e app juntos, ou web primeiro?

## Financeiro

- [ ] Quem gera o boleto (escola manual x automático) e qual recorrência?
- [ ] Integração de pagamento/emissão de boleto (banco, gateway)?
- [ ] Tratamento de inadimplência (avisos, bloqueios)?

## Arquivo digital / auditoria

- [ ] Quais documentos a Secretaria/Conselho exige? (lista oficial)
- [ ] Organização: por aluno, por turma, por ano letivo?
- [ ] Retenção e versionamento de documentos?

## Contratos e assinatura (fase 2)

- [ ] Assinatura própria vs. terceiros (ex.: DocuSign com API)?
- [ ] Requisitos legais de validade jurídica no Brasil?

## Acadêmico

- [ ] Além de notas, o professor precisa de frequência/diário no MVP?
- [ ] Modelo de avaliação (bimestre, trimestre, conceitos x notas)?

## Comunicação (fase 2)

- [ ] O que pais ↔ escola ↔ professor precisam trocar?

## GTM / negócio

- [ ] Formato da parceria com o Sindicato (comercial, precificação)?
- [ ] Modelo de cobrança da plataforma (por aluno, por escola, por plano)?

## Stack web

Decisões fechadas em `docs/web-stack.md`. Pendências:

- [ ] Serialização da API: `jsonapi-serializer` vs. `blueprinter`?
- [ ] Auth web: Rails 8 Authentication Generator vs. Devise?
- [ ] Multi-tenancy: scopes manuais vs. gem `acts_as_tenant`?
- [ ] Real-time no MVP (Solid Cable / Turbo Streams) ou fase 2?
- [ ] Provider de e-mail (Postmark, SES, etc.)?
- [ ] Integração de boleto (gateway/banco)?
- [ ] Quando adicionar Redis (só cache) — critério de escala?
