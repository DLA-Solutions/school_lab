# KAITS — competitive corpus

Harvest date: **2026-08-15**

| Field | Value |
|-------|-------|
| Source type | Public marketing / segment landing pages + homepage FAQ (no self-service help center) |
| Maturity | `claimed_not_verified` — feature claims from marketing, not step-by-step docs |
| Pages harvested | 7 |
| Capabilities derived | 5 (100% article coverage; 7 pages deduplicated to 5 capabilities) |
| Domains covered | `gestao-academica`, `gestao-financeira` |

### Capability breakdown (from `coverage.json`)

| School Lab domain | Capabilities |
|-------------------|--------------|
| `billing` | 5 |

## Source taxonomy

KAITS does **not** publish a Zendesk-style help center. Product behavior is
documented on the marketing site ([kaits.com.br](https://kaits.com.br/)), segment
landing pages under `/sistema-para-*`, and a shared FAQ block repeated on each page.

- Taxonomy is **segment-oriented** (Educação Básica, Infantil, Superior, Idiomas,
  Cursos Livres, Redes e Franquias) — product mental model follows institution type.
- Homepage also groups features by **functional area** (Pedagógico, Financeiro,
  Secretaria & Adm) — hybrid segment + module taxonomy.
- Heavy **sales-led onboarding** (demo scheduling, consultant contact); FAQ confirms
  unlimited users and pricing by active-student band.
- Feature lists are broad but **lack step-by-step troubleshooting** — friction
  signals are inferred from repeated emphasis on configurability and multi-model billing.

### Primary URLs

- https://kaits.com.br/ (homepage — full feature matrix, FAQ, product pillars)
- https://kaits.com.br/sistema-para-escola-educacao-basica/
- https://kaits.com.br/sistema-para-escola-infantil/
- https://kaits.com.br/sistema-para-ensino-superior/
- https://kaits.com.br/sistema-para-escola-de-idiomas/
- https://kaits.com.br/sistema-para-cursos-livres/
- https://kaits.com.br/sistema-para-redes-e-franquias/

**Out of scope for this pass:** authenticated product at `sistema.kaits.com.br`,
transport fleet operations, nutrition module details, full CRM pipeline, blog/marketing
articles, EAD platform integration specifics, API documentation.

## Layout

```
kaits/
├── README.md              # this file
├── glossario.md           # KAITS term → our term
├── lacunas.md             # friction map + positioning hypotheses
├── gestao-academica/
│   ├── modelo-de-dominio.md
│   ├── fluxos.md
│   └── casos-de-borda.md
└── gestao-financeira/
    ├── modelo-de-dominio.md
    ├── fluxos.md
    └── casos-de-borda.md
```

Cross-competitor comparison: [`../divergencias.md`](../divergencias.md).
