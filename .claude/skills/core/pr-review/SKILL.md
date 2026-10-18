---
name: pr-review
description: Performs a rigorous senior-engineer PR review — functional correctness, architecture, SOLID, performance, database, APIs, security, tests, observability, maintainability, scalability, and compatibility — and produces a consolidated, severity-tagged PR Review Summary with a quality score. Use when the user asks to review a PR, branch, or diff with this rubric, or invokes /pr-review.
---

# PR Review

Senior Software Engineer–style technical review. Evaluates whether a PR meets functional and
non-functional requirements while preserving or improving quality, security, maintainability,
scalability, and architecture. The full rubric below (in Portuguese, as authored) is the
instruction set — follow it exactly, including its output format.

## Target

`args` may be a GitHub PR URL, a PR number (e.g. `349`), a branch name, or omitted (review the
current branch's diff against the repo's default base branch). Resolve it before starting:

- PR URL or number → `gh pr view <target> --json title,body,baseRefName,headRefName,url,commits`
  and `gh pr diff <target>` (or `git diff <base>...<head>` locally if the branch is checked out)
  for the full diff. If `gh` is not on `PATH`, try the Homebrew path
  (`/opt/homebrew/bin/gh` or `/usr/local/bin/gh`) before giving up.
- Branch name → `git diff <default-base>...<branch>`.
- No target → diff of the current branch (committed + staged + unstaged) against the repo's
  default base branch.

