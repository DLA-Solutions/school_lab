# Edukante — competitive corpus

Harvest date: **2026-08-15**

| Field | Value |
|-------|-------|
| Source type | Public marketing / feature pages (no self-service help center) |
| Maturity | `claimed_not_verified` — feature claims from marketing, not step-by-step docs |
| Pages harvested | 5 (1 FAQ URL returned 404) |
| Capabilities derived | 5 (100% article coverage) |
| Domains covered | `gestao-academica`, `gestao-financeira` |

### Capability breakdown (from `coverage.json`)

| School Lab domain | Capabilities |
|-------------------|--------------|
| `billing` | 5 |

## Source taxonomy

Edukante does **not** publish a Zendesk-style help center. Product behavior is
documented on long-form marketing and “Recursos” pages under
`/sistemas-gestao-escolar/`, plus FAQ and contract terms.

- Taxonomy is **module-oriented** (Acadêmico, Financeiro, EAD, CRM) on the website.
- Heavy **white-glove setup** (support configures evaluation model, layouts, bank account).
- Feature lists are exhaustive but **lack step-by-step troubleshooting** — friction
  signals are inferred from repeated “contact support” language, not from callout counts.

### Primary URLs

- https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx
- https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx
- https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx
- https://www.edukante.com/sistemas-gestao-escolar/software-gestao-escolar-web-controle-academico.aspx
- https://www.edukante.com/sistemas-gestao-escolar/software-gestao-para-escolas-cursos-faculdades-perguntas-frequentes.aspx (FAQ — **404 at harvest**)
- https://edukante.com/ (homepage modules)

**Out of scope for this pass:** EAD (AVA, provas digitais, salas virtuais), full CRM
pipeline, catraca hardware integration details, authenticated product UI.

## Layout

```
edukante/
├── README.md              # this file
├── glossario.md           # Edukante term → our term
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
