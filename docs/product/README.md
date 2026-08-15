# Product truth (`docs/product/`)

School Lab **product decisions** and **delivery inventory** — what we commit to build,
how requirements trace to evidence, and where each domain stands. This layer sits between
anchor docs (vision, actors) and domain PRDs.

## How this relates to other doc layers

| Layer | Location | Role | Use for |
|-------|----------|------|---------|
| **Anchor** | `docs/vision.md`, `actors-and-surfaces.md`, `product-map.md` | Validated direction, MVP boundaries, monorepo layout | *Why* and *who* — stable until stakeholder validation changes |
| **Benchmark** | `docs/ref/` | Observed competitor behavior with source URLs | *Evidence* — anchor acceptance criteria when grounded in market |
| **Product truth** | `docs/product/` *(this folder)* | Traceability, roadmap status, future capability/MVP inventory | *What we ship* and *how IDs link* — School Lab decisions |
| **PRDs** | `docs/prds/` | Detailed requirements per domain | *How* a domain behaves — BR/UC/AC, API, permissions |
| **Market survey** | `docs/competitive-analysis.md` | High-level market overview (informational) | Context only — **not** a decision anchor |

### Avoid duplication

- **`competitive-analysis.md`** — keep as a readable market survey (profiles, trends, stakeholder
  notes). Do **not** copy competitor feature lists into product truth; link to `docs/ref/` instead.
- **`docs/ref/`** — raw and deduplicated competitor capabilities (`catalogo-funcionalidades.md`,
  per-competitor corpora). Product truth **references** evidence; it does not re-scrape or
  duplicate harvest content.
- **Anchor docs** — MVP in/out and actor summaries stay in `vision.md` and
  `actors-and-surfaces.md`. Product truth adds **status columns**, **ID conventions**, and
  planned inventories (capability map, parity matrix) without rewriting vision prose.

When a School Lab decision resolves a competitor divergence, record it in
[`docs/ref/divergencias.md`](../ref/divergencias.md) (evidence layer) and reflect it in the
target PRD. [`capability-map.md`](capability-map.md) links canonical IDs to that decision.

## Contents (Phase 0)

| Document | Purpose |
|----------|---------|
| [`traceability.md`](traceability.md) | ID formats (capability, BR/UC/AC, DIV-*), linking rules |
| [`domain-roadmap.md`](domain-roadmap.md) | Domain maturity: PRD, modeling, API, dependencies |

## Contents (Phase 1 — started)

| Artifact | Status | Purpose |
|----------|--------|---------|
| [`capability-taxonomy.yaml`](capability-taxonomy.yaml) | **Complete** | Canonical **191** capabilities; all catalog domains curated (**12** documents, vision-led) |
| [`capability-taxonomy.md`](capability-taxonomy.md) | Generated | Human-readable view — regen from YAML (see file header) |
| [`../ref/capability-aliases.jsonl`](../ref/capability-aliases.jsonl) | **Complete** | Raw → canonical alias map (**1,325/1,325** — 100%) |
| [`../ref/cluster-suggestions.json`](../ref/cluster-suggestions.json) | Generated | PT-label merge suggestions for human review |
| `capability-map.md` | **Complete** | Per-capability actors, surfaces, phase, differentiator, blockers, PRD targets *(Phase 2 increment 2)* |

Regenerate aliases and MD after editing taxonomy:

```bash
python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --sync-aliases --domain billing \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl

python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --sync-aliases --domain communication \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl

python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --sync-aliases --domain academic \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl

python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --sync-aliases --domain students \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl

python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --sync-aliases --domain identity \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl

python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --sync-aliases --domain platform \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl

python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --sync-aliases --domain documents \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl

python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --generate-taxonomy-md \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl
```

Legacy billing-only flag (`--sync-billing-aliases`) remains an alias for `--sync-aliases --domain billing`.

Taxonomy report:

