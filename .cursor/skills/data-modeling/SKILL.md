---
name: data-modeling
description: Derive data models (DSL then DER) from approved PRDs for School Lab. Use when the user asks to model data, design tables/entities, or produce a DER from PRDs.
---

# Data Modeling (PRD → DSL → DER)

Per `docs/product-map.md` §4, modeling comes after PRDs and before implementation.

## Steps
1. Read the relevant PRD(s) in `docs/prds/` — model only what PRDs define.
2. Produce a concise DSL (entities, fields, types, relationships) first.
3. Derive the DER from the DSL (Mermaid `erDiagram` preferred).
4. Enforce per-school isolation: entities carry `school_id` where applicable.
5. Note LGPD-sensitive fields and retention needs.
6. Use English `snake_case` identifiers (e.g. `students`, `messages`, `boletos`). Portuguese exceptions only when listed in `docs/glossary.md`; ask before adding new ones.
