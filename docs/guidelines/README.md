# Guidelines

Human-facing engineering standards for School Lab — the detailed **"why"** and **"how"**
behind the terse instructions in `.cursor/`.

## Relationship to `.cursor/`

Single source of truth flows **one direction** to avoid drift:

```
docs/guidelines/**   ──referenced by──▶   .cursor/rules/**     (terse, machine-facing "what")
        (detailed "why")                  .cursor/skills/**    (procedures)
                                          .cursor/agents/**    (roles)
```

- **Guidelines** (here) hold the reasoning, granular standards, and examples.
- **Rules / skills / agents** stay short and **point back** to the relevant guideline.
- When a standard changes, edit the guideline first, then adjust the rule/skill that cites it.

Note: product scope lives in the **anchor docs** (`vision.md`, `actors-and-surfaces.md`,
`product-map.md`, `web-stack.md`) — guidelines cover *engineering standards*, not product scope.
Do not duplicate anchor-doc content; link to it.

## Structure (by context)

| Folder | Scope | Feeds |
|--------|-------|-------|
| `process/` | Cross-cutting workflow: docs → PRD → modeling → implementation, branch naming, language | `rules/core/**`, `rules/docs/**`, `skills/docs/**`, `skills/core/**` |
| `web/` | Rails 8.1 coding standards granular to `web/` (complements `web-stack.md`, does not repeat it) | `rules/web/**`, `rails-implementer` agent |
| `app/` | Mobile standards — placeholder until the React Native stack is confirmed | `rules/app/**` |

Add a context folder only when it has real content; keep folders lean.
