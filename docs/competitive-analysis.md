# Análise de Concorrência

> Documento informativo (não é âncora de decisão). Levantamento de
> funcionalidades de players do mercado de gestão escolar, para embasar
> priorização do MVP e as fases seguintes. Complementa `docs/vision.md` e
> `docs/open-questions.md`.

## 1. Panorama do mercado

O mercado brasileiro de "sistemas de gestão escolar" (também chamado de ERP
educacional) tem hoje três perfis de player, que competem entre si mas
resolvem dores diferentes:

| Perfil | Foco principal | Exemplos |
|--------|-----------------|----------|
| **ERP escolar completo** | Acadêmico + financeiro + secretaria, tudo integrado | Sponte, TOTVS Educacional, Gennera |
| **App de comunicação escola↔família** | Agenda digital, comunicados, chat, rotina — geralmente integra com um ERP por API | Agenda Edu, ClassApp, Olá Pais, Kix |
| **Nicho creche/educação infantil** | Rotina diária (bebê/berçário) como produto principal | Lápis 360 Baby; referência internacional: Brightwheel, HiMama |

O **School Lab** se posiciona mais perto do primeiro grupo (ERP completo,
multi-escola), mas com um diferencial do segundo/terceiro grupo já embutido
(rotina diária da educação infantil) — a maioria dos ERPs completos não tem
esse recurso nativamente, e depende de integração com um app de comunicação
separado.

## 2. Funcionalidades por domínio

### 2.1 Acadêmico

Recursos comuns entre Sponte, TOTVS Educacional e Gennera:

- Diário de classe eletrônico (notas, faltas, conteúdo de aula).
- Cadastro de cursos, matriz curricular, disciplinas e turmas.
- Ensalamento / montagem de turmas conforme matrículas.
- Sistema de avaliação personalizável (notas x conceitos, por bimestre/trimestre).
- Provas e atividades online para os alunos responderem (Sponte).
- Plano de aula e conteúdo programático (TOTVS).
- Histórico escolar e boletim gerados automaticamente.
- Portal do aluno/professor com lançamento de notas e faltas pelo app.

> Nenhum destaque incomum aqui — é o núcleo esperado de qualquer ERP escolar.
> Frequência (chamada) aparece em 100% dos concorrentes analisados; entrou
> no MVP do School Lab após validação com stakeholder (`docs/vision.md`).

### 2.2 Financeiro

Este é o domínio mais maduro e competitivo — praticamente todo concorrente
oferece:

- Emissão automática de boletos (não manual) com PIX e crédito recorrente.
- Conciliação bancária automática ("zero conciliação manual" — Sponte).
- Régua de cobrança automatizada (lembretes por e-mail/SMS/WhatsApp antes e
  depois do vencimento).
- Emissão de nota fiscal eletrônica (NF-e/NFS-e/NFC-e) integrada.
- Painel de inadimplência por turma/série/período.
- Contas a pagar/receber, fluxo de caixa (nos ERPs mais completos).
- Matrícula/rematrícula 100% online, com contrato e formulário digitais.

Diferenciais de ponta encontrados:

- **Sponte "Mensalidade Garantida"**: programa em que a Sponte assume o risco
  de inadimplência e garante 100% do recebimento à escola (produto
  financeiro, não só software).
- **Brightwheel (referência internacional)**: rastreamento de subsídios
  governamentais por múltiplas agências pagadoras (não aplicável ao Brasil,
  mas mostra granularidade de billing por múltiplos pagadores por aluno).

> Confirma a decisão do `vision.md` de que financeiro automatizado é
> diferencial esperado, não opcional — é tabela de entrada no mercado.

### 2.3 Secretaria / arquivo digital

- Matrícula e rematrícula online, sem papel.
- Armazenamento digital de documentos do aluno (RG, CPF, declarações,
  contratos, histórico).
- Emissão de declarações e históricos em poucos cliques.
- Controle de vagas por turma/série em tempo real.
- Conformidade com exigências da Secretaria Escolar Digital do MEC (citada
  explicitamente pela TOTVS como requisito regulatório, não diferencial).

