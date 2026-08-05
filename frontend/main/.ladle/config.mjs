/**
 * Ladle only reads `.ladle/config.mjs` — a root-level ladle.config.ts is never loaded.
 *
 * @type {import('@ladle/react').UserConfig}
 */
export default {
  // Narrower than Ladle's default `src/**`: the sandbox documents the design system, not the
  // feature screens. Path aliases come from vite.ladle.config.ts via vite-tsconfig-paths.
  stories: 'src/design-system/**/*.stories.{tsx,mdx}',
  viteConfig: 'vite.ladle.config.ts',
  addons: {
    // Match the app, which boots dark (see createAppTheme + defaultMode in .ladle/components.tsx).
    theme: {
      defaultState: 'dark',
    },
  },
};
