import type { Theme, Components } from '@mui/material/styles';
import { shadowForMode } from '../../shadows';

const TextField: Components<Omit<Theme, 'components'>>['MuiTextField'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      boxShadow: shadowForMode(theme, 1),
    }),
  },
};

export default TextField;
