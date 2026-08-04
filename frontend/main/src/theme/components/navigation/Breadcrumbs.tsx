import type { Theme, Components } from '@mui/material/styles';

const Breadcrumbs: Components<Omit<Theme, 'components'>>['MuiBreadcrumbs'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      fontSize: theme.typography.body2.fontSize,
      color: (theme.vars || theme).palette.text.secondary,
    }),
    separator: ({ theme }) => ({
      color: (theme.vars || theme).palette.text.disabled,
    }),
  },
};

export default Breadcrumbs;
