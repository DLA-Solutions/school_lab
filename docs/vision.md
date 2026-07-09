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
  ocupando salas inteiras — incluindo o **Livro Ata** (livro de registro de
  atas), alvo frequente de auditoria do Conselho de Educação.
- **Atas e assinaturas manuais**: reuniões com famílias, Conselho de Classe e
  eventos exigem atas assinadas; hoje o processo leva dias (ex.: ~1 semana no
  Conselho de Classe) e passa por gravação de áudio, transcrição manual e
  impressão para o livro físico.

## 3. Proposta de valor

- **Estável e confiável**: dados críticos (notas, financeiro) nunca se perdem.
- **Arquivo digital completo**: repositório único pronto para auditoria,
  eliminando o arquivo físico.
- **Livro Ata digital**: atas formais (matrícula, Conselho de Classe,
  resultados finais, reunião com pais, eventos) com assinatura digital e
  busca semântica — o Conselho de Educação audita esses livros com frequência;
  versão digital é permitida desde que tenha assinatura digital válida.
- **Financeiro automatizado**: geração e acompanhamento de boletos no app.
- **Contratos e atas com assinatura digital**: envio e coleta de assinaturas
  sem papel (padrão equivalente a DocuSign/Authentique — validação jurídica
  pendente).
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

- **Livro Ata & atas formais** (prioridade alta na fase 2 — forte entusiasmo
  do stakeholder): geração de atas por tipo, coleta de assinaturas digitais
  (rabisco + e-mail + IP + hash), busca semântica no acervo, impressão
  opcional para arquivo físico. Tipos: matrícula, Conselho de Classe,
  resultados finais, reunião com pais, eventos ocorridos na escola.
  Geração assistida por IA a partir de transcrição de reunião (fase posterior
  dentro do módulo).
- Contratos + assinatura digital (compartilha infra de assinatura com Livro
  Ata; proposta em avaliação: assinatura avançada própria — validação
  jurídica pendente).
- Comunicação avançada (comunicados em massa, confirmação de leitura).
- Landing / página de vendas.
- Relatórios avançados e BI.
- Rotina diária estruturada da educação infantil.
- Mensagens de áudio.

> Validação com stakeholder (jul/2026): diretor parceiro priorizou comunicação,
> notas, boletim e plano de aula para o segundo semestre; demonstrou forte
> interesse em Livro Ata digital com assinatura e busca semântica para fase 2.
> Itens ainda em aberto estão em `docs/open-questions.md`.

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