> Nenhum concorrente pesquisado destaca "arquivo pronto para auditoria do
> Conselho/Secretaria" como proposta de valor central — a maioria trata isso
> como funcionalidade de secretaria genérica. Isso reforça que pode ser um
> diferencial de posicionamento real para o School Lab, e não apenas uma
> funcionalidade de commodity.

> Nenhum concorrente pesquisado destaca "arquivo pronto para auditoria do
> Conselho/Secretaria" como proposta de valor central — a maioria trata isso
> como funcionalidade de secretaria genérica. O **Livro Ata** (registro formal
> de atas) é exigência legal que o Conselho de Educação audita com frequência;
> nenhum player pesquisado oferece Livro Ata digital com busca semântica —
> oportunidade de diferencial forte na fase 2 do School Lab (validado com
> stakeholder em jul/2026).

### 2.4 Livro Ata e atas formais

Domínio pouco coberto pelos ERPs pesquisados — tratado como processo manual
(secretaria) ou fora do sistema:

- Escolas mantêm **Livro Ata** físico obrigatório (também comum em
  condomínios e outras entidades).
- Tipos recorrentes: ata de matrícula, Conselho de Classe, resultados finais,
  reunião com pais, eventos/incidentes na escola.
- Stakeholder (escola NSR): versão **100% digital é permitida** — livro físico
  não é obrigatório, desde que haja **assinatura digital** válida.
- Dor operacional: Conselho de Classe pode levar ~1 semana para fechar
  assinaturas; workflow atual envolve gravação de áudio, transcrição e IA
  (Claude) para gerar rascunho da ata.
- Diferencial potencial: **busca semântica** no acervo de atas — stakeholder
  considera que "uma galera de escola choraria de ver".

> Não encontrado em Sponte, TOTVS, Gennera, Agenda Edu ou ClassApp como
> produto nativo. Pode ser diferencial de posicionamento real, não commodity.

### 2.5 Contratos e assinatura digital

Não é feature nativa de a maioria dos ERPs — o mercado de assinatura
eletrônica é um ecossistema paralelo (Clicksign, D4Sign, DocuSign) que os
ERPs integram ou replicam:

- **Sponte** tem assinatura eletrônica própria embutida para contratos e
  aditivos.
- **ClassApp** oferece "coleta de assinatura de contratos digitais" dentro do
  próprio app de comunicação.
- **Clicksign / D4Sign**: players especializados, com validade jurídica já
  confirmada pelo STJ (REsp 2.159.442/PR, 2024) mesmo sem certificado
  ICP-Brasil, desde que haja trilha de auditoria (IP, geolocalização,
  e-mail, hash). D4Sign também oferece assinatura qualificada (ICP-Brasil)
  para os casos que exigem por lei (ex.: atos societários).

> Relevante para a pergunta em aberto "assinatura própria vs. terceiros" em
> `docs/open-questions.md`: o mercado mostra as duas abordagens convivendo —
> ERPs maiores tendem a embutir assinatura própria (retém o cliente dentro
> da plataforma); ERPs menores/mais novos integram via API com Clicksign/D4Sign.

### 2.6 Comunicação (chat, comunicados, confirmação de leitura)

Domínio dominado por players especializados em comunicação (Agenda Edu,
ClassApp, Olá Pais), que os ERPs de gestão frequentemente integram via API em
vez de construir do zero:

- **Comunicados em massa** com confirmação de leitura obrigatória
  ("assinatura digital"/"visto") e dashboard de quem leu/não leu — recurso
  citado por todos os players de comunicação pesquisados.
- **Comunicados individuais/segmentados**: por aluno, turma ou responsável
  específico (Agenda Edu).
- **Canais de mensagem 1:1** entre pais e professor/turma, com histórico e
  moderação: administradores/coordenação têm acesso a todas as mensagens
  enviadas (ClassApp) — relevante para a pergunta de auditoria de acesso do
  `open-questions.md`.
- **Canais de atendimento** (tipo ticket) separados de canais de mensagem
  1:1, para organizar volume alto de solicitações à secretaria (Agenda Edu,
  Olá Pais).
- **Horário de atendimento configurável**: a escola define dias/horários em
  que mensagens são respondidas, para não gerar expectativa de resposta 24/7
  — resposta direta à pergunta aberta sobre "silenciar fora do expediente" em
  `docs/open-questions.md`.
