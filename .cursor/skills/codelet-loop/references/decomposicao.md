# Decomposição em codelets (fase 4)

## Definição de codelet

Um **codelet** é o menor pedaço da feature que pode ser:

1. **Construído** de forma isolada (builder sabe exatamente o escopo).
2. **Julgado** de forma isolada (críticos podem rodar harness sem depender do veredito de outro codelet).

Codelets com dependência sequencial rodam em ordem — o antecessor deve **aprovar** (todos os cinco críticos) antes do dependente iniciar builder.

---

## Teste de granularidade fina demais

**Sintoma:** O "codelet" não tem verificação própria possível — não dá para rodar harness nele sozinho.

**Exemplos de fino demais:**

- "Adicionar import" isolado.
- "Criar tipo TypeScript" sem uso verificável.
- "Migration sem model/service" sem teste que exercite a coluna.

**Ação:** Juntar com o vizinho mais relacionado até existir verificação própria.

---

## Teste de granularidade grossa demais

**Sintoma A — sempre passam ou falham juntos:** Dois pedaços compartilham o mesmo harness e nunca falham independentemente.

**Ação:** Fundir em um único codelet maior.

**Sintoma B — preocupações misturadas:** Um pedaço combina domínios distintos (ex.: validação de negócio + spinner de loading + analytics).

**Ação:** Separar — cada preocupação distinta é julgada por críticos diferentes (contrato vs padrão vs estado adverso).

---

## Fontes de decomposição por tipo de feature

Ponto de partida — **adaptar** ao tipo de projeto encontrado no repositório.

### Interface (web, mobile, backoffice)

| Codelet candidato | AC típico |
|-------------------|-----------|
| Estado vazio | Dado nenhum registro, então mensagem e CTA corretos |
| Estado de carregamento | Dado request pendente, então feedback visível sem layout shift |
| Estado de sucesso | Caminho feliz completo |
| Cada erro de validação relevante | Um codelet por regra de validação exposta ao usuário |
| Cada erro de rede relevante | Timeout, offline, 5xx — se impacto diferente |
| Navegação por teclado | Se codelet for formulário ou modal interativo |
| Comportamento responsivo | Se layout muda breakpoint relevante |

### API / serviço

| Codelet candidato | AC típico |
|-------------------|-----------|
| Caminho feliz | Request válido → response esperado |
| Cada validação de entrada | Um codelet por campo/regra 422 |
| Concorrência relevante | Double-submit, race em update |
| Falha de dependência externa | Gateway down, timeout, retry |
| Autorização | 403 para role errada, isolamento de tenant |

### Fluxo de dados / migração

| Codelet candidato | AC típico |
|-------------------|-----------|
| Estado inicial | Dados legados lidos corretamente |
| Transição normal | Migração completa sem perda |
| Transição interrompida | Rollback ou resume seguro |
| Idempotência de reexecução | Rodar duas vezes não duplica |

### Outros tipos detectados

- **CLI/script:** exit code, stdout, arquivo gerado, flag inválida.
- **Job assíncrono:** enqueue, processamento, falha com retry, dead letter.
- **Integração vendor:** request mapping, error mapping, webhook idempotente.

Instrua o agente a **ler código adjacente** e espelhar granularidade de testes existentes quando houver convenção clara.

---

## Dependências entre codelets

Documentar explicitamente:

```
Codelet 1 (API create) → Codelet 2 (UI consome create) → Codelet 3 (empty state)
```

Codelets sem seta podem rodar **em paralelo** (fan-out de builders na fase 5).

---

## Saída desta fase

Lista numerada incluída no prompt e opcionalmente anexada ao AC file:

```markdown
## Decomposição em codelets

1. **[Nome curto]** — [uma frase de escopo]
   - ACs: #1, #3
   - Casos adversos: timeout no gateway
   - Depende de: nenhum

2. **[Nome curto]** — ...
   - ACs: #2
   - Depende de: #1 aprovado
```

Cada codelet deve mapear para **pelo menos um** AC do `docs/prds/<domain>/<feature-slug>.md` e **zero ou mais** casos adversos da pergunta 4 do levantamento.
