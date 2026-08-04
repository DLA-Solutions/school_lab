import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../../docs/design-system'),
    emptyOutDir: true,
  },
  resolve: {
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
