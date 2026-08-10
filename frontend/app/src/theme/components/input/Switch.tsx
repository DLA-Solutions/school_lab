import type { Theme, Components } from '@mui/material/styles';
import { switchClasses } from '@mui/material/Switch';

const Switch: Components<Omit<Theme, 'components'>>['MuiSwitch'] = {
  styleOverrides: {
    switchBase: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        color: palette.neutral.light,

        [`&.${switchClasses.checked}`]: {
          color: palette.primary.main,

          [`& + .${switchClasses.track}`]: {
            backgroundColor: palette.primary.main,
            opacity: 1,
          },
        },
        [`&.${switchClasses.disabled}`]: {
          [`& + .${switchClasses.track}`]: {
            opacity: 0.3,
          },
        },
      };
    },
    thumb: {
      boxShadow: 'none',
    },
    track: ({ theme }) => ({
      backgroundColor: (theme.vars || theme).palette.neutral.darker,
      opacity: 1,
    }),
  },
};

export default Switch;
