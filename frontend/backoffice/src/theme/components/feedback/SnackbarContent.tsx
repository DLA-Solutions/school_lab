import type { Theme, Components } from '@mui/material/styles';

const SnackbarContent: Components<Omit<Theme, 'components'>>['MuiSnackbarContent'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        backgroundColor: palette.neutral.darker,
        // Same inverted plate as the Tooltip: `neutral.darker` is identical in both schemes, so the
        // message stays white (11.14:1) rather than following `text.primary` down to 1.57:1.
        color: palette.common.white,
        fontSize: theme.typography.body2.fontSize,
        borderRadius: Number(theme.shape.borderRadius) * 2,
      };
    },
  },
};

export default SnackbarContent;
