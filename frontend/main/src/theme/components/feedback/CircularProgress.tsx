import type { Theme, Components } from '@mui/material/styles';

const CircularProgress: Components<Omit<Theme, 'components'>>['MuiCircularProgress'] = {
  styleOverrides: {
    circle: {
      strokeLinecap: 'round',
    },
  },
};

export default CircularProgress;
