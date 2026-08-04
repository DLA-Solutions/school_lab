import type { Theme, Components } from '@mui/material/styles';
import { stepLabelClasses } from '@mui/material/StepLabel';

const StepLabel: Components<Omit<Theme, 'components'>>['MuiStepLabel'] = {
  styleOverrides: {
    label: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        fontSize: theme.typography.body2.fontSize,
        color: palette.text.secondary,

        [`&.${stepLabelClasses.active}, &.${stepLabelClasses.completed}`]: {
          color: palette.text.primary,
          fontWeight: 500,
        },
      };
    },
  },
};

export default StepLabel;