```bash
python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py --taxonomy-report
```

## Contents (Phase 2 — complete)

| Artifact | Status | Purpose |
|----------|--------|---------|
| [`parity-matrix.md`](parity-matrix.md) | **Complete** | Canonical **191** rows × primary competitors (Proesc, Sponte, Agenda Edu, ClassApp); presence from aliases + catalog maturity |
| [`../ref/parity-matrix.csv`](../ref/parity-matrix.csv) | Generated | Machine-readable export of parity rows |
| [`capability-map.md`](capability-map.md) | **Complete** | Per-capability actors, surfaces, phase, differentiator, blockers, PRD targets, alias counts, MVP parity gaps |
| [`mvp-scope.md`](mvp-scope.md) | **Complete** | **124** MVP capabilities by domain; P2/N/A inventory; vision §6 exclusions; fintech-first gaps |
| [`non-functional-requirements.md`](non-functional-requirements.md) | **Complete** | Cross-cutting NFR catalog (reliability, LGPD, tenancy, push, observability) — PRDs link here |

Regenerate parity matrix after taxonomy or alias changes:

```bash
python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --generate-parity-matrix \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl \
  --catalog-path docs/ref/catalogo-funcionalidades.md \
  --out docs/product/parity-matrix.md \
  --csv docs/ref/parity-matrix.csv
```

Regenerate capability map after taxonomy, alias, or open-question changes:

```bash
python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --generate-capability-map \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl \
  --catalog-path docs/ref/catalogo-funcionalidades.md \
  --out docs/product/capability-map.md
```

Regenerate MVP scope after taxonomy, alias, or vision/open-question changes:

```bash
python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --generate-mvp-scope \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl \
  --catalog-path docs/ref/catalogo-funcionalidades.md \
  --out docs/product/mvp-scope.md
```

## Phase 2 gate (complete)

All Phase 2 product-truth artifacts are generated and cross-linked:

| Check | Status |
|-------|--------|
| Parity matrix covers all **191** canonical capabilities | ✓ |
| Capability map MVP count matches taxonomy (`phase: MVP`) | ✓ — **124** |
| MVP scope consistent with capability-map and [`vision.md`](../vision.md) §6 | ✓ |
| NFR doc exists for PRD template links | ✓ — [`non-functional-requirements.md`](non-functional-requirements.md) |

## Phase 4 — documentation completion (complete)

All **7** MVP domain PRD folders are **`validated`** (2026-08-15). Modeling **`005`–`009`**
and API narratives in `docs/api/v1/` are drafted. See [`prds/index.md`](../prds/index.md).

**Next:** engineering implementation per [`domain-roadmap.md`](domain-roadmap.md); rswag specs.

## Planned (Phase 3+)

| Artifact | Phase | Purpose |
|----------|-------|---------|
| `docs/quality/` | 3+ | Test strategy, AC harness |

## Workflow

1. Ground requirements in `docs/ref/` when behavior is market-informed (cite `capability_id`
   or raw alias — see [`traceability.md`](traceability.md)).
2. Write or update the domain PRD in `docs/prds/`.
3. Update [`domain-roadmap.md`](domain-roadmap.md) status when PRD, modeling, or API matures.
4. Use [`capability-map.md`](capability-map.md) for per-capability actors, surfaces, phase,
   differentiator flags, blockers, and target PRD.
5. Use [`mvp-scope.md`](mvp-scope.md) for MVP vs P2 vs out-of-scope decisions.
6. Use [`parity-matrix.md`](parity-matrix.md) to spot MVP gaps vs primary competitors before scoping PRDs.
7. Link cross-cutting NFRs from [`non-functional-requirements.md`](non-functional-requirements.md) in domain PRDs.

Skills: [`write-prd`](../../.cursor/skills/docs/write-prd/SKILL.md),
[`corpus-concorrente`](../../.cursor/skills/docs/corpus-concorrente/SKILL.md).
