import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  // `build` is Ladle's default output directory; both hold generated bundles, not sources.
  globalIgnores(['dist', 'build']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Under `cssVariables`, `theme.palette` is pinned to the default colour scheme, so reading it
    // hands back light values while the product runs dark. Everything visible lives in these two
    // trees, and both have a correct alternative: `(theme.vars || theme).palette` resolves through
    // a CSS variable for anything the browser paints, and `useChartTheme()` resolves the scheme
    // itself for an ECharts option, which paints to a canvas and cannot read a variable.
    // `docs/guidelines/web-ui/theming.md` → Component overrides, Charts.
    files: ['src/components/**/*.{ts,tsx}', 'src/layouts/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='theme'][property.name='palette']",
          message:
            'theme.palette is pinned to the default colour scheme under cssVariables. Use (theme.vars || theme).palette in sx, or useChartTheme() in a chart option.',
        },
        {
          selector: "MemberExpression[object.name='theme'][property.name='colorSchemes']",
          message:
            'Resolving a colour scheme belongs in useChartTheme(), not at a call site. Widen ChartTheme instead — see docs/guidelines/web-ui/theming.md → Charts.',
        },
      ],
    },
  },
  {
    // Ladle's global provider file is allowed to export config objects such as argTypes
    // alongside the Provider component; it is sandbox tooling, not part of the app bundle.
    // ESLint skips dot-directories unless they are named, hence the explicit entry.
    files: ['.ladle/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
