import type { Theme, Components } from '@mui/material/styles';

const Tabs: Components<Omit<Theme, 'components'>>['MuiTabs'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      minHeight: 42,
      borderBottom: `1px solid ${(theme.vars || theme).palette.divider}`,
    }),
    indicator: ({ theme }) => ({
      height: 3,
      borderRadius: theme.shape.borderRadius,
      backgroundColor: (theme.vars || theme).palette.primary.main,
    }),
  },
};

export default Tabs;
