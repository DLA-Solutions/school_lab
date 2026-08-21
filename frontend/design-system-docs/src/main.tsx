import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme } from 'theme/createAppTheme';
import ThemeModeProvider from 'providers/ThemeModeProvider';
import '../../app/src/index.css';
import './fonts';
import App from './App';

const theme = createAppTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme} defaultMode="dark">
      <CssBaseline enableColorScheme />
      <ThemeModeProvider>
        <App />
      </ThemeModeProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
