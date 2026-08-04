import type { Theme, Components } from '@mui/material/styles';

const Autocomplete: Components<Omit<Theme, 'components'>>['MuiAutocomplete'] = {
  styleOverrides: {
    paper: ({ theme }) => ({
      padding: 0,
      border: `1px solid ${(theme.vars || theme).palette.divider}`,
    }),
    listbox: ({ theme }) => ({
      padding: theme.spacing(1, 0),

      '& .MuiAutocomplete-option.Mui-focused': {
        backgroundColor: (theme.vars || theme).palette.surface.alt,
      },
    }),
    popupIndicator: ({ theme }) => ({
      color: (theme.vars || theme).palette.text.secondary,
    }),
    clearIndicator: ({ theme }) => ({
      color: (theme.vars || theme).palette.text.secondary,
    }),
  },
};

export default Autocomplete;
