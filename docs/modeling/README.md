# Data Modeling

Data models derived from approved PRDs, following the flow in `docs/product-map.md` §4
(anchor docs → PRDs → **modeling** → implementation).

## Convention

- One file per domain: `NNN-<domain>.md`, mirroring the PRD number in `docs/prds/`.
- Each file contains a concise **DSL** (entities, fields, types, relationships) followed by
  the **DER** (Mermaid `erDiagram` preferred).
- Enforce per-school isolation (`school_id`) and per-family isolation for communication.
- Mark **LGPD-sensitive** fields (health, routine, medications, incidents, message content)
  and note retention needs.
- English `snake_case` identifiers; Portuguese only for approved glossary exceptions
  (`docs/glossary.md`).

## Tooling

Use the `data-modeling` skill for the procedure and the `docs/modeling` rule for conventions.
Model only what an approved PRD defines — do not model undocumented domains.
