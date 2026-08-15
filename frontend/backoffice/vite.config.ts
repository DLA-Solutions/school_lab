/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import checker from 'vite-plugin-checker';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  resolve: {
    // `@school-lab/design-system-ui` is linked from `packages/`, which has no `node_modules` of
    // its own, so its bare imports have to be resolved from here. `dedupe` does that through
    // normal package resolution — honouring each package's `exports` map, so MUI is loaded as
    // ESM. Filesystem aliases (what stood here before) point past `exports` and pull in the CJS
    // builds instead: every MUI module then goes through esbuild's CJS→ESM interop, and a
    // half-stale optimize generation hands React a namespace object where a component belongs
    // ("Element type is invalid … got: object", raised from the DataGrid's `BasePopper`).
    dedupe: [
      'react',
      'react-dom',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/system',
      '@mui/utils',
      '@mui/x-data-grid',
      '@mui/x-date-pickers',
      '@iconify/react',
    ],
  },
  plugins: [
    // Single source of path aliases, so `theme`, `components`, `design-system`, `providers` and
    // `assets` resolve the same way in the app and in tests. Pinned to `tsconfig.paths.json`:
    // `tsconfig.app.json` carries extra, type-only `@mui/*` mappings that must not reach the
    // bundler — see the comment in that file.
    tsconfigPaths({ projects: ['./tsconfig.paths.json'] }),
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
  // `@school-lab/design-system-ui` ships source, not a build, so its `@mui/material/*` imports
  // are only discovered once a module that uses them is requested. Left to that, each discovery
  // re-runs the optimizer and forces a reload, and a browser part-way through one holds modules
  // from two generations at once — which is how a component slot ends up holding a namespace
  // object. Listing them keeps every dependency bundled in the first pass.
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/material/styles',
      '@mui/material/Alert',
      '@mui/material/Box',
      '@mui/material/Button',
      '@mui/material/Chip',
      '@mui/material/Dialog',
      '@mui/material/DialogActions',
      '@mui/material/DialogContent',
      '@mui/material/DialogContentText',
      '@mui/material/DialogTitle',
      '@mui/material/IconButton',
      '@mui/material/InputAdornment',
      '@mui/material/Pagination',
      '@mui/material/Paper',
      '@mui/material/Stack',
      '@mui/material/TextField',
      '@mui/material/Tooltip',
      '@mui/material/Typography',
      '@mui/x-data-grid',
      '@iconify/react',
    ],
  },
  server: {
    host: '0.0.0.0',
    fs: {
      // The design-system package is a sibling of this app, outside the Vite root, so serving its
      // source needs the repository root on the allow list.
      allow: ['../..'],
    },
    // Matches the API's default CORS_ORIGINS (http://localhost:5173) so the refresh
    // cookie is accepted without extra backend configuration.
    port: 5175,
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
    // Vitest defaults to roughly one worker per core, and each one carries jsdom plus the whole
    // MUI tree. On a machine also running the API in Docker that oversubscribes badly: files
    // failed at random — a trivial SkipLink spec one run, a dialog the next — which is the shape
    // of starvation rather than of a bug. Fewer workers, each with room to finish.
    maxWorkers: 4,
    server: {
      deps: {
        // The design-system barrel reaches DataTable, and the DataGrid package imports a
        // stylesheet Node cannot load on its own. Inlining lets Vite handle that import.
        inline: ['@mui/x-data-grid', '@school-lab/design-system-ui'],
      },
    },
  },
}));
