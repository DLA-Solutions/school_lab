---
name: branch-naming
description: Pick or validate Git branch names following School Lab conventions (feature/, fix/, refactor/, chore/, docs/). Use when creating branches, opening PRs, or when the user asks about branch naming.
---

# Git Branch Naming

Follow `.claude/rules/core/git-branch-naming.mdc`. Format: `<prefix>/<short-kebab-slug>`.

## Prefix decision tree

1. **Docs only** (anchor docs, PRDs, README, no code) → `docs/`
2. **Bug fix** (corrects broken behavior) → `fix/`
3. **Refactor** (structure/readability, same behavior) → `refactor/`
4. **Tooling / config / deps / Cursor** (no product behavior change) → `chore/`
5. **Everything else** (new behavior, endpoints, UI, domains) → `feature/`

When two types apply, use the **dominant** change or split into separate branches.

## Examples

| Work | Branch |
|------|--------|
| Add messaging PRD | `docs/prd-comunicacao` |
| Fix duplicate attendance records | `fix/chamada-duplicada` |
| Extract service objects | `refactor/comunicacao-services` |
| Rename Cursor rules | `chore/update-rules-references` |
| Parent messaging MVP | `feature/comunicacao-mensagens` |

## Creating a branch

```bash
git checkout staging
git pull origin staging
git checkout -b <prefix>/<slug>
```

`main` and `staging` are reserved environment branches. Production hotfixes branch from
`main` and PR to `main`, then merge `main` back into `staging`.

## Validation checklist

- [ ] Prefix is one of: `feature/`, `fix/`, `refactor/`, `chore/`, `docs/`
- [ ] Slug is lowercase kebab-case
- [ ] Branch covers a single concern
- [ ] Name is understandable without opening the PR
