# Database — Executable Schema

Canonical schema for implementation. When a PRD entity changes, update this folder **first**, then align narrative modeling in `docs/modeling/`.

## Contents

| File | Purpose |
|------|---------|
| `schema.dbml` | DBML source — canonical for migrations, [dbdiagram.io](https://dbdiagram.io), and [dbdocs](https://dbdocs.io/contatodcd60b30ac/school_lab) |
| `database_dml.md` | Pointer and edit workflow (no inline DBML) |
| `der_NNN.png` | DER export (PNG) for review and PRDs — e.g. `der_001.png` for fintech-first |

## How to edit

1. Edit `schema.dbml` (or paste into dbdiagram.io and copy back).
2. Validate and publish: `.cursor/scripts/publish-dbdocs.sh` (skill `publish-dbdocs`).
3. Export the diagram as PNG from dbdiagram.io when the ER view changed.
4. Update the narrative DSL in `docs/modeling/NNN-<domain>.md` if entity groups or LGPD notes changed.
5. Write Rails migrations in `web/` per rule `migrations`.

## Rule

Every PRD entity change must be reflected in `schema.dbml` before implementation in `web/`. Migrations and ActiveRecord models follow `schema.dbml` when it exists for a domain.

## Related

- Narrative modeling: [`docs/modeling/`](../modeling/)
- dbdocs rule: `.cursor/rules/docs/dbdocs.mdc`
- Process flow: [`docs/guidelines/process/`](../guidelines/process/)
