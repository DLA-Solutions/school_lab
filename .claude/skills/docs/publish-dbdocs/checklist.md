# publish-dbdocs — Checklist

- [ ] `docs/database/schema.dbml` reflects the intended schema
- [ ] If migrations changed: `web/db/schema.rb` aligns with DBML (tables, columns, indexes)
- [ ] `dbdocs validate docs/database/schema.dbml` passes
- [ ] `dbdocs build` (or `publish-dbdocs.sh`) succeeded
- [ ] Published URL: https://dbdocs.io/contatodcd60b30ac/school_lab
- [ ] DER PNG updated if visual diagram changed (`der_NNN.png`)
