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
    dedupe: ['react', 'react-dom'],
    alias: {
      'design-system': path.resolve(__dirname, '../main/src/design-system'),
      theme: path.resolve(__dirname, '../main/src/theme'),
      components: path.resolve(__dirname, '../main/src/components'),
      providers: path.resolve(__dirname, '../main/src/providers'),
      assets: path.resolve(__dirname, '../main/src/assets'),
    },
  },
  server: {
    port: 5174,
  },
});
