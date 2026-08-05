import type { Theme, Components } from '@mui/material/styles';

const Stepper: Components<Omit<Theme, 'components'>>['MuiStepper'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(2, 0),
    }),
  },
};

export default Stepper;
