import type { Theme, Components } from '@mui/material/styles';

const MenuItem: Components<Omit<Theme, 'components'>>['MuiMenuItem'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        backgroundColor: (theme.vars || theme).palette.surface.alt,
      },
    }),
  },
};

export default MenuItem;
