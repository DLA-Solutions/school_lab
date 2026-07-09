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

- [ ] Além de notas, o professor precisa de frequência (chamada) no MVP?
- [ ] Modelo de avaliação (bimestre, trimestre, conceitos x notas)?

## Educação infantil / Rotina diária

- [ ] Entra no MVP ou fase 2? (ainda indefinido — potencial diferencial
      competitivo para escolas com berçário/infantil, mas aumenta escopo)
- [ ] Campos do registro: alimentação, sono, higiene/fralda, saúde, humor,
      fotos, recados (confirmado como conjunto desejado — falta detalhar
      granularidade de cada campo, ex.: alimentação por refeição ou geral)
- [ ] Como diferenciar turma de "educação infantil" x "fundamental/médio" na
      modelagem — por segmento da turma, por escola, ou configurável?
- [ ] Frequência/granularidade de registro: por período do dia
      (manhã/tarde) ou por evento pontual (cada troca de fralda, cada
      refeição)?
- [ ] Notificação aos pais: em tempo real a cada registro, ou resumo diário
      consolidado?
- [ ] Fotos do dia: entram nesta feature ou dependem do módulo de arquivo
      digital (`docs/vision.md` — arquivo/auditoria)?
- [ ] Retenção/histórico: por quanto tempo o histórico de rotina fica
      disponível para os pais?

## Comunicação (fase 2)

- [ ] Entra no MVP ou fica fase 2? (ainda indefinido)
- [ ] Tipos: chat 1:1 pai↔professor, chat 1:1 pai↔escola/secretaria,
      comunicados em massa (com confirmação de leitura), comentários
      contextuais em registros de rotina/notas — todos entram juntos ou
      por etapas?
- [ ] Comunicado em massa: por escola toda, por turma, ou ambos?
- [ ] Confirmação de leitura é obrigatória em comunicados? Vira registro
      auditável (`docs/vision.md` — arquivo digital)?
- [ ] Expectativa de horário de resposta do professor — como evitar
      cobrança de disponibilidade 24/7? (silenciar fora do expediente,
      aviso de "resposta no próximo dia útil")
- [ ] Escalonamento: se professor não responde em X tempo, mensagem sobe
      para coordenação/escola?
- [ ] Notificações push: imediatas para tudo, ou só para urgente
      (ex.: saúde) com resumo diário para o resto?
- [ ] Isolamento: garantir que pai nunca veja conversa/comunicado de outra
      família — enforcement via policy, igual isolamento entre escolas?

## LGPD / Privacidade

- [ ] Base legal para tratamento de dados de crianças — quem consente
      (responsável legal) e onde isso é registrado no cadastro do aluno?
- [ ] Papéis LGPD: escola como controladora, DLA como operadora — precisa
      de Encarregado de Dados (DPO)? De quem é a responsabilidade formal?
- [ ] Dados sensíveis (saúde — campos de rotina infantil, remédios,
      ocorrências): precisam de tratamento/retenção diferenciado dos
      demais dados?
- [ ] Retenção: por quanto tempo mensagens, fotos e registros de rotina
      ficam guardados? O que acontece quando o aluno sai da escola?
- [ ] Auditoria de acesso: registrar quem visualizou mensagens/comunicados
      (relevante em caso de conflito escola↔família)?
- [ ] Direitos do titular (acesso, correção, exclusão) exercidos pelo
      responsável em nome da criança — fluxo definido?
- [ ] Termo de consentimento/política de privacidade — texto jurídico
      próprio ou apoio externo (jurídico especializado em educação)?

## GTM / negócio

- [ ] Formato da parceria com o Sindicato (comercial, precificação)?
- [ ] Modelo de cobrança da plataforma (por aluno, por escola, por plano)?

## Stack web

Decisões fechadas em `docs/web-stack.md`. Pendências:

- [ ] Serialização da API: `jsonapi-serializer` vs. `blueprinter`?
- [ ] Auth web: Rails 8 Authentication Generator vs. Devise?
- [ ] Real-time no MVP (Solid Cable / Turbo Streams) ou fase 2?
- [ ] Provider de e-mail (Postmark, SES, etc.)?
- [ ] Integração de boleto (gateway/banco)?
- [ ] Quando adicionar Redis (só cache) — critério de escala?
