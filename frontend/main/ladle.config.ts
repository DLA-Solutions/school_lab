import { defineConfig } from '@ladle/react';

export default defineConfig({
  stories: 'src/design-system/**/*.stories.{tsx,mdx}',
  viteConfig: {
    resolve: {
      alias: {
        theme: '/src/theme',
        components: '/src/components',
        design-system: '/src/design-system',
        providers: '/src/providers',
        assets: '/src/assets',
      },
    },
  },
});
