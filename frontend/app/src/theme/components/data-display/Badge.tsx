import type { Theme, Components } from '@mui/material/styles';

const Badge: Components<Omit<Theme, 'components'>>['MuiBadge'] = {
  styleOverrides: {
    badge: ({ theme }) => ({
      fontWeight: 600,
      fontSize: theme.typography.caption.fontSize,
      boxShadow: `0 0 0 2px ${(theme.vars || theme).palette.background.paper}`,
    }),
    dot: {
      boxShadow: 'none',
    },
  },
};

export default Badge;
