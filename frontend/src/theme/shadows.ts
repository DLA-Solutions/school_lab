declare module '@mui/material/styles' {
  interface Theme {
    customShadows: string[];
  }
  interface ThemeOptions {
    customShadows?: string[];
  }
}

import type { Theme } from '@mui/material/styles';

export const darkCustomShadows = [
  '0px 8px 28px 0px #0105114D',
  '0px 2px 4px 0px #01051133',
] as const;

export const lightCustomShadows = [
  '0px 8px 28px 0px rgba(1, 5, 17, 0.08)',
  '0px 2px 4px 0px rgba(1, 5, 17, 0.06)',
] as const;

export function shadowForMode(theme: Theme, index: 0 | 1): string {
  const shadows = theme.palette.mode === 'light' ? lightCustomShadows : darkCustomShadows;
  return shadows[index];
}

/** Scheme-aware shadow styles for cssVariables themes (theme.palette.mode is static). */
export function shadowSx(theme: Theme, index: 0 | 1) {
  return {
    boxShadow: darkCustomShadows[index],
    ...theme.applyStyles('light', {
      boxShadow: lightCustomShadows[index],
    }),
  };
}

export default darkCustomShadows;
