import { PropsWithChildren, useEffect } from 'react';
import { useColorScheme } from '@mui/material/styles';

export const COLOR_MODE_STORAGE_KEY = 'school-lab-color-mode';

export type ColorMode = 'light' | 'dark';

function readStoredMode(): ColorMode | null {
  try {
    const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return null;
}

const ThemeModeProvider = ({ children }: PropsWithChildren) => {
  const { setMode, mode } = useColorScheme();

  useEffect(() => {
    const stored = readStoredMode();
    if (stored && stored !== mode) {
      setMode(stored);
    }
  }, [mode, setMode]);

  useEffect(() => {
    if (mode === 'light' || mode === 'dark') {
      try {
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
      } catch {
        // localStorage unavailable
      }
    }
  }, [mode]);

  return children;
};

export default ThemeModeProvider;
