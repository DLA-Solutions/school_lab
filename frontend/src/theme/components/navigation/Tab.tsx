import type { Theme, Components } from '@mui/material/styles';

const Tab: Components<Omit<Theme, 'components'>>['MuiTab'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      minHeight: 42,
      textTransform: 'initial',
      fontWeight: 500,
      fontSize: theme.typography.subtitle2.fontSize,
      color: (theme.vars || theme).palette.text.secondary,

      '&.Mui-selected': {
        color: (theme.vars || theme).palette.text.primary,
      },
    }),
  },
};

export default Tab;
