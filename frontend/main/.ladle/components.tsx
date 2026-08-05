import { useEffect } from 'react';
import type { GlobalProvider } from '@ladle/react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider, useColorScheme } from '@mui/material/styles';
import { createAppTheme } from 'theme/createAppTheme';

const theme = createAppTheme();

// Ladle's toolbar theme switch is the sandbox's source of truth for light/dark, so mirror it onto
// MUI's color scheme — that is what drives the theme's CSS variables. The app pairs the same theme
// with ThemeModeProvider instead; that provider restores a stored preference on mount, which here
// would race the toolbar and win, so the sandbox leaves it out.
const LadleColorScheme = ({ ladleTheme }: { ladleTheme: string }) => {
  const { setMode } = useColorScheme();

  useEffect(() => {
    setMode(ladleTheme === 'auto' ? 'system' : ladleTheme === 'light' ? 'light' : 'dark');
  }, [ladleTheme, setMode]);

  return null;
};

export const Provider: GlobalProvider = ({ children, globalState }) => (
  <ThemeProvider theme={theme} defaultMode="dark">
    <CssBaseline enableColorScheme />
    <LadleColorScheme ladleTheme={globalState.theme} />
    {children}
  </ThemeProvider>
);
