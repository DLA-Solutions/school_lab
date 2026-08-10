import type { Theme, Components } from '@mui/material/styles';
import simplebar from 'theme/styles/simplebar';
import scrollbar from 'theme/styles/scrollbar';
import echart from 'theme/styles/echart';
import focusRing from 'theme/styles/focusRing';

const CssBaseline: Components<Omit<Theme, 'components'>>['MuiCssBaseline'] = {
  defaultProps: {},
  styleOverrides: (theme) => {
    const palette = (theme.vars || theme).palette;

    return {
      '*, *::before, *::after': {
        margin: 0,
        padding: 0,
      },
      html: {
        scrollBehavior: 'smooth',
      },
      // Replaces the user agent's default outline, which is drawn without regard to the very dark
      // `#081028` backdrop. Deliberately the weakest selector that can express it, so a component
      // override needing a different ring — the DataGrid cell, for one — still wins.
      '*:focus-visible': focusRing(theme),
      body: {
        fontVariantLigatures: 'none',
        backgroundColor: palette.background.default,
        ...scrollbar(theme),
      },
      ...simplebar(theme),
      ...echart(),
    };
  },
};

export default CssBaseline;
