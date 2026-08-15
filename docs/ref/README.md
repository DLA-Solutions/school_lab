# Competitive reference corpus (`docs/ref/`)

Structured, derived research from public competitor sources — domain models,
flows, edge cases, terminology, friction maps, and cross-competitor divergences.

This is **not** a copy of competitor documentation. Each artifact summarizes
observed behavior with source URLs; raw harvest lives in `.corpus-raw/` (gitignored).

## Competitors

| Competitor | Harvest date | Articles | Capabilities | Coverage | Help center | Index |
|------------|--------------|----------|--------------|----------|-------------|-------|
| **Proesc** | 2026-08-15 | 580 | 576 | 100% | [suporte.proesc.com](https://suporte.proesc.com/hc/pt-br) (Zendesk) | [`proesc/README.md`](proesc/README.md) |
| **Agenda Edu** | 2026-08-15 | 368 | 351 | 100% | [atendimento.agendaedu.com](https://atendimento.agendaedu.com/hc/pt-br) (Zendesk) | [`agenda-edu/README.md`](agenda-edu/README.md) |
| **ClassApp** | 2026-08-15 | 274 | 267 | 100% | [ajuda.classapp.com.br](https://ajuda.classapp.com.br/hc/pt-br) (Zendesk) | [`classapp/README.md`](classapp/README.md) |
| **TOTVS Educacional** | 2026-08-15 | 122 | 105 | 100% | Partial — [CST Zendesk](https://totvscst.zendesk.com/hc/pt-br); main Educacional login-gated | [`totvs/README.md`](totvs/README.md) |
| **Sponte** | 2026-08-15 | 14 | 10 | 100% | None (marketing + FAQ; in-app support) | [`sponte/README.md`](sponte/README.md) |
| **KAITS** | 2026-08-15 | 7 | 5 | 100% | None (`claimed_not_verified` — marketing-only) | [`kaits/README.md`](kaits/README.md) |
| **Edukante** | 2026-08-15 | 5 | 5 | 100% | None (`claimed_not_verified` — marketing-only; 1 FAQ URL 404) | [`edukante/README.md`](edukante/README.md) |
| **ClipEscola** | 2026-08-15 | 3 | 3 | 100% | Login-gated (in-app Ajuda); public FAQ + EAD module | [`clipescola/README.md`](clipescola/README.md) |
| **Sophia** | 2026-08-15 | 3 | 3 | 100% | Login-gated (Área do Cliente); marketing-only public | [`sophia/README.md`](sophia/README.md) |

**Catalog:** [`catalogo-funcionalidades.md`](catalogo-funcionalidades.md) — **1,325** unique capabilities across 9 competitors.
**Aliases:** [`capability-aliases.jsonl`](capability-aliases.jsonl) — **1,325/1,325 (100%)** mapped to canonical IDs in [`capability-taxonomy.yaml`](../product/capability-taxonomy.yaml) — Phase 1 alias gate **complete**.
**Parity export:** [`parity-matrix.csv`](parity-matrix.csv) — machine-readable **191** rows × primary competitors (regen via `--generate-parity-matrix --csv`).

## Layout

```
docs/ref/
├── README.md                       # this index
├── catalogo-funcionalidades.md     # deduplicated cross-competitor capability catalog
├── capability-aliases.jsonl        # raw catalog ID → canonical ID (Phase 1 taxonomy)
├── cluster-suggestions.json        # PT-label merge groups for human review
├── taxonomy-report.json            # alias coverage stats (regen via capabilities.py)
├── divergencias.md                 # cross-competitor disagreements + our decisions
├── parity-matrix.csv               # machine-readable parity export (Phase 2)
└── <competitor>/                   # one folder per scraped competitor
    ├── README.md                   # harvest metadata, source URLs, scope
    ├── glossario.md                # competitor term → our term (per competitor)
    ├── lacunas.md                  # friction map for this competitor
    └── <domain>/                   # gestao-academica, gestao-financeira, comunicacao
        ├── modelo-de-dominio.md
        ├── fluxos.md
        ├── casos-de-borda.md
        └── funcionalidades-por-ator.md   # exhaustive capability inventory by actor
```

Raw harvest (gitignored): `.corpus-raw/<competitor>/` with `extracao.jsonl`,
`capabilities.jsonl`, and `coverage.json`.

When anchoring PRD acceptance criteria to observed competitor behavior, use the
full path, e.g. `docs/ref/classapp/comunicacao/casos-de-borda.md`.

## Relationship to other docs

| Document | Role |
|----------|------|
| [`docs/competitive-analysis.md`](../competitive-analysis.md) | High-level market survey (informational, not a decision anchor) |
| `docs/ref/<competitor>/` | Per-competitor structured corpus |
| `docs/ref/catalogo-funcionalidades.md` | Deduplicated capability catalog across competitors |
| `docs/ref/capability-aliases.jsonl` | Raw → canonical mapping ([`capability-taxonomy.yaml`](../product/capability-taxonomy.yaml)) |
| `docs/ref/divergencias.md` | Where competitors disagree + School Lab decision |
| `docs/product/capability-taxonomy.yaml` | Canonical capability inventory (Phase 1) |
| `docs/product/parity-matrix.md` + `parity-matrix.csv` | School Lab phase vs competitor presence (Phase 2) |
| `docs/product/mvp-scope.md` | MVP vs P2 vs out-of-scope inventory (Phase 2) |
| `docs/prds/` | Product decisions; anchor acceptance criteria to `docs/ref/` when grounded |

## How to build or refresh

Use the **`corpus-concorrente`** skill (`.cursor/skills/docs/corpus-concorrente/`).
Only public content; respect robots.txt and rate limits.

**Note:** `harvest.py` Zendesk detection was fixed 2026-08-14 to use API origin
(`scheme://host`) instead of `/hc/<locale>` path — required for ClassApp and Agenda Edu.
