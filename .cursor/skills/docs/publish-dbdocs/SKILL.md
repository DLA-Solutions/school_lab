---
name: publish-dbdocs
description: Validate and publish docs/database/schema.dbml to dbdocs after DBML or migration changes. Use when editing docs/database/, adding migrations, or when the user asks to update dbdocs.
---

# Publish dbdocs

Keep [dbdocs — school_lab](https://dbdocs.io/contatodcd60b30ac/school_lab) in sync with `docs/database/schema.dbml`.

Rule: `.cursor/rules/docs/dbdocs.mdc`. Script: `.cursor/scripts/publish-dbdocs.sh`.

## When to use

- After editing `docs/database/schema.dbml`
- After adding or changing a Rails migration that affects schema
- When the user asks to refresh or publish dbdocs

## Prerequisites

- **dbdocs CLI** installed (`npm install -g dbdocs`)
- **Login** for local publish: `dbdocs login` (already done on maintainer machines)
- Project is **password-protected** — local `dbdocs build` works after login; CI needs `DBDOCS_TOKEN` (and password if required)

## Steps

1. **Confirm DBML is current**
   - Canonical file: `docs/database/schema.dbml`
   - If a migration was written, verify tables/columns/indexes match `web/db/schema.rb`
   - Fix drift in DBML first — do not publish outdated schema

2. **Validate**
   ```bash
   dbdocs validate docs/database/schema.dbml
   ```
   Or run the script (validate + build):
   ```bash
   .cursor/scripts/publish-dbdocs.sh
   ```

3. **Publish** (if not using the script)
   ```bash
   dbdocs build docs/database/schema.dbml --project contatodcd60b30ac/school_lab
   ```

4. **Confirm** output links to `https://dbdocs.io/contatodcd60b30ac/school_lab`

5. **Optional follow-ups** (flag if out of scope for the task)
   - Re-export `docs/database/der_NNN.png` from dbdiagram.io if the ER diagram changed
   - Update narrative in `docs/modeling/NNN-<domain>.md` for new entities or LGPD notes

## Checklist

See [`checklist.md`](checklist.md).

## Do not

- Use `dbdocs db2dbml` from Postgres as the source — DBML is authoritative
- Put DBML inside `database_dml.md` fences — edit `schema.dbml` only
- Skip validate before build
