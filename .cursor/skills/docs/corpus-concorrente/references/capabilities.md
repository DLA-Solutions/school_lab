# Inventário de capabilities

Uma **capability** é uma funcionalidade observada no concorrente — uma capacidade que
um ator pode exercer no sistema. Diferente de um artigo (que pode descrever várias
capabilities) e de uma tarefa na extração (que é o foco principal de um artigo).

O inventário alimenta `funcionalidades-por-ator.md` (por concorrente) e
`catalogo-funcionalidades.md` (cross-competitor, deduplicado).

## Schema (`capabilities.jsonl`)

```json
{
  "capability_id": "billing.send_charge",
  "label": "Send charge to guardian",
  "competitor": "proesc",
  "domain": "billing",
  "actors": ["staff"],
  "staff_templates": ["financial"],
  "primary_actor": "staff",
  "surfaces": ["web", "app"],
  "maturity": "documented",
  "tipo": "como_fazer",
  "description": "Create and send a charge linked to student enrollment; guardian pays via app or boleto.",
  "preconditions": ["student enrolled", "payment plan assigned"],
  "source_urls": ["https://suporte.proesc.com/hc/pt-br/articles/..."],
  "source_titles": ["Como enviar cobrança"],
  "friction_score": 4.2,
  "competitor_term": "débito"
}
```

## Campo a campo

**`capability_id`** — identificador estável em inglês, formato `domain.verb_noun`.
Use o mesmo ID para a mesma funcionalidade em concorrentes diferentes. Exemplos:

| capability_id | Significado |
|---------------|-------------|
| `enrollment.online_trail` | Trilha de matrícula/rematrícula online |
| `billing.boleto_remittance` | Geração de boleto com remessa bancária |
| `academic.grade_recovery` | Lançamento de nota de recuperação |
| `communication.broadcast_message` | Comunicado em massa para famílias |

**`label`** — nome curto em inglês para o catálogo.

**`domain`** — domínio canônico School Lab (ver tabela abaixo).

**`actors` / `staff_templates`** — atores normalizados; templates só quando `staff`.

**`maturity`** — como a capability foi observada:

| Valor | Significado |
|-------|-------------|
| `documented` | Artigo de ajuda público descreve o fluxo |
| `conceptual` | Artigo explica o modelo, sem procedimento |
| `troubleshooting` | Artigo de resolução de problema — capability implícita |
| `configuration` | Setup inicial / parametrização |
| `claimed_not_verified` | Marketing ou FAQ sem procedimento verificável |

**`tipo`** — espelha `tipo_artigo` da extração dominante.

**`friction_score`** — score agregado do mapa de atrito para esta capability (ordinal).

## Domínios canônicos

Mapeamento dos domínios heurísticos da extração (`extract.py`) para domínios do
`product-map.md`:

| Domínio canônico | Padrões / tags de extração |
|------------------|----------------------------|
| `identity-and-onboarding` | login, convite, senha, 2fa, perfil, LGPD |
| `students-and-enrollments` | matricula, enrollment, rematr, contrato, capta |
| `academic` | boletim, diario, attendance, nota, avalia, rotina |
| `billing` | financeiro, boleto, cobran, pix, inadimpl, débito |
| `communication` | comunicacao, mensag, canal, chat, recado, mural |
| `documents-and-archive` | documento, certificado, declaração, arquivo |
| `integrations` | integra, importa, API, ERP, sincroniz |
| `platform-and-admin` | relatório, analytics, configuração, ano letivo, multi-unidade |

Artigos com domínio `other` exigem classificação manual na Fase 3b.

## Regras de deduplicação (cross-competitor)

Ao gerar `catalogo-funcionalidades.md`:

1. Agrupe por `capability_id` — uma linha por funcionalidade, não por concorrente.
2. Dentro do grupo, una `source_urls` e marque quais concorrentes possuem a capability.
3. Se dois concorrentes usam nomes diferentes para a mesma capability, uma entrada
   no catálogo com colunas de vocabulário no glossário.
4. Se a mesma palavra descreve comportamentos diferentes, **IDs distintos**
   (ex.: `enrollment.online_trail` vs `enrollment.in_person_enrollment`).
5. Capabilities `troubleshooting` contam como presença — o concorrente tem a feature,
   mas com atrito documentado.

## Derivação automática vs. julgamento humano

`scripts/capabilities.py` deriva capabilities a partir de `extracao.jsonl` com
heurísticas. A Fase 3b exige passada de julgamento:

- Mesclar capabilities duplicadas do mesmo concorrente (mesma tarefa, artigos diferentes).
- Separar capabilities que a heurística fundiu indevidamente.
- Preencher `description` e `preconditions` com conteúdo derivado, não cópia.
- Marcar artigos sem capability como `unmapped` no relatório de cobertura.

Meta de cobertura: **≥95%** dos artigos mapeados a ≥1 capability.

## Relação com outros artefatos

| Artefato | Relação |
|----------|---------|
| `extracao.jsonl` | 1 artigo → 1+ capabilities |
| `funcionalidades-por-ator.md` | capabilities agrupadas por ator, por domínio |
| `fluxos.md` | caminho feliz das capabilities de maior atrito |
| `casos-de-borda.md` | armadilhas e `troubleshooting` capabilities |
| `catalogo-funcionalidades.md` | merge deduplicado de todos os concorrentes |
| `divergencias.md` | onde implementações divergem para o mesmo capability_id |
