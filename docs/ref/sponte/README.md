# Sponte — competitive corpus

Harvest date: **2026-08-15**

| Field | Value |
|-------|-------|
| Source type | Public marketing / feature pages + FAQ (no self-service help center) |
| Maturity | `claimed_not_verified` — feature claims from marketing, not step-by-step docs |
| Help center | **None** — support is in-app (“Atendimento Online”) and email only |
| Pages harvested | 14 |
| Capabilities derived | 10 (100% article coverage) |
| Domains covered | `gestao-academica`, `gestao-financeira`, `comunicacao` |

### Capability breakdown (from `coverage.json`)

| School Lab domain | Capabilities |
|-------------------|--------------|
| `billing` | 10 |

## Source taxonomy

Sponte does **not** publish a Zendesk-style knowledge base. Public product behavior appears on
module-oriented marketing pages (`/gestao-pedagogica`, `/gestao-financeira`, `/secretaria`,
`/portal-do-aluno`, `/app-de-agenda-escolar`, `/captacao`, `/mensalidade-garantida`) plus a
persona-split FAQ at `/suporte` (students/guardians vs teachers).

- Taxonomy is **module-oriented** on the website (pedagogical, financial, administrative, capture).
- **Segment variants** documented for basic education vs language schools (some features unavailable
  for language-school segment — e.g. online assessments, document editor).
- Friction signals are **inferred** from FAQ escalation paths and “contact secretariat” language,
  not from troubleshooting article volume.

### Primary URLs

- https://www.sponte.com.br/ (homepage)
- https://www.sponte.com.br/software-de-gestao-escolar
- https://www.sponte.com.br/sistema-de-gestao-escolar
- https://www.sponte.com.br/funcionalidades
- https://www.sponte.com.br/gestao-pedagogica
- https://www.sponte.com.br/gestao-financeira
- https://www.sponte.com.br/secretaria
- https://www.sponte.com.br/portal-do-aluno
- https://www.sponte.com.br/app-de-agenda-escolar
- https://www.sponte.com.br/mensalidade-garantida
- https://www.sponte.com.br/captacao
- https://www.sponte.com.br/educacao-basica
- https://www.sponte.com.br/escolas-de-idiomas
- https://www.sponte.com.br/suporte (FAQ)

**Out of scope:** authenticated ERP UI, in-app chat support transcripts, Sponte Gov (public sector),
blog/case studies, hardware turnstile integrations.

## Article counts by domain (derived)

| Domain | Pages (keyword overlap) |
|--------|---------------------------|
| `gestao-academica` | 14 |
| `gestao-financeira` | 14 |
| `comunicacao` | 2 (portal + app pages; overlap with academic) |

Cross-competitor comparison: [`../divergencias.md`](../divergencias.md).
