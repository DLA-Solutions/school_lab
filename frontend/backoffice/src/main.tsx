import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme } from 'theme/createAppTheme.ts';
import router from 'routes/router';
import AuthProvider from 'providers/AuthProvider';
import ThemeModeProvider from 'providers/ThemeModeProvider';
import I18nProvider from 'providers/I18nProvider';
import ChunkLoadErrorBoundary from 'components/ChunkLoadErrorBoundary';
import { installChunkLoadRecovery } from 'utils/chunkLoadRecovery';
import './index.css';

installChunkLoadRecovery();

const theme = createAppTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChunkLoadErrorBoundary>
      <ThemeProvider theme={theme} defaultMode="dark">
        <CssBaseline enableColorScheme />
        <ThemeModeProvider>
          <I18nProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </I18nProvider>
        </ThemeModeProvider>
      </ThemeProvider>
    </ChunkLoadErrorBoundary>
  </React.StrictMode>,
);
