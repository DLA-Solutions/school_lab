# Perguntas em Aberto

Backlog vivo de decisões que ainda não estão fechadas. Cada item deve virar
decisão registrada (em vision/actors) ou PRD.

## Decisões recentes (validação stakeholder — jul/2026)

Registradas a partir de conversa com diretor parceiro (escola NSR). Detalhes
em `docs/vision.md` e `docs/actors-and-surfaces.md`.

- [x] **Comunicação entra no MVP** — prioridade #1 para o segundo semestre.
      Mensagens bidirecionais pai↔professor e pai↔escola, com envio de imagens.
      Áudio fora de escopo.
- [x] **Push notification** — já existe no sistema atual; manter paridade no
      MVP. Entrega via FCM + fila (Solid Queue) + máquina de estado na API.
- [x] **Real-time não é necessário** — informação deve chegar em tempo hábil,
      não em tempo real. Solid Cable / Turbo Streams ficam para fase 2.
- [x] **Web e app no MVP** — ambos os canais desde o início.
- [x] **Cadastro e login** — todos os papéis precisam de registro e autenticação.
- [x] **Educação infantil no MVP** — comunicação cobre a necessidade principal;
      rotina diária estruturada fica para fase posterior.
- [x] **Frequência (chamada) no MVP** — já existe no legado; notificação
      automática de ausência é crítica e deve ser confiável (falha gera
      conflito jurídico).
- [x] **Livro Ata pode ser 100% digital** — o livro físico não é obrigatório;
      o requisito legal é **assinatura digital** válida. Conselho de Educação
      audita esses registros com frequência.

## MVP e escopo

- [ ] Confirmar escopo completo do MVP: comunicação + acadêmico (notas,
      boletim, chamada) + financeiro (boleto) + arquivo digital. O que fica
      de fora neste primeiro corte?
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

## Contratos, assinatura e Livro Ata (fase 2 — prioridade alta)

Stakeholder validou forte interesse. Livro Ata compartilha infra de assinatura
digital com contratos.

- [ ] Assinatura própria vs. terceiros (DocuSign, Authentique, Clicksign)?
      Proposta em avaliação: assinatura avançada própria com rabisco (campo
      desenhado) + e-mail + IP + hash — precisa equivaler ao padrão aceito
      pelo cartório (DocuSign/Authentique). Validação jurídica pendente
      (Lei 14.063/2020).
- [ ] Requisitos legais de validade jurídica no Brasil — confirmar com
      advogado especializado antes de decidir própria vs. terceiro.
- [ ] Tipos de ata no escopo inicial: matrícula, Conselho de Classe,
      resultados finais, reunião com pais, eventos ocorridos na escola
      (incidentes, quedas, etc.) — todos entram juntos ou por etapas?
- [ ] Fluxo de geração da ata: template manual, formulário guiado, ou IA a
      partir de transcrição de áudio/reunião (workflow atual do stakeholder:
      gravação → transcrição → Claude com prompt → revisão)?
- [ ] Integração com transcrição de reunião (Google Meet / ferramenta MCP) —
      fase 2 ou posterior dentro do módulo?
- [ ] Busca semântica no acervo de atas — tecnologia (pgvector, serviço
      externo) e escopo (só atas ou todo arquivo digital)?
- [ ] Impressão formatada para Livro Ata físico — ainda necessária mesmo com
      versão digital válida, ou só para escolas que preferem arquivo híbrido?
- [ ] Migração de atas históricas: escolas antigas têm volume grande no físico;
      escolas com até ~5 anos teriam pouco backlog — oferecer serviço de
      digitalização ou só "nascer digital"?
- [ ] Conselho de Classe: quantos signatários por ata? Fluxo de coleta
      paralela vs. sequencial para reduzir o prazo atual (~1 semana)?

## Acadêmico

- [ ] Modelo de avaliação (bimestre, trimestre, conceitos x notas)?
- [ ] Formato do relatório de boletim — template por escola ou padrão?
- [ ] Regras de confiabilidade da chamada: validação antes de disparar push
      de ausência; retry/idempotência; auditoria de notificações enviadas.

## Educação infantil / Rotina diária (fase 2)

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
- [ ] Fotos do dia: entram nesta feature ou via mensagens com imagem
      (módulo de comunicação)?
- [ ] Retenção/histórico: por quanto tempo o histórico de rotina fica
      disponível para os pais?

## Comunicação

Decisão de escopo fechada (entra no MVP). Pendências de detalhamento:

- [ ] Tipos no MVP: chat 1:1 pai↔professor e pai↔escola — comunicados em
      massa e comentários contextuais ficam para fase 2?
- [ ] Comunicado em massa (fase 2): por escola toda, por turma, ou ambos?
- [ ] Confirmação de leitura é obrigatória em comunicados? Vira registro
      auditável (`docs/vision.md` — arquivo digital)?
- [ ] Expectativa de horário de resposta do professor — como evitar
      cobrança de disponibilidade 24/7? (silenciar fora do expediente,
      aviso de "resposta no próximo dia útil")
- [ ] Escalonamento: se professor não responde em X tempo, mensagem sobe
      para coordenação/escola?
- [ ] Notificações push: imediatas para tudo, ou só para urgente
      (ex.: saúde, ausência) com resumo diário para o resto?
- [ ] Isolamento: garantir que pai nunca veja conversa/comunicado de outra
      família — enforcement via policy, igual isolamento entre escolas?
- [ ] Limite de tamanho/resolução de imagens nas mensagens?

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
- [ ] Provider de e-mail (Postmark, SES, etc.)?
- [ ] Integração de boleto (gateway/banco)?
- [ ] Quando adicionar Redis (só cache) — critério de escala?
- [ ] Firebase Authentication — necessário ou auth próprio (JWT) basta?
