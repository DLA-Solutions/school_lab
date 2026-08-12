# Process Guidelines

How work moves through the repository. This is the detailed reference behind the
process rules and skills.

## The flow (source: `product-map.md` §4)

```
anchor docs  ──▶  domain PRD  ──▶  data modeling  ──▶  implementation (web/)
 (validated)     docs/prds/         narrative + DBML         Rails 8.1
                                      │
                    docs/modeling/NNN-domain.md  (DSL narrative)
                                      │
                    docs/database/database_dml.md  (DBML)
                                      │
                    docs/database/der_NNN.png  (DER export)
```

- Do not implement a domain that lacks an approved PRD — flag it instead.
- Suggested PRD order is in `product-map.md` §5 (Communication is the MVP priority).
- Unresolved decisions live in `docs/open-questions.md`; when decided, record it in the
  relevant anchor doc and check the box.

## PRDs

- Follow `docs/prds/template.md` — same section order, every section present.
- Skill: `write-prd`. Rule: `rules/docs/docs-and-prds`.
- Written in English; Portuguese only for approved glossary exceptions (`docs/glossary.md`),
  glossed on first use.

## Data modeling

- Comes after the PRD, before code.
- **Narrative DSL** → `docs/modeling/NNN-<domain>.md` (entity groups, auth, LGPD, scope).
- **Executable schema** → `docs/database/database_dml.md` (DBML); export **DER PNG** → `docs/database/der_NNN.png`.
- Skill: `data-modeling`. Rules: `rules/docs/modeling`.
- Mermaid `erDiagram` is fine for simple domains; DBML preferred when the schema grows.
- Enforce `school_id` isolation; mark LGPD-sensitive fields.

## Language & naming

- Repository defaults to English; product UI is `pt-BR` via i18n. Rule: `rules/core/language-conventions`.
- Approved Portuguese identifiers are listed in `docs/glossary.md`; ask before adding new ones.

## Branching

- `<prefix>/<short-kebab-slug>` with prefix `feature|fix|refactor|chore|docs`.
- Rule: `rules/core/git-branch-naming`. Skill: `branch-naming`.

## Design principles

- SOLID, coupling/cohesion, cautious abstraction: [`design-principles.md`](design-principles.md).
- Rule: `rules/core/design-principles`.

## Implementation

- Prerequisites, Context7 workflow, checklist: [`implementation.md`](implementation.md).
- Rule: `rules/core/use-context7`. Skill: `consult-context7`.

## Deployment

- Kamal 2 topology, destinations, secrets, first deploy, rollback:
  [`deployment.md`](deployment.md).
- Deploys are manual and always take an explicit destination (`-d production|staging`).
- GitHub Actions self-hosted runner (billing workaround):
  [`github-actions-runner.md`](github-actions-runner.md).