- **Indicadores de satisfação** por atendimento concluído (CSAT) — Agenda
  Edu.
- **Eventos com confirmação de presença**, separados de comunicados gerais.
- **Grupos internos da equipe** para substituir WhatsApp interno.
- **Enquetes/pesquisas de satisfação** com a comunidade escolar (ClassApp).

> Nenhum player citou "escalonamento automático para coordenação se o
> professor não responde em X tempo" como recurso existente — parece ser uma
> lacuna do mercado, não só do School Lab (pergunta ainda em aberto no
> `open-questions.md`).

### 2.7 Rotina diária (educação infantil / berçário)

Domínio onde há dois grupos de concorrentes: apps brasileiros
generalistas de comunicação que adicionaram rotina (Olá Pais, ClassApp,
Agenda Edu, Kix) e players 100% focados em creche (Lápis 360 Baby no Brasil;
Brightwheel/HiMama internacionalmente, como referência de maturidade de
produto).

Funcionalidades recorrentes:

- Registro por criança de alimentação, sono, higiene/fralda, saúde e humor,
  enviado aos pais em tempo real ou por resumo.
- Cardápio do dia/semana/mês compartilhado com os pais, com registro de
  quanto a criança comeu de cada refeição (Olá Pais).
- Galeria de fotos/vídeos privada e segura ("Momentos" no ClassApp) — com
  reações tipo "curtida" dos pais (Brightwheel).
