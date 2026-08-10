import type { Theme, Components } from '@mui/material/styles';
import { linearProgressClasses } from '@mui/material/LinearProgress';

const LinearProgress: Components<Omit<Theme, 'components'>>['MuiLinearProgress'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        height: 6,
        borderRadius: theme.shape.borderRadius,
        backgroundColor: palette.surface.alt,

        [`& .${linearProgressClasses.bar}`]: {
          borderRadius: theme.shape.borderRadius,
        },
      };
    },
  },
};

export default LinearProgress;
