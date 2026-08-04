import type { Theme, Components } from '@mui/material/styles';
import { shadowSx } from '../../shadows';

const Drawer: Components<Omit<Theme, 'components'>>['MuiDrawer'] = {
  styleOverrides: {
    root: {
      '&:hover, &:focus': {
        '*::-webkit-scrollbar, *::-webkit-scrollbar-thumb': {
          visibility: 'visible',
        },
      },
    },
    paper: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        padding: 0,
        width: '300px',
        height: '100vh',
        borderRadius: 0,
        border: 0,
        borderRight: 1,
        borderStyle: 'solid',
        borderColor: palette.background.paper,
        backgroundColor: palette.background.default,
        ...shadowSx(theme, 0),
        boxSizing: 'border-box',
      };
    },
  },
};

export default Drawer;
