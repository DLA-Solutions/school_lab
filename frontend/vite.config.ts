/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import checker from 'vite-plugin-checker';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    // Single source of path aliases (tsconfig.json `paths`), so `theme`, `components`,
    // `design-system`, `providers` and `assets` resolve the same way in the app and in tests.
    tsconfigPaths(),
    react(),
    // Vitest resolves this config with mode 'test'. Skip the checker there: it would spawn
    // an extra tsc + eslint pass on every run, duplicating what `npm run build` already does.
    ...(mode === 'test'
      ? []
      : [
          checker({
            // tsconfig.json is a solution file with no files of its own; point the checker at
            // the project that actually owns `src` so the dev overlay keeps reporting errors.
            typescript: { tsconfigPath: 'tsconfig.app.json' },
            eslint: {
              useFlatConfig: true,
              lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
            },
            overlay: {
              initialIsOpen: false,
            },
          }),
        ]),
  ],
  preview: {
    port: 4173,
  },
  server: {
    host: '0.0.0.0',
    // Matches the API's default CORS_ORIGINS (http://localhost:5173) so the refresh
    // cookie is accepted without extra backend configuration.
    port: 5173,
  },
  base: process.env.VITE_BASE_PATH ?? '/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Vitest's 5s default is per test, but the suite runs its files in parallel: rendering MUI
    // dialogs and driving them with user-event under jsdom means a spec that takes ~1s alone can
    // sit well past 5s waiting for a worker. The failures that produced were all starvation, not
    // slow assertions — raise the ceiling rather than trade away coverage for speed.
    testTimeout: 20_000,
    server: {
      deps: {
        // The design-system barrel reaches DataTable, and the DataGrid package imports a
        // stylesheet Node cannot load on its own. Inlining lets Vite handle that import.
        inline: ['@mui/x-data-grid'],
      },
    },
  },
}));
