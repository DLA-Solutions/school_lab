> Data modeling conventions — narrative DSL + executable DBML/DER
>
> **Relevant when touching:** `docs/modeling/**`, `docs/database/**`

# docs/modeling/ + docs/database/ — Data Modeling

Modeling comes after PRDs and before implementation (`docs/product-map.md` §4). Model only what an approved PRD defines.

## Hybrid pattern

| Output | Location | Purpose |
|--------|----------|---------|
| Narrative DSL | `docs/modeling/NNN-<domain>.md` | Entity groups, auth model, LGPD notes, scope boundaries |
| Executable schema | `docs/database/schema.dbml` | DBML — canonical for migrations, dbdocs, dbdiagram |
| DER export | `docs/database/der_NNN.png` | Visual review; link from PRDs |

Every PRD entity change must update `docs/database/schema.dbml` first, then align the narrative file. After schema changes, publish dbdocs — rule `dbdocs`, skill `publish-dbdocs`.

## Conventions

- Mirror PRD number: `001-fintech-first.md` ↔ `der_001.png`.
- DBML is the executable DER; Mermaid `erDiagram` remains valid for simple domains or sketches.
- Enforce per-school isolation (`school_id`); family-level isolation for communication.
- Mark LGPD-sensitive fields; note retention where legal is pending.
- English `snake_case` identifiers; Portuguese only for glossary exceptions (`docs/glossary.md`).

Use the `data-modeling` skill for the full procedure. Detailed guidance: `docs/guidelines/process/`.
