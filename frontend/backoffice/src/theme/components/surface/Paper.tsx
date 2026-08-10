import type { Theme, Components } from '@mui/material/styles';
import { menuClasses } from '@mui/material';
import { shadowSx } from '../../shadows';

const Paper: Components<Omit<Theme, 'components'>>['MuiPaper'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        padding: theme.spacing(3.5),
        backgroundColor: palette.background.paper,
        ...shadowSx(theme, 0),
        borderRadius: Number(theme.shape.borderRadius) * 3,

        [`&.${menuClasses.paper}`]: {
          padding: theme.spacing(0),
        },
      };
    },
  },
};

export default Paper;
