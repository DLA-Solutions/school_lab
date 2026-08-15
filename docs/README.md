# School Lab documentation

Master index for the `docs/` monorepo. Anchor docs define product direction; domain PRDs
drive modeling and implementation. Repository language is **English** (product UI is `pt-BR`).

## Documentation layers (A–I)

| Layer | Location | Responsibility | Status |
|-------|----------|----------------|--------|
| **A — Anchor** | [`vision.md`](vision.md), [`actors-and-surfaces.md`](actors-and-surfaces.md), [`product-map.md`](product-map.md), [`web-stack.md`](web-stack.md), [`glossary.md`](glossary.md), [`open-questions.md`](open-questions.md) | Vision, actors, domain order, stack, open decisions | Mature |
| **B — Benchmark** | [`ref/`](ref/README.md) | Competitive evidence (corpus, catalog, divergences, aliases) | Mature (harvest); taxonomy **100%** mapped (**1,325/1,325**) |
| **C — Product truth** | [`product/`](product/README.md) | School Lab inventory, traceability, roadmap, taxonomy | **Phase 2 complete** — parity, capability-map, mvp-scope, NFR |
| **D — PRDs** | [`prds/`](prds/index.md) | Domain and layer requirements | **Domain gate complete** — **7/7** validated (doc sign-off); layer PRDs **draft** |
| **E — Modeling** | [`modeling/`](modeling/README.md), [`database/schema.dbml`](database/schema.dbml) | Narrative DSL + executable schema | **005** and **009 Wave 1 validated** (DBML published; DER exported); **006–008 draft**; identity in progress; billing partner baseline in `web/` |
| **F — API** | [`api/`](api/README.md), `swagger/v1/` | REST contract narratives + OpenAPI | **7** domain narratives **draft** + billing baseline (historical) / identity in progress |
| **G — Guidelines** | [`guidelines/`](guidelines/README.md) | How to implement (process, web, reliability) | Includes reliability, LGPD, traceability |
| **H — Quality** | [`quality/`](quality/test-strategy.md) | Test strategy, AC harness | **Started** — test-strategy + acceptance-harness |
| **I — Ops** | [`guidelines/process/deployment.md`](guidelines/process/deployment.md) | Deploy, runbooks | Partial |

## Work sequence

```
anchor docs (A)  →  product truth (C)  →  domain PRD (D)  →  modeling (E)  →  API (F)  →  code (web/, clients)
       ↑                    ↑                    ↑
  vision, actors      traceability,         competitive
  product-map         domain-roadmap        grounding via docs/ref/
```

Detailed process: [`guidelines/process/README.md`](guidelines/process/README.md) and
[`product-map.md`](product-map.md) §4.

1. **Anchor** — validated vision, actors × surfaces, domain order (`product-map.md` §5).
2. **Product truth** — traceability IDs, domain roadmap, future capability map and MVP scope
   (Phase 1–2: `capability-taxonomy.yaml`, `parity-matrix.md`, `mvp-scope.md`).
3. **PRD** — one domain (or bounded-context folder) per [`prds/template.md`](prds/template.md);
   index at [`prds/index.md`](prds/index.md).
4. **Modeling** — narrative in `docs/modeling/NNN-<domain>.md`; schema in `docs/database/`.
5. **API** — route narratives in `docs/api/v1/`; OpenAPI from rswag in `web/swagger/v1/`.
6. **Implementation** — `web/` first for business rules; clients consume `/api/v1`.

Do not implement a domain without an approved PRD. Flag gaps in [`open-questions.md`](open-questions.md).

## Quick links by concern

| Concern | Start here |
|---------|------------|
| What we build (MVP) | [`vision.md`](vision.md) §6, [`product/mvp-scope.md`](product/mvp-scope.md), [`product/domain-roadmap.md`](product/domain-roadmap.md) |
| Who uses what channel | [`actors-and-surfaces.md`](actors-and-surfaces.md) |
| Competitor behavior (evidence) | [`ref/README.md`](ref/README.md), [`ref/catalogo-funcionalidades.md`](ref/catalogo-funcionalidades.md) |
| Market survey (informational) | [`competitive-analysis.md`](competitive-analysis.md) |
| ID conventions (BR/UC/AC, capabilities) | [`product/traceability.md`](product/traceability.md), [`product/capability-taxonomy.yaml`](product/capability-taxonomy.yaml) |
| Write or review a PRD | [`prds/template.md`](prds/template.md), skill [`write-prd`](../.cursor/skills/docs/write-prd/SKILL.md) |
| Harvest or refresh competitor corpus | skill [`corpus-concorrente`](../.cursor/skills/docs/corpus-concorrente/SKILL.md) |
| Architecture decisions | [`adr/`](adr/README.md) |
| Data model after PRD | skill `data-modeling`, [`modeling/README.md`](modeling/README.md) |

## Agent skills (docs workflow)

| Skill | Use when |
|-------|----------|
| [`write-prd`](../.cursor/skills/docs/write-prd/SKILL.md) | Authoring Product, Layer, or Domain PRDs |
| [`corpus-concorrente`](../.cursor/skills/docs/corpus-concorrente/SKILL.md) | Building or refreshing `docs/ref/` from public help centers |
| `data-modeling` | Deriving DBML/DER from approved PRDs |
| `prd-reviewer` (agent) | PRD completeness before modeling |
| `doc-consistency-checker` (agent) | Cross-doc drift after edits |

## Planned artifacts (Phase 2+)

Created in Phase 1 (alias gate complete):

- [`docs/product/capability-taxonomy.yaml`](product/capability-taxonomy.yaml) + [`capability-taxonomy.md`](product/capability-taxonomy.md) — **191** canonical capabilities (all catalog domains curated)
- [`docs/ref/capability-aliases.jsonl`](ref/capability-aliases.jsonl) — **1,325/1,325** raw IDs mapped (100%)
- [`docs/ref/taxonomy-report.json`](ref/taxonomy-report.json) — coverage stats (regen via `capabilities.py --taxonomy-report`)

Created in Phase 2 (**complete**):

- [`docs/product/parity-matrix.md`](product/parity-matrix.md) + [`docs/ref/parity-matrix.csv`](ref/parity-matrix.csv) — **191** rows × Proesc, Sponte, Agenda Edu, ClassApp
- [`docs/product/capability-map.md`](product/capability-map.md) — **191** rows; MVP/P2/N/A, differentiators, parity gaps, blockers
- [`docs/product/mvp-scope.md`](product/mvp-scope.md) — **124** MVP capabilities; P2/N/A inventory; vision exclusions
- [`docs/product/non-functional-requirements.md`](product/non-functional-requirements.md) — cross-cutting NFR catalog (PRD template links here)

Still planned:

- DER PNG exports (`der_006.png`–`der_008.png`) from dbdiagram.io after schema review; `der_005.png` and `der_009.png` are complete
