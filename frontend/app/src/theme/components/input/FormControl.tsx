import type { Theme, Components } from '@mui/material/styles';

/**
 * `filled` is the design-system field variant (see `SearchField` and the sign-in form). A bare
 * `<FormControl>` would otherwise default to `outlined` and draw the notched fieldset on top of
 * the border `InputBase` already paints — two borders around one field. `TextField` always passes
 * `variant` down explicitly, so this default only reaches standalone `FormControl` usage.
 */
const FormControl: Components<Omit<Theme, 'components'>>['MuiFormControl'] = {
  defaultProps: {
    variant: 'filled',
  },
  styleOverrides: {
    root: ({ theme }) => ({
      // The column gap is the single knob for label → control → helper-text rhythm. A floating
      // label is out of flow, so this only spaces the elements that actually stack.
      gap: theme.spacing(0.75),
    }),
  },
};

export default FormControl;
