# Process Guidelines

How work moves through the repository. This is the detailed reference behind the
process rules and skills.

## The flow (source: `product-map.md` §4)

```
anchor docs  ──▶  domain PRD  ──▶  data modeling (DSL → DER)  ──▶  implementation (web/)
 (validated)     docs/prds/         docs/modeling/                  Rails 8
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

- Comes after the PRD, before code. Output in `docs/modeling/NNN-<domain>.md`.
- Skill: `data-modeling`. Rule: `rules/docs/modeling`.
- DSL first, then DER (Mermaid `erDiagram`). Enforce `school_id` isolation; mark LGPD-sensitive fields.

## Language & naming

- Repository defaults to English; product UI is `pt-BR` via i18n. Rule: `rules/core/language-conventions`.
- Approved Portuguese identifiers are listed in `docs/glossary.md`; ask before adding new ones.

## Branching

- `<prefix>/<short-kebab-slug>` with prefix `feature|fix|refactor|chore|docs`.
- Rule: `rules/core/git-branch-naming`. Skill: `branch-naming`.
