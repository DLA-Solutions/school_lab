---
name: data-modeling
description: Derive data models (narrative DSL + DBML/DER) from approved PRDs for School Lab. Use when the user asks to model data, design tables/entities, or produce a DER from PRDs.
---

# Data Modeling (PRD → narrative → DBML → DER)

Per `docs/product-map.md` §4, modeling comes after PRDs and before implementation. Conventions in the `docs/modeling` rule; hybrid output in `docs/modeling/` and `docs/database/`.

## Steps

1. Read the relevant PRD(s) in `docs/prds/` — model only what PRDs define.
2. Write narrative DSL → `docs/modeling/NNN-<domain>.md` (entity groups, auth, LGPD notes, scope boundaries).
3. Write executable DBML → `docs/database/schema.dbml` (or a per-domain file if the schema grows).
4. Publish dbdocs — skill `publish-dbdocs` (`.cursor/scripts/publish-dbdocs.sh`).
5. Export DER PNG from [dbdiagram.io](https://dbdiagram.io) → `docs/database/der_NNN.png`.
6. Cross-check PRD entities ↔ DBML tables; link artifacts in the PRD Database section.
7. LGPD + `school_id` checklist:
   - Every tenant-scoped entity has `school_id` where applicable.
   - Mark sensitive fields (`cpf`, `email`, `phone`, `birth_date`, health, messages).
   - Note retention as pending when legal is not validated.
8. Use English `snake_case` identifiers. Portuguese exceptions only when listed in `docs/glossary.md`; ask before adding new ones.

## Format choice

- **DBML** (preferred when schema grows): indexes, notes, sample data, dbdiagram export.
- **Mermaid `erDiagram`**: acceptable for simple domains inside the narrative file only.
