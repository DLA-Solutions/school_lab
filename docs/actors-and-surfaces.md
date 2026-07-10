# Atores e Superfícies

## 1. Atores

- **Backoffice (plataforma / DLA)**: opera a plataforma; cadastra e administra
  escolas; gestão de assinatura/comercial.
- **Escola (administração)**: administra a própria escola — usuários, turmas,
  alunos, financeiro, documentos.
- **Professor**: lançamento de notas e atividades acadêmicas da sua turma/disciplina.
- **Pais / responsáveis**: acompanham vida acadêmica, financeira e documental
  do(s) filho(s).

## 2. Canais

- **web**: superfícies web + API (serve web e app).
- **app**: aplicativos mobile.

## 3. Matriz papel × canal (MVP)

| Papel        | web         | app         | Observação                           |
|--------------|-------------|-------------|--------------------------------------|
| Backoffice   | Sim         | Não (fase 2)| Operação é primariamente desktop     |
| Escola       | Sim         | Sim         | Admin no web; consultas no app       |
| Professor    | Sim         | Sim         | Notas e plano de aula no web; mensagens no app |
| Pais         | Sim (fase 2)| Sim         | Boleto e documentos priorizados no app |

> Proposta: no MVP, pais entram primeiro pelo app; web dos pais em fase 2.
> Confirmar em `docs/open-questions.md`.

## 4. Capacidades de alto nível por papel

### Backoffice

- Criar/administrar escolas.
- Gerir assinatura/plano da escola.
- Suporte e visão geral da plataforma.

### Escola (admin)

- Gerir usuários da escola (professores, pais, staff).
- Gerir turmas, disciplinas, matrículas.
- Acompanhar financeiro (boletos, inadimplência).
- Gerir arquivo digital de documentos.
- Enviar e receber mensagens com famílias (texto + imagem).
- Enviar push notifications para usuários da escola (paridade com sistema
  atual).
- (Fase 2) Enviar comunicados em massa (toda a escola ou por turma) com
  confirmação de leitura; moderar/auditar conversas em caso de conflito.
- (Fase 2) Gerir **Livro Ata** digital — gerar atas formais, coletar
  assinaturas digitais, buscar no acervo (busca semântica), exportar/imprimir
  para arquivo físico quando necessário.

### Professor

- Lançar e consultar notas (com persistência confiável). [ensino fundamental/médio]
- Registrar frequência (chamada) com notificação automática de ausência —
  deve ser confiável (falha gera conflito jurídico). [todos os segmentos]
- Criar e consultar plano de aula.
- Enviar e receber mensagens com pais (texto + imagem). [todos os segmentos]
- Consultar turmas, alunos e calendário.
- (Fase 2) Participar de atas (ex.: Conselho de Classe) com assinatura digital.
- (Fase 2) Registrar rotina diária estruturada — alimentação, sono, higiene,
  saúde, humor. [educação infantil]

### Pais

- Consultar notas, boletim e situação acadêmica do filho.
  [ensino fundamental/médio]
- Enviar e receber mensagens com professor e escola (texto + imagem).
  [todos os segmentos — prioridade no infantil]
- Receber push notifications (mensagens, ausência na chamada, avisos).
- Ver e pagar boletos.
- Acessar documentos do aluno.
- (Fase 2) Assinar atas digitalmente (reuniões com família, eventos).
- (Fase 2) Receber comunicados em massa com confirmação de leitura;
  acompanhar rotina diária estruturada do filho. [educação infantil]

> Nota: no MVP, educação infantil prioriza **comunicação** (mensagens com
> imagem) sobre rotina diária estruturada. Capacidades variam conforme o
> segmento da turma — ver `docs/open-questions.md`.

## 5. Stack por canal

### web (decisão fechada)

Rails 8 + Hotwire (Turbo + Stimulus) + Tailwind para superfícies HTML;
API REST JSON versionada (`/api/v1`) para o app mobile. Detalhes em
`docs/web-stack.md`.

- **Web (browser):** sessão + server-rendered HTML.
- **API (app mobile):** JWT + JSON.
- Regra de negócio compartilhada via service objects.

### app (intenção)

React Native — decisão ainda não fechada.

### Princípio

A API é o ponto único de regras de negócio para ambos os canais.
