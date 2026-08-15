# Harness de verificação (fase 6)

## Premissa central

Um crítico **só pode aprovar** o que **ele mesmo verificou nesta rodada**, com **evidência que ele mesmo gerou**.

| Constituem aprovação | **Nunca** constituem aprovação |
|----------------------|--------------------------------|
| Output de teste que o crítico rodou | Evidência anexada pelo builder |
| Screenshot capturado pelo crítico nesta sessão | Screenshot reaproveitado de rodada anterior |
| Response HTTP que o crítico solicitou | "O código parece correto" |
| Log de comando lint/test que o crítico executou | Veredito de outro crítico |
| Árvore de acessibilidade lida pelo crítico | Diff review como substituto de execução |

**Proibição explícita:** reaproveitar evidência do builder ou de outro crítico, mesmo que "obviamente a mesma". Cada crítico regenera evidência.

---

## Detecção do nível disponível

Executar **uma vez** no início da fase 5, **antes** de disparar qualquer crítico. Registrar o nível no prompt de cada crítico.

### Checklist de detecção

```
1. MCP de automação de navegador configurado e acessível?
   (ex.: Playwright MCP, browser automation — verificar via GetMcpTools / CallMcpTool)

2. Servidor de desenvolvimento rodando OU pode ser iniciado?
   (API, SPA, mobile bundler — detectar scripts em package.json, Procfile, bin/dev)

3. Suíte de testes automatizados executável?
   (rspec, jest, pytest — detectar CI config e bin/test)
```

---

## Nível A — completo

**Condição:** MCP de navegador **e** app/servidor executável.

**Capacidades para todos os cinco críticos:**

| Crítico | Verificação nível A |
|---------|---------------------|
| Contrato | Fluxo real + testes; quebra fora do AC via UI/API |
| Padrão | Lint + árvore de acessibilidade + inspeção visual |
| Usuário hostil | Navegação real sem ver código |
| Paridade bar | Executar bar (produto/doc) vs implementação side-by-side |
| Estado adverso | Interceptação de rede, offline, mock de relógio, multi-tab |

**Evidência:** captura de tela, snapshot de accessibility tree, HAR/network log, output de teste — anexados ao veredito.

---

## Nível B — parcial

**Condição:** **Sem** MCP de navegador, **mas** servidor ou testes executáveis.

| Tipo de codelet | Cobertura |
|-----------------|-----------|
| Lógica / API / serviço | **Completa** via chamada direta (curl, request spec, integration test) + suíte existente |
| Interface | **Reduzida** — lint, testes de componente se existirem, inspeção estática limitada |

**Obrigação do crítico de interface em nível B:**

Escrever explicitamente no veredito:

```
## Cobertura não verificada
- [ ] Navegação por teclado em browser real
- [ ] Layout responsivo
- [ ] ...
Motivo: nível B — sem MCP de navegador.
```

**Reprovação por cobertura:** se o AC **exige** verificação visual/interativa que nível B não alcança, crítico **reprova** citando a lacuna — **não** finge cobertura completa.

**Usuário hostil em nível B:** usa API/docs/CLI se existir caminho de usuário; se não existir, reprova com "impossível simular usuário sem app renderizado".

---

## Nível C — nenhum

**Condição:** Sem app rodando **e** sem forma de executar testes ou requests.

**Comportamento:**

1. **Parar fase 5 inteira.** Nenhum crítico dispara. Nenhum crítico aprova nada.
2. Devolver ao usuário pedido **específico**:

```
Codelet Loop parado: harness nível C.

Para continuar, faça UMA das opções:
A) Subir ambiente de desenvolvimento: [comando detectado, ex. bin/dev]
B) Instalar e configurar MCP de automação de navegador
C) Executar suíte de testes: [comando detectado]

A skill NÃO prossegue julgando apenas código-fonte (diff review).
```

**Proibição explícita:** críticos julgando apenas diff como substituto de execução real — isso é o modo de falha mais comum e está **proibido**.

---

## Isolamento entre críticos concorrentes

Quando múltiplos críticos rodam em paralelo no **mesmo codelet**:

| Risco | Mitigação |
|-------|-----------|
| Dois críticos mutam mesmo estado (form submit, delete) | Sessão de navegador própria por crítico |
| Mesma aba, mesma conta | Contexto isolado, aba separada, ou instância de browser |
| Servidor stateful compartilhado | Dados de teste distintos por crítico (factory IDs diferentes) |
| Race em DB de dev | Transações de teste ou banco efêmero se disponível |

Dois críticos batendo no mesmo estado ao mesmo tempo **corrompe** a leitura de ambos sem aparecer no veredito — o orquestrador deve serializar críticos que conflitam se isolamento não for possível.

---

## Escalonamento manual fora do loop

Alguns codelets dependem de ambientes que automação não replica:

- SSO corporativo real
- Gateway de pagamento sandbox com 2FA
- Comportamento de browser com sessão logada específica
- Push notification em device físico

**Procedimento:**

1. Registrar no relatório do codelet: **limitação do harness automatizado**.
2. Descrever passos de verificação manual exatos.
3. Sugerir ao usuário: rodar verificação manualmente (agente de navegador separado, ou humano) e colar evidência como anexo ao codelet.
4. Críticos automatizados **não** aprovam o caso manual — orquestrador marca codelet como "aprovado condicional a evidência manual anexada" ou mantém gap aberto.

**Proibição:** fingir que o loop automatizado cobriu o caso.

---

## Comandos úteis de detecção (genéricos)

O agente deve detectar no repositório — exemplos, não lista fechada:

| Sinal | Onde procurar |
|-------|---------------|
| Dev server | `bin/dev`, `npm run dev`, `docker compose up`, README |
| Testes | `rspec`, `npm test`, `pytest`, `.github/workflows/` |
| Lint | `rubocop`, `eslint`, `bin/ci` |
| Browser MCP | GetMcpTools pattern `playwright`, `browser`, `puppeteer` |

Documentar comandos detectados no prompt de cada crítico.

---

## Formato de evidência no veredito

```
## Evidência (gerada por este crítico, rodada N)
- Comando: `curl -X POST ...` → HTTP 422, body: {...}
- Teste: `rspec spec/requests/...` → 1 example, 0 failures
- Screenshot: [path ou descrição se MCP retornou asset]
- Timestamp: [quando relevante para caso temporal]
```

Sem bloco de evidência → veredito não pode ser APROVADO.
