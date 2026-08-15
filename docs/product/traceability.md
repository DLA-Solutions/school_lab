# Traceability conventions

ID and linking rules for School Lab product documentation. Define these **before** writing
or extending domain PRDs so requirements, competitive evidence, and future parity checks
stay aligned.

Canonical capability taxonomy (`capability-taxonomy.yaml`) is **Phase 1 — alias gate complete**
(**1,325/1,325** raw catalog IDs mapped; **191** canonical capabilities). This document defines formats and rules; PRDs use
`capability_id` when grounded in market even before every domain is fully curated.

## ID formats

| ID | Format | Example | Lives in |
|----|--------|---------|----------|
| Canonical capability | `domain.verb_noun` | `communication.send_direct_message` | `capability-taxonomy.yaml` |
| Raw alias | `raw:<competitor>:<raw_id>` | `raw:proesc:communication.send_enviar_recado` | `.corpus-raw/*/capabilities.jsonl`, catalog |
| Business rule | `BR-NNN` | `BR-042` | Domain PRD |
| Use case | `UC-NNN` | `UC-012` | Domain PRD |
| Acceptance criterion | `AC-NNN` | `AC-012` (Gherkin optional) | Domain PRD |
| Divergence | `DIV-<domain>-NNN` | `DIV-financial-003` | [`docs/ref/divergencias.md`](../ref/divergencias.md) + `divergence_ref` in taxonomy |

**Domain prefix** in canonical IDs uses the short slug: `billing`, `communication`, `academic`,
`students`, `identity`, `documents`, `platform`, `integrations` — aligned with catalog sections
in [`catalogo-funcionalidades.md`](../ref/catalogo-funcionalidades.md).

**Divergence numbering (Phase 1):** assign sequential `DIV-<domain>-NNN` on taxonomy rows that
encode a School Lab decision from [`divergencias.md`](../ref/divergencias.md). Domain segment
matches the divergence table (`financial` → billing capabilities, `communication`, `academic`,
`integration` for go-to-market rows). Rows without a numbered DIV id in the markdown table still
link by topic via `school_lab_decision` prose.

**Quality signals:** raw catalog entries tagged `resolve_*`, troubleshooting maturity, or FAQ-style
labels map to canonical capabilities with `quality_signal: true` (e.g. `billing.quality_signal_support`).
These measure competitor documentation friction — not MVP parity targets.

**Alias file:** [`docs/ref/capability-aliases.jsonl`](../ref/capability-aliases.jsonl) — one JSON
object per line (`raw_id`, `canonical_id`, `competitor`, optional `quality_signal`, `notes`).
Regenerate domain aliases with `capabilities.py --sync-aliases --domain <domain>`.

**Naming:** use `BR-`, not `RN-`, for business rules in all new and revised PRDs.

### Raw catalog IDs (interim)

Until Phase 1 curation lands, PRDs may reference **raw** IDs from
[`docs/ref/catalogo-funcionalidades.md`](../ref/catalogo-funcionalidades.md), e.g.
`billing.manage_procurar_parcelas_do_aluno_ou_`. Prefer citing the competitor corpus
path (e.g. `docs/ref/proesc/gestao-financeira/fluxos.md`) in acceptance criteria.

When a canonical ID is assigned later, add it to the PRD header and BR/UC/AC blocks without
renumbering historical BRs.

## Linking rules

### Capability map — [`docs/product/capability-map.md`](capability-map.md)

Each canonical capability documents:

- **Actors** — who performs or receives (see [`actors-and-surfaces.md`](../actors-and-surfaces.md))
- **Surfaces** — web SPA, mobile, API, backoffice
- **Phase** — MVP, P2, or N/A
- **Aliases** — links to raw catalog entries and `docs/ref/<competitor>/` artifacts
- **School Lab decision** — from `divergencias.md` or PRD when competitors disagree
- **Target PRD** — path when the domain PRD exists

### PRD requirements

When a requirement is **grounded in observed market behavior**:

1. Set `capability_id` in the PRD metadata (canonical when available; raw alias otherwise).
2. Link at least one `docs/ref/` source in **Competitive grounding** or on the relevant AC.
3. Number business rules `BR-NNN`, use cases `UC-NNN`, acceptance criteria `AC-NNN` — unique
   within the PRD file (or bounded-context folder with prefix if needed, e.g. `BR-P001` in
   [`identity-and-onboarding/permissions.md`](../prds/identity-and-onboarding/permissions.md)).

When a requirement is **School Lab–specific** (no competitor anchor), omit `capability_id`
and mark the AC as `[invented]` or `[product decision]` in feature slices.

### Divergences

Cross-competitor disagreements live in [`docs/ref/divergencias.md`](../ref/divergencias.md).
When a PRD picks a side:

- Reference the `DIV-*` id if assigned.
- If no DIV row exists yet, add one in a corpus refresh or flag in `open-questions.md`.

### Downstream trace (implementation)

| Stage | Trace |
|-------|-------|
| Modeling | Entity groups in `docs/modeling/NNN-<domain>.md` reference PRD BR/UC ids in comments or section headers where helpful |
| API | Route narratives in `docs/api/v1/` link to PRD use cases |
| Tests | Request specs and service specs may cite `AC-NNN` in description or shared example metadata |
| Parity *(Phase 2)* | `parity-matrix.md` rows keyed by canonical `capability_id` |

### Segment flags

PRDs and future capability rows may tag segment applicability:

| Flag | Meaning |
|------|---------|
| `infantil` | Early childhood / Educação Infantil |
| `fundamental_medio` | Elementary and high school |
| `pj_financeiro` | Legal entity (CNPJ) as financial payer |
| `multi_unidade` | Multi-campus school group |

Use a table or inline tags in **Segment applicability** (see [`prds/template.md`](../prds/template.md)).

## Related documents

- [`docs/product/README.md`](README.md) — product truth vs benchmark vs anchors
- [`docs/prds/template.md`](../prds/template.md) — PRD sections for grounding and IDs
- [`docs/product/capability-taxonomy.yaml`](capability-taxonomy.yaml) — canonical capabilities (Phase 1)
- [`docs/ref/capability-aliases.jsonl`](../ref/capability-aliases.jsonl) — raw → canonical map
- [`docs/ref/catalogo-funcionalidades.md`](../ref/catalogo-funcionalidades.md) — 1,325 raw capabilities
- [`docs/ref/divergencias.md`](../ref/divergencias.md) — competitor disagreements