Also read, when available: the PR description, linked Linear card / issue, and any PRD under
`docs/prds/` that governs the changed domain — the rubric's step 1 requires this before judging
the code. Check the actual diff against `origin/<base>` (not just `main`'s view of it) — a PR's
head may diverge from its stated base in ways that inflate or obscure the real scope of the
change; call that out explicitly if found, rather than reviewing only the commits the author
intended.

## Review instructions

PR Review — Software Quality & Architecture
Você é um Senior Software Engineer responsável por realizar uma revisão técnica rigorosa de um Pull Request (PR).
Seu objetivo é avaliar se as alterações propostas atendem aos requisitos funcionais e não funcionais do sistema, mantendo ou melhorando a qualidade, segurança, manutenibilidade, escalabilidade e arquitetura do software.

### 1. Entendimento do PR

Antes de revisar o código:
1. Leia a descrição do PR.
2. Identifique o objetivo da alteração.
3. Leia os requisitos, cards, issues, PRD ou especificações relacionadas, quando disponíveis.
4. Analise o diff completo.
5. Identifique quais partes do sistema foram afetadas.
6. Considere o contexto arquitetural existente antes de avaliar uma alteração como problema.

Não faça críticas baseadas apenas em preferências pessoais. Toda observação deve estar relacionada a um requisito, princípio de engenharia, risco técnico ou impacto real no sistema.

### 2. Correção funcional

Verifique:
* O código realmente implementa o comportamento esperado?
* Existem casos de borda não tratados?
* Existem condições de corrida?
* Existem estados inválidos que podem ser produzidos?
* Existem possíveis NullPointer/undefined errors?
* O tratamento de erros está correto?
* Existem mudanças que podem quebrar funcionalidades existentes?
* O comportamento é idempotente quando deveria ser?
* Há inconsistências entre diferentes fluxos da aplicação?

Classifique problemas encontrados de acordo com sua severidade.

### 3. Arquitetura

Avalie se a implementação respeita a arquitetura existente.
Verifique:
* Separação adequada de responsabilidades.
* Coesão dos módulos.
* Acoplamento entre componentes.
* Dependências entre camadas.
* Princípios de Clean Architecture, Hexagonal Architecture ou DDD, quando aplicáveis.
* Violação de boundaries.
* Regra de dependência entre camadas.
* Uso adequado de interfaces e abstrações.
* Código de domínio contaminado por detalhes de infraestrutura.
* Regras de negócio implementadas no lugar correto.
* Possível criação de dívida arquitetural.

Pergunte: "Essa implementação continuará fazendo sentido quando o sistema crescer?"

### 4. SOLID e Design

Avalie:
* Single Responsibility Principle.
* Open/Closed Principle.
* Liskov Substitution Principle.
* Interface Segregation Principle.
* Dependency Inversion Principle.

Também procure por:
* God Classes.
* God Functions.
* Métodos excessivamente grandes.
* Duplicação de lógica.
* Abstrações desnecessárias.
* Abstrações prematuras.
* Excessive nesting.
* Complexidade desnecessária.
* Código difícil de testar.
* Código difícil de modificar.

Não sugira abstrações simplesmente por existir código duplicado. Avalie se a abstração realmente reduz complexidade.

### 5. Complexidade e Performance

Analise a complexidade computacional das operações relevantes.
Para cada trecho crítico, considere:
* Time Complexity — Big O.
* Space Complexity — Big O.
* Número de chamadas externas.
* Número de queries ao banco.
* N+1 queries.
* Loops aninhados.
* Processamento desnecessário.
* Serialização/deserialização excessiva.
* Uso excessivo de memória.
* Operações que podem crescer de forma não linear.

Quando identificar um problema de complexidade, explique:
1. Complexidade atual.
2. Por que ela pode ser problemática.
3. Em que escala o problema aparece.
4. Uma alternativa possível.

### 6. Banco de Dados

Analise:
* Modelagem.
* Índices.
* Foreign keys.
* Constraints.
* Transações.
* Consistência.
* Integridade referencial.
* Queries desnecessárias.
* N+1 queries.
* Full table scans.
* Paginação.
* Ordenação.
* Concorrência.
* Race conditions.
* Migrações.
* Compatibilidade com dados existentes.

Verifique especialmente se a alteração pode degradar performance à medida que o volume de dados aumenta.

### 7. APIs e Integrações

Para APIs e integrações externas, verifique:
* Contratos.
* Validação de entrada.
* Tratamento de erros.
* Timeouts.
* Retries.
* Idempotência.
* Circuit breaker, quando aplicável.
* Rate limiting.
* Observabilidade.
* Compatibilidade retroativa.
* Segurança.
* Dados sensíveis.

Considere o comportamento quando um serviço externo estiver:
* indisponível;
* lento;
* retornando erro;
* retornando dados inesperados;
* parcialmente disponível.

### 8. Segurança

Procure por:
* Authentication bypass.
* Authorization bypass.
* Broken Access Control.
* SQL Injection.
* Command Injection.
* XSS.
* CSRF.
* SSRF.
* Exposição de dados sensíveis.
* Secrets hardcoded.
* Logs contendo informações sensíveis.
* Falhas de validação.
* Escalada de privilégios.
* Permissões excessivas.

Não classifique como vulnerabilidade algo que seja apenas uma preferência de implementação.

### 9. Testes

Avalie:
* Existem testes para a nova funcionalidade?
* Os testes cobrem o comportamento principal?
* Existem testes para casos de erro?
* Existem testes para edge cases?
* Existem testes de integração quando necessários?
* Os testes realmente validam comportamento ou apenas implementação?
* Existem testes frágeis?
* Existem mocks excessivos?
* Há algum comportamento importante sem cobertura?

Verifique também se testes existentes podem estar passando mesmo com comportamento incorreto.

### 10. Observabilidade

Avalie se a alteração possui observabilidade adequada.
Considere:
* Logs.
* Métricas.
* Tracing.
* Sentry/error tracking.
* Correlation IDs.
* Informações suficientes para investigação de incidentes.
* Logs excessivos ou inadequados.
* Ausência de informações importantes para debugging.

Para operações críticas, pergunte: "Se isso falhar em produção às 3h da manhã, teremos informações suficientes para descobrir o motivo?"

### 11. Manutenibilidade

Avalie:
* Legibilidade.
* Nomenclatura.
* Organização.
* Duplicação.
* Clareza.
* Facilidade de alteração futura.
* Facilidade de debugging.
* Complexidade cognitiva.
* Consistência com os padrões existentes no projeto.

Não proponha refatorações extensas que não tenham relação com o PR sem justificar claramente o benefício.

### 12. Escalabilidade

Considere o comportamento da solução quando:
* usuários aumentarem;
* volume de dados aumentar;
* número de requisições aumentar;
* número de workers aumentar;
* integrações externas aumentarem;
* processamento concorrente aumentar.

Identifique gargalos potenciais.
Sempre diferencie:
* problema existente;
* problema introduzido pelo PR;
* risco futuro;
* otimização prematura.

### 13. Compatibilidade e Regressão

Verifique:
* Breaking changes.
* Compatibilidade com versões anteriores.
* Alterações em contratos.
* Migrações incompatíveis.
* Impacto em consumidores existentes.
* Impacto em jobs assíncronos.
* Impacto em eventos.
* Impacto em cache.
* Impacto em filas.
* Impacto em integrações externas.

## Classificação dos comentários

Cada problema encontrado deve receber uma severidade:

🔴 **CRITICAL** — Problema grave que pode causar: falha de segurança; corrupção de dados; indisponibilidade; perda significativa de dados; comportamento crítico incorreto.
🟠 **HIGH** — Problema importante que deve ser corrigido antes do merge.
🟡 **MEDIUM** — Problema relevante de qualidade, manutenção, performance ou arquitetura, mas que não necessariamente impede o merge.
🔵 **LOW** — Melhoria de qualidade ou manutenção com baixo impacto imediato.
⚪ **INFO** — Observação ou sugestão sem necessidade de correção.

## Formato dos comentários

Para cada problema encontrado, utilize:

```
[SEVERIDADE] Título
Problema: Explique objetivamente o que está errado.
Impacto: Explique o que pode acontecer.
Evidência: Indique o arquivo, função, classe ou trecho relacionado.
Recomendação: Explique como poderia ser corrigido.
```

Evite comentários genéricos como "Isso poderia ser melhor." Prefira: "Essa consulta é executada
dentro do loop e gera uma query por registro. Com N registros, o fluxo pode gerar O(N) queries,
caracterizando N+1. Considere carregar os dados em uma única consulta."

## Critério para aprovação

Ao final da análise, determine uma das seguintes classificações:

✅ **APPROVE** — O PR apresenta boa qualidade e não possui problemas relevantes que impeçam o merge.
⚠️ **APPROVE WITH COMMENTS** — O PR pode ser aprovado, mas existem melhorias recomendadas.
🔄 **REQUEST CHANGES** — Existem problemas que devem ser corrigidos antes do merge.
❌ **BLOCK** — Existe um problema crítico de segurança, dados, arquitetura ou funcionamento que impede o merge.

Não reprove o PR por questões puramente estilísticas ou preferências pessoais.

## RELATÓRIO FINAL DE QUALIDADE DE SOFTWARE

Ao finalizar a revisão, produza obrigatoriamente um relatório consolidado. Use o seguinte formato:

```
PR Review Summary

Status: APPROVE | APPROVE WITH COMMENTS | REQUEST CHANGES | BLOCK

Resumo:
Breve descrição da qualidade geral do PR.

Pontos positivos
Liste os principais aspectos positivos encontrados.

Problemas encontrados
Severidade | Categoria | Problema | Impacto
CRITICAL | Segurança | ... | ...
HIGH | Arquitetura | ... | ...
MEDIUM | Performance | ... | ...
LOW | Manutenibilidade | ... | ...

Quality Score
Dimensão | Nota
Correção funcional | X/10
Arquitetura | X/10
SOLID / Design | X/10
Performance | X/10
Banco de dados | X/10
Segurança | X/10
Testes | X/10
Observabilidade | X/10
Manutenibilidade | X/10
Escalabilidade | X/10
Nota geral: X/10

Riscos técnicos
Liste os principais riscos introduzidos ou identificados pelo PR.

Technical Debt
Identifique eventual dívida técnica criada ou aumentada por esta alteração.

Recomendações
Liste as principais ações recomendadas, priorizadas por impacto.

Conclusão
Finalize respondendo objetivamente:
1. O PR está tecnicamente pronto para produção?
2. Existem problemas que bloqueiam o merge?
3. Quais problemas devem obrigatoriamente ser corrigidos?
4. Quais melhorias podem ser realizadas posteriormente?
```

**Importante:** Não invente problemas. Se uma categoria não apresentar problemas relevantes,
informe explicitamente: "Nenhum problema relevante identificado."

## After the review

Report the findings and the consolidated summary in the response. Do not post to GitHub, modify
the PR, or change any code unless the user separately asks for that (e.g. "poste isso como
comentário na PR", "aplique as correções").
