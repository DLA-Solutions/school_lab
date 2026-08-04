import type { GlobalProvider } from '@ladle/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme } from 'theme/createAppTheme';
import ThemeModeProvider from 'providers/ThemeModeProvider';

const theme = createAppTheme();

export const Provider: GlobalProvider = ({ children }) => (
  <ThemeProvider theme={theme} defaultMode="dark">
    <CssBaseline enableColorScheme />
    <ThemeModeProvider>{children}</ThemeModeProvider>
  </ThemeProvider>
);

export const argTypes = {
  mode: {
    control: { type: 'select' },
    options: ['dark', 'light'],
    defaultValue: 'dark',
  },
};
