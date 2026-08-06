import { ReactElement, ReactNode } from 'react';
import { RenderOptions, RenderResult, render } from '@testing-library/react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from 'theme/createAppTheme';

const theme = createAppTheme();

export type ColorScheme = 'light' | 'dark';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Defaults to `dark`, the scheme the app shell boots in. */
  mode?: ColorScheme;
}

// Mirrors the app shell and the Ladle sandbox (`.ladle/components.tsx`): the product theme in its
// default dark scheme. ThemeModeProvider is left out — persisting the mode to localStorage is
// not part of what a component spec exercises, and `storageManager={null}` keeps a spec that asks
// for `light` from leaking that choice into the next one through localStorage.
const AppTheme = ({ children, mode }: { children: ReactNode; mode: ColorScheme }) => (
  <ThemeProvider theme={theme} defaultMode={mode} storageManager={null}>
    <CssBaseline enableColorScheme />
    {children}
  </ThemeProvider>
);

export const renderWithTheme = (ui: ReactElement, options?: Options): RenderResult => {
  const { mode = 'dark', ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: ({ children }) => <AppTheme mode={mode}>{children}</AppTheme>,
    ...renderOptions,
  });
};
