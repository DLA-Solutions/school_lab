# Executable schema (DBML)

Canonical DBML source: [`schema.dbml`](schema.dbml).

Published documentation: [dbdocs — school_lab](https://dbdocs.io/contatodcd60b30ac/school_lab) (password-protected).

## Edit workflow

1. Edit `schema.dbml` (or import into [dbdiagram.io](https://dbdiagram.io) and copy back).
2. Validate and publish — skill `publish-dbdocs` or:

   ```bash
   .cursor/scripts/publish-dbdocs.sh
   ```

3. Export DER PNG from dbdiagram.io → `der_NNN.png` when the diagram changes visually.
4. Align narrative DSL in `docs/modeling/NNN-<domain>.md` if entity groups or LGPD notes changed.
5. Write Rails migration in `web/` per rule `migrations`.

## Related

- Narrative modeling: [`docs/modeling/`](../modeling/)
- Migration conventions: [`docs/guidelines/web/migrations.md`](../guidelines/web/migrations.md)
- Process flow: [`docs/guidelines/process/`](../guidelines/process/)
