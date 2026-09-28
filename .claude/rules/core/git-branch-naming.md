> Git branch naming conventions for School Lab
>
> **Always relevant** — read this whenever working anywhere in the repo.

# Git Branch Naming

Use a **type prefix**, a slash, and a **short kebab-case slug** describing the work.

## Prefixes

| Prefix | Use for |
|--------|---------|
| `feature/` | New product or technical capability |
| `fix/` | Bug fixes |
| `refactor/` | Code restructuring without behavior change |
| `chore/` | Tooling, CI, Cursor config, dependency bumps |
| `docs/` | Documentation-only changes (anchor docs, PRDs, README) |

## Format

```
<prefix>/<short-kebab-slug>
```

Examples:
- `feature/comunicacao-mensagens`
- `fix/chamada-duplicada`
- `refactor/services-namespace`
- `chore/update-rules-references`
- `docs/prd-comunicacao`

## Rules

- Lowercase only; separate words with hyphens.
- Keep slugs short (2–5 words) but specific enough to identify the work.
- One concern per branch — split unrelated changes into separate branches/PRs.
- Prefer these prefixes over ad-hoc names (`cursor/…`, `feat/…`). Legacy branches may exist; use the table for new work.

## Reserved long-lived branches

`main` (production) and `staging` (QA) are environment branches, not work branches. Never
create `feature/staging` or treat them as a prefix. Feature PRs target **`staging`**.
Promote with a fast-forward of `staging` onto `main` (`git merge --ff-only origin/staging`
on `main`, then push). See rule `deploy-environment-branches`.

## When creating branches

1. Pick the prefix that best matches the **primary** change.
2. If the change spans types (e.g. feature + docs), choose the dominant type or split into two branches.
3. Branch from **`staging`** (from `main` only for a production hotfix).
4. Use the `branch-naming` skill when unsure which prefix fits.