- **Registro rápido otimizado para mobile**: interface por "swipe e tap" para
  o professor registrar a turma toda em menos de um minuto (Kix); registro
  em lote para vários alunos de uma vez (Brightwheel: "record actions for
  one, some, or all children").
- Controle de medicação e registro de ocorrências/incidentes ao longo do dia
  (Brightwheel "incident reports"; Lápis 360 "diário de bordo").
- Relatório diário consolidado por e-mail, agendável (Brightwheel "Daily
  Report Emails" — os pais optam por receber ou não).
- Check-in/check-out digital da criança (chegada/saída), presente no
  Brightwheel — não visto nos players brasileiros pesquisados.

> Achados relevantes para as perguntas abertas do School Lab:
> - **Notificação em tempo real x resumo diário**: o mercado (Brightwheel)
>   resolve com os dois ao mesmo tempo — feed em tempo real + e-mail de
>   resumo diário opcional (pais escolhem).
> - **Granularidade do registro**: Brightwheel permite registrar por evento
>   pontual (cada refeição, cada troca) e por lote (turma toda de uma vez);
>   Kix aposta 100% em velocidade de registro em lote como diferencial de
>   adoção pelo professor.
> - **Fotos do dia — feature de rotina ou de arquivo?**: nos concorrentes,
>   fotos/vídeos do dia a dia vivem dentro do módulo de comunicação/rotina
>   (efêmero, foco em engajamento), não no módulo de arquivo/auditoria
>   (documentos formais). Sugere que, no School Lab, "fotos do dia" e
>   "arquivo digital" podem ser modelados como coisas distintas.

### 2.8 Multi-escola / backoffice de plataforma

Nenhum dos concorrentes pesquisados é claramente **multi-tenant desde a
concepção** com um backoffice de operador de plataforma administrando várias
escolas-cliente (o desenho do School Lab). Sponte, TOTVS e Gennera vendem
uma instância por escola/rede (multi-unidade dentro do mesmo grupo
educacional, mas não multi-tenant no sentido de plataforma-como-produto para
escolas de terceiros). Isso é consistente com o princípio "multi-escola
desde o dia 1" do `docs/vision.md` como diferencial estrutural, e não algo
para copiar de um concorrente específico.

## 3. Tabela-resumo comparativa

| Funcionalidade | Sponte | TOTVS Educacional | Gennera | Agenda Edu / ClassApp | Brightwheel (ref. internacional) | School Lab (proposta) |
|---|---|---|---|---|---|---|
| Notas / diário de classe | Sim | Sim | Sim | Não (integra via API) | Não (foco creche) | Sim (MVP) |
| Frequência/chamada | Sim | Sim | Sim | Parcial | Sim (check-in/out) | Sim (MVP) |
| Boleto/PIX automatizado | Sim | Sim | Sim | Parcial (via integração) | Sim (billing) | Sim (MVP) |
| Nota fiscal eletrônica | Sim | Sim | Sim | Não | N/A (EUA) | Não definido |
| Arquivo digital / auditoria | Parcial (secretaria) | Parcial (secretaria) | Parcial | Não | Não | Sim (MVP) — diferencial de posicionamento |
| Livro Ata digital + busca semântica | Não | Não | Não | Não | Não | Fase 2 — prioridade alta (stakeholder) |
| Contratos + assinatura digital | Sim (própria) | Não claro | Não claro | Sim (ClassApp) | Não | Fase 2 (compartilha infra com Livro Ata) |
| Comunicados em massa + confirmação de leitura | Parcial (app) | Parcial (app) | Não destacado | Sim (núcleo do produto) | Parcial (mensagens) | Fase 2 |
| Chat 1:1 pai↔professor/escola (com imagem) | Não (via app parceiro) | Não (via app) | Não | Parcial (sem imagem destacada) | Sim (mensagens) | Sim (MVP) |
| Rotina diária estruturada (creche/infantil) | Não | Não | Não | Sim (parcial) | Sim (núcleo do produto) | Fase 2 (comunicação cobre infantil no MVP) |
| Multi-tenant plataforma p/ várias escolas-cliente | Não (instância por escola) | Não | Não | Sim (é a própria natureza do produto) | Sim (é a própria natureza do produto) | Sim (princípio de arquitetura) |

## 4. O que isso muda nas perguntas abertas

Itens incorporados em `docs/open-questions.md` e `docs/vision.md` após
validação com stakeholder (jul/2026). Demais achados do levantamento:

- **Arquivo digital como diferencial**: nenhum concorrente vende isso como
  proposta central; fortalece a tese do `vision.md`, mas também significa que
  não há um "padrão de mercado" pronto para copiar — a modelagem de
  documentos exigidos pela Secretaria/Conselho precisa ser levantada
  diretamente com escolas, não inferida de concorrentes.
- **Livro Ata digital**: lacuna de mercado confirmada; stakeholder validou
  que versão digital é permitida com assinatura digital; busca semântica é
  diferencial não oferecido por concorrentes pesquisados.
- **Assinatura de contratos/atas**: mercado valida as duas rotas (própria vs.
  Clicksign/D4Sign/DocuSign); ambas têm validade jurídica reconhecida pelo STJ
  sem ICP-Brasil, desde que haja trilha de auditoria. Stakeholder exige
  equivalência ao padrão DocuSign/Authentique aceito pelo cartório.
- **Comunicação — horário de atendimento e escalonamento**: "silenciar fora
  do expediente" já é prática comum (Agenda Edu, Olá Pais); "escalonamento
  automático se o professor não responde" não foi encontrado em nenhum
  concorrente — pode ser tratado como P2 sem risco de ficar atrás do mercado.
- **Rotina diária — tempo real x resumo**: não é dilema binário no mercado
  líder (Brightwheel) — ambos convivem, com o pai escolhendo a preferência.
- **Fotos do dia**: concorrentes tratam como parte do módulo de
  comunicação/rotina, não do arquivo/auditoria formal — sugere dois
  repositórios/modelos de dados distintos no School Lab.

## 5. Fontes

Levantamento via busca na web em 2026-07-09. Sites oficiais e páginas de
funcionalidades dos produtos:

- Sponte — sponte.com.br (funcionalidades, gestão financeira)
- TOTVS Educacional — totvs.com/educacional
- Gennera — gennera.com.br/blog
- Agenda Edu — agendaedu.com.br
- ClassApp — classapp.com.br
- Olá Pais — agenda.olapais.com.br
- Kix — kix.com.br
- Lápis 360 Baby — setasistemas.com.br
- Brightwheel (referência internacional de creche/childcare) — mybrightwheel.com
- Clicksign — clicksign.com; D4Sign — d4sign.com.br (validade jurídica de
  assinatura eletrônica no Brasil, incl. jurisprudência do STJ)

> Este documento é um retrato do mercado no momento da pesquisa; produtos e
> preços mudam com frequência. Revalidar antes de decisões de investimento
> alto (ex.: escolher entre assinatura própria vs. terceiros).
