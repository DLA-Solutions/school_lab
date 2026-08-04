import type { Theme, Components } from '@mui/material/styles';
import { menuClasses } from '@mui/material/Menu';

const Menu: Components<Omit<Theme, 'components'>>['MuiMenu'] = {
  defaultProps: {
    elevation: 0,
  },
  styleOverrides: {
    paper: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        border: `1px solid ${palette.divider}`,

        [`& .${menuClasses.list}`]: {
          padding: theme.spacing(1, 0),
        },
      };
    },
  },
};

export default Menu;
