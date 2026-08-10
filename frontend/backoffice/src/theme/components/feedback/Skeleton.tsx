import type { Theme, Components } from '@mui/material/styles';

const Skeleton: Components<Omit<Theme, 'components'>>['MuiSkeleton'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      backgroundColor: (theme.vars || theme).palette.surface.alt,
    }),
  },
};

export default Skeleton;
