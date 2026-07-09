# Atores e Superfícies

## 1. Atores

- **Backoffice (plataforma / DLA)**: opera a plataforma; cadastra e administra
  escolas (tenants); gestão de assinatura/comercial.
- **Escola (administração)**: administra a própria escola dentro do tenant —
  usuários, turmas, alunos, financeiro, documentos.
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
| Professor    | Sim         | Sim         | Notas no web; consulta/rápido no app |
| Pais         | Sim (fase 2)| Sim         | Boleto e documentos priorizados no app |

> Proposta: no MVP, pais entram primeiro pelo app; web dos pais em fase 2.
> Confirmar em `docs/open-questions.md`.

## 4. Capacidades de alto nível por papel

### Backoffice

- Criar/administrar escolas (tenants).
- Gerir assinatura/plano da escola.
- Suporte e visão geral da plataforma.

### Escola (admin)

- Gerir usuários da escola (professores, pais, staff).
- Gerir turmas, disciplinas, matrículas.
- Acompanhar financeiro (boletos, inadimplência).
- Gerir arquivo digital de documentos.

### Professor

- Lançar e consultar notas (com persistência confiável).
- Consultar turmas, alunos e calendário.
- (Fase 2) frequência, diário, comunicados.

### Pais

- Consultar notas e situação acadêmica do filho.
- Ver e pagar boletos.
- Acessar documentos do aluno.
- (Fase 2) comunicação com escola/professor.

## 5. Notas de canal (fora do escopo de requisitos)

- web: provavelmente Rails (web + API) — intenção, não decisão.
- app: provavelmente React Native — intenção, não decisão.
- A API é o ponto único de regras de negócio para ambos os canais.
