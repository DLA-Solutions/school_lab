# Database — Executable Schema

Canonical schema for implementation. When a PRD entity changes, update this folder **first**, then align narrative modeling in `docs/modeling/`.

## Contents

| File | Purpose |
|------|---------|
| `database_dml.md` | DBML source — paste into [dbdiagram.io](https://dbdiagram.io) to edit and export |
| `der_NNN.png` | DER export (PNG) for review and PRDs — e.g. `der_001.png` for fintech-first |

## How to edit

1. Edit DBML in `database_dml.md` (or paste into dbdiagram.io and copy back).
2. Export the diagram as PNG from dbdiagram.io.
3. Replace the matching `der_NNN.png` in this folder.
4. Update the narrative DSL in `docs/modeling/NNN-<domain>.md` if entity groups or LGPD notes changed.

## Rule

Every PRD entity change must be reflected here before implementation in `web/`. Migrations and ActiveRecord models follow `database_dml.md` when it exists for a domain.

## Related

- Narrative modeling: [`docs/modeling/`](../modeling/)
- Process flow: [`docs/guidelines/process/`](../guidelines/process/)
