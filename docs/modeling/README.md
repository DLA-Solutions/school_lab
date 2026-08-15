# Data Modeling

Data models derived from approved PRDs, following the flow in `docs/product-map.md` §4
(anchor docs → PRDs → **modeling** → implementation).

## Hybrid convention

| Layer | Location | Format |
|-------|----------|--------|
| Narrative DSL | `docs/modeling/NNN-<domain>.md` | Markdown — entity groups, auth, LGPD, API lifecycle |
| Executable schema | `docs/database/schema.dbml` | DBML — canonical for migrations |
| API conventions | `docs/api/README.md` | REST conventions, rswag, errors |
| API route narratives | `docs/api/v1/*.md` | Per-wave route maps and examples |
| DER export | `docs/database/der_NNN.png` | PNG from [dbdiagram.io](https://dbdiagram.io) |

One narrative file per domain, mirroring the PRD number in `docs/prds/`. Current inventory:

| # | File | Domain |
|---|------|--------|
| 001 | `001-fintech-first.md` | Billing partner slice (historical baseline) |
| 002 | `002-api-auth.md` | API auth lifecycle |
| 003 | `003-identity-permissions.md` | Permissions engine |
| 004 | `004-school-onboarding.md` | Onboarding lifecycle |
| 005 | `005-students-enrollments.md` | Students & enrollments |
| 006 | `006-communication.md` | Communication |
| 007 | `007-academic.md` | Academic |
| 008 | `008-documents-archive.md` | Documents & archive |
| 009 | `009-platform-admin.md` | Platform & admin |

API auth and route planning: `002-api-auth.md`.

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
