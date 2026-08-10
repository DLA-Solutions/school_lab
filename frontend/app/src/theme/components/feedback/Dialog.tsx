import type { Theme, Components } from '@mui/material/styles';
import { shadowSx } from '../../shadows';

const Dialog: Components<Omit<Theme, 'components'>>['MuiDialog'] = {
  styleOverrides: {
    paper: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        backgroundColor: palette.background.paper,
        backgroundImage: 'none',
        borderRadius: Number(theme.shape.borderRadius) * 3,
        ...shadowSx(theme, 0),
      };
    },
  },
};

export default Dialog;
