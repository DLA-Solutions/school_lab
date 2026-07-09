# Visão do Produto — School Lab

## 1. Resumo

Plataforma de gestão escolar multi-escola (várias escolas em um único sistema),
voltada a escolas particulares. Centraliza gestão acadêmica, financeira,
documental e de relacionamento com as famílias, com foco em três diferenciais:
estabilidade, arquivo digital completo (auditoria) e automação do financeiro.

## 2. Problema

Escolas particulares trocam de sistema com frequência (relato de ~5 sistemas em
7 anos) por três motivos recorrentes:

- **Instabilidade**: perda de dados críticos (ex.: notas somem ao lançar).
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
  da plataforma, com histórico, confirmação de leitura e privacidade por
  família.

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

Objetivo do MVP: entregar valor imediato nas duas maiores dores (estabilidade
acadêmica + financeiro) e habilitar a proposta de auditoria.

**Dentro do MVP**

- Cadastro de escola e isolamento de dados entre escolas.
- Identidade e papéis: backoffice, escola (admin), professor, pais.
- Cadastro base: alunos, responsáveis, turmas, disciplinas.
- Acadêmico: lançamento confiável de notas.
- Financeiro: geração e acompanhamento de boletos; visão dos pais.
- Arquivo digital: repositório de documentos por aluno/escola.

**Fora do MVP (fases seguintes)**

- Contratos + assinatura digital.
- Comunicação avançada (mensageria, comunicados em massa).
- Landing / página de vendas.
- Relatórios avançados e BI.
- Rotina diária da educação infantil (a definir — ver `docs/open-questions.md`).

> As escolhas de MVP são propostas iniciais; itens em aberto estão em
> `docs/open-questions.md`.

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
