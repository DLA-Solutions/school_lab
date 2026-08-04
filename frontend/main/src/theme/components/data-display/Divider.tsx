import type { Theme, Components } from '@mui/material/styles';
import { dividerClasses } from '@mui/material';

const Divider: Components<Omit<Theme, 'components'>>['MuiDivider'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        margin: theme.spacing(2, 0),
        backgroundColor: palette.neutral.darker,

        [`&.${dividerClasses.withChildren}`]: {
          color: palette.text.secondary,
          backgroundColor: 'transparent',
          '&::before': {
            backgroundColor: palette.neutral.darker,
          },
          '&::after': {
            backgroundColor: palette.neutral.darker,
          },
        },
      };
    },
  },
};

export default Divider;
