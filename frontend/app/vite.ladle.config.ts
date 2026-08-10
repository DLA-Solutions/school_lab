import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

// Vite config for the Ladle sandbox, mirroring `vite.config.ts` without vite-plugin-checker.
// Ladle runs Vite from its own package root, where the checker's './src/**' lint glob matches
// no files and kills the server on startup. Type and lint gates stay in `npm run build` and
// `npm run lint`, which cover the same sources.
export default defineConfig({
  // Single source of path aliases (tsconfig.json `paths`), so `theme`, `components`,
  // `design-system`, `providers` and `assets` resolve the same way as in the app.
  plugins: [tsconfigPaths(), react()],
});
