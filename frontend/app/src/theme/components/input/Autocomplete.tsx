import type { Theme, Components } from '@mui/material/styles';

const Autocomplete: Components<Omit<Theme, 'components'>>['MuiAutocomplete'] = {
  styleOverrides: {
    // MUI reserves 19px at the top of a `filled` root for a floating label, and pads the inner
    // input on top of that. Our fields carry a placeholder rather than a label, so that space is
    // never filled — it just makes the box tall and sits the text low in it. `MuiInputBase` already
    // states what a field's padding is; this hands the vertical rhythm back to it and leaves the
    // inner input to size itself.
    inputRoot: ({ theme }) => ({
      '&.MuiFilledInput-root': {
        // The same padding every other field gets, on all four sides.
        paddingTop: theme.spacing(1.25),
        paddingBottom: theme.spacing(1.25),
        paddingLeft: theme.spacing(1.25),

        // The input is the whole height of the box; the padding above belongs to the box.
        '& .MuiFilledInput-input': {
          paddingTop: 0,
          paddingBottom: 0,
        },
      },
    }),
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
