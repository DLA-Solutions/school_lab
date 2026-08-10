import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

/** Vite adds crossorigin to module scripts; browsers block those over file://. */
const stripCrossoriginForFileProtocol = (): Plugin => ({
  name: 'strip-crossorigin-for-file-protocol',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html) {
      const withoutCrossorigin = html.replace(/\s+crossorigin/g, '');
      const scriptMatch = withoutCrossorigin.match(
        /<script(?:\s+type="module")?(?:\s+defer)?\s+src="\.\/assets\/[^"]+"><\/script>/,
      );
      if (!scriptMatch) return withoutCrossorigin;

      const srcMatch = scriptMatch[0].match(/src="\.\/assets\/[^"]+"/);
      const scriptTag = srcMatch
        ? `<script defer ${srcMatch[0]}></script>`
        : scriptMatch[0];

      return withoutCrossorigin
        .replace(scriptMatch[0], '')
        .replace('</body>', `    ${scriptTag}\n  </body>`);
    },
  },
});

export default defineConfig({
  plugins: [tsconfigPaths(), react(), stripCrossoriginForFileProtocol()],
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../../docs/design-system'),
    emptyOutDir: true,
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
      },
    },
  },
  resolve: {
    // Theme/design-system source is reused from ../app/src via the aliases below.
    // Without deduping, those files resolve these libs from ../app/node_modules
    // (a separate install), splitting React context (e.g. useColorScheme) from the
    // <ThemeProvider> mounted here, which silently no-ops setMode/mode.
    dedupe: [
      'react',
      'react-dom',
      // The MuiLink override renders react-router's Link, so without deduping a themed <Link>
      // reads a NavigationContext from ../node_modules that no Router here ever populates.
      'react-router',
      '@mui/material',
      '@mui/system',
      '@mui/x-data-grid',
      '@emotion/react',
      '@emotion/styled',
    ],
    alias: {
      'design-system': path.resolve(__dirname, '../app/src/design-system'),
      theme: path.resolve(__dirname, '../app/src/theme'),
      components: path.resolve(__dirname, '../app/src/components'),
      providers: path.resolve(__dirname, '../app/src/providers'),
      assets: path.resolve(__dirname, '../app/src/assets'),
    },
  },
  server: {
    port: 5174,
  },
});
