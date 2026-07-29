---
name: write-prd
description: Author a domain PRD for School Lab following docs/prds/template.md and the anchor docs. Use when the user asks to write, draft, or update a PRD or domain requirements document.
---

# Write a Domain PRD

## Steps
1. Read `docs/prds/template.md` and mirror its section order exactly.
2. Read the anchor docs (`vision.md`, `actors-and-surfaces.md`, `product-map.md`, `web-stack.md`) to ground scope, actors, and stack.
3. Check `docs/open-questions.md` — list unresolved items in the PRD's "Out of Scope" or flag them; do not invent answers.
4. Write the PRD in `docs/prds/` named `NNN-<domain>.md` using the next number in the suggested order (product-map §5).
5. Write in **English**. Use Portuguese only for approved domain exceptions (`docs/glossary.md`); gloss on first use. Keep API contracts consistent with REST `/api/v1` + JWT and English identifiers (`school_id`, roles: backoffice/school/teacher/guardian).

## Sections (from template)
Objective, Context, Business Rules (BR-NNN), Use Cases, API, Errors, Database, Events, Permissions, Acceptance Criteria, Out of Scope.

## Database section

When modeling exists for the domain, link to:
- Narrative DSL: `docs/modeling/NNN-<domain>.md`
- Executable schema: `docs/database/database_dml.md` and `docs/database/der_NNN.png`

Do not duplicate full table definitions in the PRD — reference the artifacts and list entity groups.

## See also
Process guidance in `docs/guidelines/process/`.
