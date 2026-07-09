# Visão do Produto — School Lab

## 1. Resumo

Plataforma de gestão escolar multi-escola (várias escolas em um único sistema),
voltada a escolas particulares. Centraliza gestão acadêmica, financeira,
documental e de relacionamento com as famílias, com foco em quatro diferenciais:
comunicação confiável (mensagens com imagem), estabilidade, arquivo digital
completo (auditoria) e automação do financeiro.

## 2. Problema

Escolas particulares trocam de sistema com frequência (relato de ~5 sistemas em
7 anos) por três motivos recorrentes:

- **Instabilidade**: perda de dados críticos (ex.: notas somem ao lançar) e
  notificações incorretas (ex.: push de ausência com a criança presente na
  escola — caso real com impacto jurídico e conflito família↔escola).
- **Processos manuais**: boletos e contratos feitos fora do sistema.
- **Arquivo físico**: a auditoria do Conselho/Secretaria de Educação exige todos
  os documentos; sem sistema que armazene tudo, a escola mantém arquivos físicos
  ocupando salas inteiras.

## 3. Proposta de valor

- **Estável e confiável**: dados críticos (notas, financeiro) nunca se perdem.
- **Arquivo digital completo**: repositório único pronto para auditoria,
  eliminando o arquivo físico.
- **Financeiro automatizado**: geração e acompanhamento de boletos no app.
- **Contratos digitais**: envio e assinatura sem papel.
- **Tudo em um só lugar**: acadêmico, financeiro, documental e comunicação.
- **Rotina da educação infantil**: professor registra alimentação, sono,
  higiene, saúde, humor, fotos e recados da criança; pais acompanham em tempo
  real — diferencial forte para escolas com berçário/infantil.
- **Comunicação direta e segura**: pais falam com professor e escola dentro
  da plataforma, com histórico e privacidade por família. Diferencial:
  envio de **imagens** nas mensagens (concorrentes atuais não oferecem).
  Áudio **fora de escopo** no MVP.

## 4. Público-alvo

- **Primário**: escolas particulares (educação básica).
- **Canal de distribuição**: parceria com o Sindicato das Escolas Particulares,
  alcançando a rede — inclusive escolas em fase de abertura.

## 5. Princípios de produto

- **Multi-escola desde o dia 1**: várias escolas no mesmo sistema; isolamento
  de dados entre escolas (estratégia de modelagem a definir).
- **Estabilidade acima de features**: confiabilidade é requisito, não desejo.
- **Digital-first**: reduzir/eliminar papel (boletos, contratos, arquivo).
- **Multi-canal**: web e app compartilham as mesmas regras de negócio.
- **Escalável**: modelagem pensada para muitas escolas desde o início.
- **Privacidade por padrão (LGPD)**: dados de crianças exigem cuidado
  redobrado — consentimento do responsável, isolamento por família,
  minimização de acesso e retenção definida. Vale para rotina diária,
  comunicação e arquivo digital.

## 6. Escopo do MVP (proposta)

Objetivo do MVP: entregar valor imediato no início do semestre letivo —
prioridade validada com diretor parceiro (escola NSR): **comunicação** como
foco principal, com estabilidade acadêmica e financeiro como pilares
complementares.

**Dentro do MVP**

- Cadastro de escola e isolamento de dados entre escolas.
- Identidade e papéis: backoffice, escola (admin), professor, pais.
- Cadastro e login de usuários (todos os papéis).
- Cadastro base: alunos, responsáveis, turmas, disciplinas.
- **Comunicação**: mensagens bidirecionais pai↔professor e pai↔escola, com
  envio de imagens. Push notification para avisar novas mensagens e eventos
  (paridade com sistema atual — já existe hoje).
- Acadêmico: lançamento confiável de notas [fundamental/médio]; relatório de
  boletim; frequência (chamada) com notificação automática de ausência —
  **deve ser estável e correta** (falha gera conflito jurídico).
- Professor: plano de aula e envio de mensagens.
- Educação infantil: comunicação cobre a necessidade principal no MVP; rotina
  diária estruturada (alimentação, sono, etc.) fica para fase posterior.
- Financeiro: geração e acompanhamento de boletos; visão dos pais.
- Arquivo digital: repositório de documentos por aluno/escola.
- Web e app (ambos os canais no MVP).

**Fora do MVP (fases seguintes)**

- Contratos + assinatura digital (proposta em avaliação: assinatura avançada
  própria com e-mail + IP + hash — validação jurídica pendente).
- Comunicação avançada (comunicados em massa, confirmação de leitura).
- Landing / página de vendas.
- Relatórios avançados e BI.
- Rotina diária estruturada da educação infantil.
- Mensagens de áudio.

> Validação com stakeholder (jul/2026): diretor parceiro priorizou comunicação,
> notas, boletim e plano de aula para o segundo semestre. Itens ainda em aberto
> estão em `docs/open-questions.md`.

## 7. Fora do escopo desta fase de documentação

- Stack do app mobile (React Native é intenção, não decisão).
- Modelagem de banco, contratos de API e eventos.
- Ferramentas de apoio (ex.: Mintlify, Figma MCP) — decisão posterior.

> Stack da camada web fechada em `docs/web-stack.md` (Rails 8 + Hotwire +
> Tailwind + API REST).

## 8. Métricas de sucesso (rascunho)

- Retenção de escolas (churn baixo vs. média do mercado).
- Zero perda de dados de notas/financeiro.
- % de boletos emitidos pela plataforma vs. manual.
- % de documentos de auditoria disponíveis digitalmente.
