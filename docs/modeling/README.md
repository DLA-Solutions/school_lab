# Data Modeling

Data models derived from approved PRDs, following the flow in `docs/product-map.md` §4
(anchor docs → PRDs → **modeling** → implementation).

## Hybrid convention

| Layer | Location | Format |
|-------|----------|--------|
| Narrative DSL | `docs/modeling/NNN-<domain>.md` | Markdown — entity groups, auth, LGPD, API lifecycle |
| Executable schema | `docs/database/database_dml.md` | DBML — canonical for migrations |
| API conventions | `docs/api/README.md` | REST conventions, rswag, errors |
| API route narratives | `docs/api/v1/*.md` | Per-wave route maps and examples |
| DER export | `docs/database/der_NNN.png` | PNG from [dbdiagram.io](https://dbdiagram.io) |

One narrative file per domain, mirroring the PRD number in `docs/prds/`. API auth
and route planning: `002-api-auth.md`. When the schema grows large, DBML may split
per domain; until then, a single `database_dml.md` is fine.

**Mermaid** `erDiagram` remains valid for simple domains or early sketches. Prefer **DBML**
when the schema grows or needs sample data and indexes.

## Content rules

- Enforce per-school isolation (`school_id`) and per-family isolation for communication.
- Mark **LGPD-sensitive** fields and note retention needs.
- English `snake_case` identifiers; Portuguese only for approved glossary exceptions
  (`docs/glossary.md`).

## Tooling

Use the `data-modeling` skill for the procedure and the `docs/modeling` rule for conventions.
Model only what an approved PRD defines — do not model undocumented domains.
