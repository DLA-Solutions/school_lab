# Levantamento de requisitos e portão de qualidade do AC

> **Delegação:** as fases 1–3 (levantamento, portão de AC, bar) são conduzidas pela skill **`codelet-requirements`**, que grava o feature slice em `docs/prds/<domain>/<feature-slug>.md`. Esta skill (`codelet-loop`) **não** elicita requisitos inline — apenas valida o slice existente.

Este documento cobre o **formato** esperado do slice e o portão de qualidade dos ACs.

## As cinco perguntas fixas do levantamento

Cada pergunta captura um aspecto que, se omitido, faz builder e críticos inventarem escopo durante o loop.

### 1. Ator

**O que captura:** Quem executa a ação ou recebe o resultado, em que papel (usuário final, admin, sistema batch, integração externa).

**Exemplo bom:** "School admin with billing permission, logged into school SPA `/app`."

**Exemplo ruim:** "The user." (which user? with which permission?)

### 2. Gatilho e pré-condição

**O que captura:** O evento que inicia o fluxo e o que precisa ser verdade antes de começar (estado do sistema, dados existentes, permissões).

**Exemplo bom:** "Given a boleto with status `pending` and due date tomorrow, when the admin clicks 'Reenviar cobrança'."

**Exemplo ruim:** "When resend is needed." (who triggers? in what state is the boleto?)

### 3. Resultado observável

**O que captura:** O que muda de forma checável olhando — tela, resposta HTTP, registro no banco, email na caixa de saída — **sem** perguntar para quem construiu.

**Exemplo bom:** "Then the API returns 200, `resent_at` is set, and the guardian receives a push notification within 30 seconds."

**Exemplo ruim:** "Then it works correctly." (not observable by a third party.)

### 4. Casos adversos que importam

**O que captura:** Não todos os edge cases — só os que valem o custo de cobrir nesta feature.

**Como decidir quais valem:**

- **Impacto × probabilidade** — falha que expõe dado de outra escola/família sempre vale; typo em label raramente vale.
- **Irreversibilidade** — operação destrutiva ou financeira vale; hover state raramente vale.
- **Dependência externa** — timeout, retry, idempotência de webhook sempre valem quando há integração.
- **Regulatório/privacidade** — LGPD, consentimento, retenção — sempre valem quando dados sensíveis estão envolvidos.

**Exemplo bom:** "If the payment gateway returns 503, the boleto stays `pending` and the user sees a retry message — not marked as sent."

**Exemplo ruim:** "Handle all possible errors." (infinite list, impossible to judge.)

### 5. Não-objetivo

**O que captura:** O que fica **explicitamente de fora** desta entrega — impede builder e críticos de expandirem escopo sozinhos durante o loop.

**Exemplo bom:** "Does not include resend history in UI this delivery; does not change email template; does not support batch resend."

**Exemplo ruim:** (omit the section — implicit scope becomes infinite scope.)

---

## Regra de economia

| Situação | Comportamento |
|----------|---------------|
| Pedido original responde as cinco perguntas com clareza | Confirma num resumo curto (5–10 linhas) e pede "confirmo?" — não interroga de novo. |
| Um ou mais pontos vagos | Pergunta **somente** nos pontos vagos. |
| Pedido contraditório | Aponta a contradição e pede resolução antes de prosseguir. |

---

## Formato Given/When/Then (English)

**Todo** critério de aceite deve usar esta gramática (English primary; Portuguese `Dado/Quando/Então` aceito para compatibilidade):

```
Given [initial state/context],
when [actor action],
then [observable, verifiable outcome].
```

### Regras de gramática

- **Given** — estado inicial verificável (não intenção).
- **When** — ação única e identificável (não "eventually").
- **Then** — resultado que um crítico pode checar sem ler código-fonte como substituto de execução.

### Exemplos

**Bom:**

```
Given a student enrolled in class A with no absences recorded today,
when the teacher confirms attendance for class A,
then the student appears as present in the listing and the present count increases by 1.
```

**Ruim (falta observabilidade):**

```
Given a student,
when attendance is taken,
then the system processes correctly.
```

---

## Filtro de adjetivo

Palavras-gatilho que **exigem proxy mensurável** antes de aceitar o AC. Um AC que usa uma delas **sem** o proxy correspondente **reprova** nesta fase e volta para elicitação. O agente aponta **exatamente** qual proxy falta — **nunca** reescreve o AC por conta própria sem confirmar com o usuário.

| Palavra-gatilho | Proxy exigido |
|-----------------|---------------|
| **fast** / **performático** | Número + unidade (ex.: "response < 200ms p95") |
| **beautiful** / **elegante** | Referência a padrão existente: arquivo, componente, screenshot |
| **intuitive** / **fácil** | Tarefa concreta + tempo-alvo ou taxa de erro |
| **robust** / **resiliente** | Lista explícita dos casos adversos cobertos |
| **perfect** / **impecável** | **Nunca aceitos sozinhos** — sempre decompostos em ACs específicos mensuráveis |
| **modern** / **clean** | Referência visual concreta ou checklist de atributos observáveis |
| **secure** / **seguro** | Threat model mínimo: qual ataque ou vazamento específico está mitigado |

### Fluxo quando o filtro reprova

1. Identificar palavra-gatilho e proxy ausente.
2. Mostrar ao usuário: "AC uses 'fast' without a number — what maximum latency is acceptable?"
3. Aguardar resposta ou reformulação do usuário.
4. Revalidar. Repetir até passar ou usuário remover o adjetivo.

---

## Saída desta fase

Criar no **projeto onde a skill está sendo usada** (não dentro da skill):

```
docs/prds/<domain>/<feature-slug>.md
```

### Estrutura do arquivo (feature slice)

Ver template em `.claude/skills/codelet-requirements/templates/feature-slice-template.md`.

Resumo:

```markdown
# Feature slice — [Feature name]

> Domain: [domain](../domain-prd.md)
> Status: draft — codelet execution contract

## Requirements
(table with five questions)

## Bar
(reference, rationale, recognizably bad)

## Acceptance criteria
1. Given ..., when ..., then ...
   → docs/ref/... or [invented]

## Non-goals
- ...
```

O slug deriva do nome da feature: minúsculas, espaços → hífen, sem acentos (ex.: "Boleto resend" → `resend-boleto`).

Validação:

```bash
python3 .claude/skills/codelet-loop/scripts/montar_prompt.py \
  --validate-only --ac-file docs/prds/<domain>/<feature-slug>.md
```
