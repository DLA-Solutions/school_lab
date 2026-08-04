import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme } from 'theme/createAppTheme.ts';
import router from 'routes/router';
import AuthProvider from 'providers/AuthProvider';
import ThemeModeProvider from 'providers/ThemeModeProvider';
import './index.css';

const theme = createAppTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme} defaultMode="dark">
      <CssBaseline enableColorScheme />
      <ThemeModeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeModeProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
