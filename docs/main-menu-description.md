# Stakeholder menu input (non-normative)

This file preserves the partner's original pt-BR notes. Normative actor, audience, route, and menu
requirements live in [`actors-and-surfaces.md`](actors-and-surfaces.md) and
[`prds/layer-web-spa.md`](prds/layer-web-spa.md) § MVP product menus.

Terminology reconciliation:

- "Pais" below maps to the technical role `guardian` and the product label **Responsável**.
- "Responsável financeiro" is a payer relationship, not a login role.
- The web SPA is delivered first. Mobile ports each stable API/web contract afterward.
- A user with multiple roles or schools chooses an explicit profile/school context; menus are not
  merged.

## Original notes

Atores: Secretária, Coordenadora, Diretor e Vice Diretor, Pais

1. Visão administrativa

Menu

Documentos

- Documentos da unidade: Vigilância sanitária, Resolução de funcionamento, Bombeiros, alvará de funcionamento, regimento interno, projeto pedagógico, edital de matrículas
- Atas de conselho de classe
- Atas de resultados finais
- Atas de reunião com os pais ou acontecimento com as crianças
- Ata de registro administrativo dos colaboradores
  -Acompanhamento PEI
  Calendário anual
  -Calendário escolar
  Emissão de declaração

* matrícula
* quite financeiro
* frequência
  Planos de aula
* Fazer plano de aula (Coordenação precisa aprovar o plano de aula)
* Listar meus planos de aula
  \*Meu PDI
  Envio de mensagens (áudio, foto ou vídeo) - Coordenação e Direção podem ver todas as mensagens enviadas

- pais
- colaboradores
  Alunos
- dossie
  Documentos pessoais
  Ficha de saúde
  Autorização de saída
  - relatórios de turma
    nomes por turma
    nomes dos pais por turma
    quantidade total de alunos
  - Boletins
    Emissão de boletim
    Colaboradores
- dossiê Documentos pessoais, ficha de saúde
- Lista dos colaboradores e botão ver ficha de saúde
- ponto eletrônico
  -autorização de hora extra
  Gestão financeira

* Geração de contratos (assinatura digital)

- Dashboard geral (a receber, inadimplência e outros mais)
- Envio de boletos
- Nota Fiscal
- Mensagens de cobrança

2. Visão dos pais

Meus dados

- dados cadastrais
- meu contrato
  Meu filho
  -dados cadastrais
  Comunicação
  -Falar com o Professor
  -Falar com a Coordenação
  Calendário
  Financeiro
- Meus boletos
- Histórico de pagamento
  Imposto de renda

## Responsável portal initiative menu (Aug 2026)

These six items are the navigation scope of the current **guardian portal initiative**, not the
complete School Lab MVP guardian capability set and not a claim that every destination is
implemented. Clients show only implemented, authorized destinations; planned or legally gated
items remain hidden:

1. Dashboard
2. Meus boletos
3. Boletins
4. Preceptoria
5. Meus pedidos
6. Imposto de renda

The broader MVP still includes **Mensagens**, **Comunicados**, and guardian-visible **Documentos**
under the Communication and Documents & Archive contracts. Those capabilities may live in their
own navigation group/tab and are not removed, deferred, or reclassified merely because they are
outside this six-item initiative.

Staff registries, grade entry, classes/lessons administration, staff finance settings, contracts,
and the staff Solicitações queue are excluded from the Responsável audience.

### Disposition of every original Responsável item

The table below is the complete reconciliation of § Original notes. A group label does not imply a
route. A destination remains hidden until its API and `frontend/app` route are implemented. The
guardian self-service portal is delivered in `frontend/app` first; mobile parity follows each
stable API/web contract. Push-driven communication remains mobile-priority without moving portal
ownership to `frontend/backoffice`.

| Original item | Normative disposition | Destination / contract |
|---------------|-----------------------|------------------------|
| `Meus dados` | Group label; no standalone route | **Perfil** under [`identity-and-onboarding/profiles.md`](prds/identity-and-onboarding/profiles.md) |
| `dados cadastrais` *(under Meus dados)* | MVP, web first; Responsável edits only fields allowed by the profile contract | **Perfil** — `GET/PATCH /me` |
| `meu contrato` | Phase 2; hidden in MVP because enrollment-contract signature/vendor scope is unresolved | [`identity-and-onboarding/onboarding.md`](prds/identity-and-onboarding/onboarding.md) future enrollment-contract integration |
| `Meu filho` | Context group, not a separate registry | Dashboard child switcher from `GET /me`; family scope comes from `student_guardians` |
| `dados cadastrais` *(under Meu filho)* | MVP read summary only when the child-profile API exists; no guardian edit authority is inferred | Dashboard/child summary; staff-owned student editing remains outside the Responsável menu |
| `Comunicação` | MVP on web and mobile; mobile is priority for push-driven use, while any web destination stays hidden until implemented | [`communication/`](prds/communication/index.md) |
| `Falar com o Professor` | One family-scoped conversation entry point; recipient must be an assigned teacher | Communication composer/thread contract |
| `Falar com a Coordenação` | Same conversation entry point with a school/coordination recipient; not a separate authorization model | Communication composer/thread contract |
| `Calendário` | MVP read-only target; contract specified 2026-10-07 (`GET /me/calendar/events`), still hidden until the route and frontend screen are implemented | [`platform-and-admin/calendar.md`](prds/platform-and-admin/calendar.md) BR-CA07/UC-CA04; no guardian calendar-edit route is exposed |
| `Financeiro` | Group label; no standalone route | **Meus boletos**, payment history, and **Imposto de renda** |
| `Meus boletos` | MVP, web first; visible when implemented | [`billing/guardian-portal.md`](prds/billing/guardian-portal.md) |
| `Histórico de pagamento` | MVP within **Meus boletos**, not a duplicate top-level item | Paid/history filter in the guardian billing portal |
| `Imposto de renda` | MVP contract, web first; release remains legal/accounting-gated | [`billing/tax-declarations.md`](prds/billing/tax-declarations.md) |
