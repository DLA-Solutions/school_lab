import type { Theme, Components } from '@mui/material/styles';

const Select: Components<Omit<Theme, 'components'>>['MuiSelect'] = {
  styleOverrides: {
    icon: ({ theme }) => ({
      color: (theme.vars || theme).palette.text.secondary,
    }),
  },
};

export default Select;
