import { PropsWithChildren, useEffect, useRef } from 'react';
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
  // useColorScheme's `mode` is undefined until the client-only hydration effect
  // resolves it (see @mui/system's isClient gate). Guard so the "apply stored
  // preference" logic runs exactly once, otherwise it re-fires on every mode
  // change (including user toggles) and fights `setMode`, bouncing forever.
  const hasSyncedStoredMode = useRef(false);

  useEffect(() => {
    if (hasSyncedStoredMode.current || mode === undefined) {
      return;
    }
    hasSyncedStoredMode.current = true;
    const stored = readStoredMode();
    const willSetMode = Boolean(stored && stored !== mode);
    if (willSetMode) {
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
