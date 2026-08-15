# TOTVS Educacional — competitive corpus

Harvest date: **2026-08-15**

| Field | Value |
|-------|-------|
| Source type | Zendesk CST portal (122 articles, mostly admin/finance) — **partial** |
| Help center URL | https://totvscst.zendesk.com/hc/pt-br (harvested); Educacional section login-gated |
| Articles harvested | 122 |
| Capabilities derived | 105 (100% article coverage) |
| Domains covered | `gestao-academica`, `gestao-financeira` (limited `comunicacao`) |

### Capability breakdown (from `coverage.json`)

| School Lab domain | Capabilities |
|-------------------|--------------|
| `billing` | 35 |
| `platform-and-admin` | 24 |
| `communication` | 21 |
| `academic` | 15 |
| `students-and-enrollments` | 7 |
| `identity-and-onboarding` | 3 |

## Source taxonomy

TOTVS splits documentation across **Central de Atendimento** (customer portal,
many articles require authenticated company profile), **TDN** (technical docs for
Linha RM), and marketing at totvs.com/educacional.

The harvest used the public **totvscst.zendesk.com** API (122 articles). Most
indexed content is **CST administrative/finance** (NFS-e per city, portal imports,
eSocial) — not step-by-step Educacional pedagogy. Academic behavior is inferred
from marketing module list.

- Taxonomy is **enterprise module-oriented** (Gestão Educacional, Financeira, CRM, RH).
- Product mental model: **network-scale ERP** with AVA integrations and Carol AI assistant.
- Heavy **consultoria telefônica** and portal authorization model.

### Primary URLs

- https://www.totvs.com/educacional/totvs-educacional/
- https://produtos.totvs.com/produto/educacional/
- https://centraldeatendimento.totvs.com/hc/pt-br/sections/206984868-Educacional
- https://totvscst.zendesk.com/hc/pt-br (harvested)

**Out of scope:** TDN deep technical pages, authenticated portal articles, Eleve line.

Cross-competitor comparison: [`../divergencias.md`](../divergencias.md).
