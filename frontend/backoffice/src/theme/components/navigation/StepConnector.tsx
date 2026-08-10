import type { Theme, Components } from '@mui/material/styles';
import { stepConnectorClasses } from '@mui/material/StepConnector';

const StepConnector: Components<Omit<Theme, 'components'>>['MuiStepConnector'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        [`& .${stepConnectorClasses.line}`]: {
          borderColor: palette.divider,
        },
        [`&.Mui-active, &.Mui-completed`]: {
          [`& .${stepConnectorClasses.line}`]: {
            borderColor: palette.primary.main,
          },
        },
      };
    },
  },
};

export default StepConnector;
