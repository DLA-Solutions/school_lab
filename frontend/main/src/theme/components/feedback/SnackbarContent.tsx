import type { Theme, Components } from '@mui/material/styles';

const SnackbarContent: Components<Omit<Theme, 'components'>>['MuiSnackbarContent'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        backgroundColor: palette.neutral.darker,
        color: palette.text.primary,
        fontSize: theme.typography.body2.fontSize,
        borderRadius: Number(theme.shape.borderRadius) * 2,
      };
    },
  },
};

export default SnackbarContent;
