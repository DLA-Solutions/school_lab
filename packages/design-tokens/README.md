# @school-lab/design-tokens

Shared semantic color tokens for School Lab web and mobile surfaces.

## Structure

- `colors.json` — light and dark semantic palettes plus raw color scales
- `index.ts` — typed exports (`tokens`, `getTokens`, `ColorScheme`)

## Web (React SPA)

```typescript
import { tokens } from '@school-lab/design-tokens';

// Used by createAppTheme() in frontend/app/src/theme/createAppTheme.ts
const darkPalette = tokens.dark;
```

Add to `frontend/app/package.json`:

```json
"@school-lab/design-tokens": "file:../../packages/design-tokens"
```

## Mobile (React Native)

```typescript
import { tokens } from '@school-lab/design-tokens';

const dark = tokens.dark;
export const colors = {
  background: dark.background.default,
  surface: dark.background.paper,
  // ...
};
```

Theme mode toggle on React Native is a follow-up — mobile currently uses the dark scheme only.

## Adding a token

1. Add the value to both `light` and `dark` in `colors.json`.
2. Update `SemanticTokens` in `index.ts` if the shape changes.
3. Map it in `frontend/app/src/theme/createAppTheme.ts`.
4. Document it in `docs/guidelines/web-ui/tokens.md`.
5. Bump `version` in `package.json` and record the change in [CHANGELOG.md](./CHANGELOG.md).

## Versioning

The package is versioned semantically: removing or renaming a token is a major bump, adding one or
changing a rendered value is a minor bump, and only non-rendering edits are a patch. Full policy:
`docs/guidelines/web-ui/versioning.md`.
