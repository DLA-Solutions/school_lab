import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    assetsDir: 'assets',
    manifest: true,
    sourcemap: true,
    target: 'es2022',
  },
});
