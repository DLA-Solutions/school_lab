import type { Theme, Components } from '@mui/material/styles';
import { shadowSx } from '../../shadows';

const TextField: Components<Omit<Theme, 'components'>>['MuiTextField'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      ...shadowSx(theme, 1),
    }),
  },
};

export default TextField;
