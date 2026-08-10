# Design token versioning

How `@school-lab/design-tokens` (`packages/design-tokens/`) is versioned. Required by
`docs/prds/layer-web-spa.md` (Non-functional requirements → Versioning).

The package is a private `file:` dependency of `frontend/app` and `mobile/`, so npm never resolves
a range and never blocks an incompatible upgrade. The version is a **communication contract**:
it tells a reviewer what a token change does to the two surfaces that consume it.

## Rules

| Bump | When | Examples |
|------|------|----------|
| **Major** | A consumer must change code to keep working | Removing a token; renaming a token; changing the shape of `SemanticTokens` (nesting, type); dropping a color scheme; repurposing a token so its name no longer describes its meaning |
| **Minor** | Adding a token, **or** changing an existing value in a way a user can see | New token added to both `light` and `dark`; `primary.main` moved to a different purple; a `transparent.*` alpha adjusted for contrast |
| **Patch** | Nothing rendered and nothing typed changes | Typing or JSDoc fixes; README/changelog edits; package metadata; rewriting a value into an equivalent form (`#FFF` → `#FFFFFF`) |

A change that alters a rendered value is **never** a patch — that is the point of the rule. If a
color moves at all, the bump has to make it visible to whoever reads the diff.

Pre-`2.0.0` the package stays on `1.x`: additive and value changes accumulate as minor bumps
until a breaking rename or removal forces a major.

## Releasing a change

1. Edit `colors.json` (both schemes) and `index.ts` as described in
   [tokens.md](./tokens.md) → *Adding a token*.
2. Bump `version` in `packages/design-tokens/package.json` per the table above.
3. Add an entry to `packages/design-tokens/CHANGELOG.md` under the new version, naming each token
   touched and, for a value change, the old and new value.
4. Update the token table in [tokens.md](./tokens.md) and rebuild the catalog
   (`make design-system-docs`) if the change is visible there.

The version bump, the changelog entry and the token edit belong in the **same pull request** —
a token change reviewed without them is incomplete.
