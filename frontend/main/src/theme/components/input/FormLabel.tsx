import type { Theme, Components } from '@mui/material/styles';
import { formLabelClasses } from '@mui/material';

const FormLabel: Components<Omit<Theme, 'components'>>['MuiFormLabel'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        color: palette.text.secondary,
        fontSize: theme.typography.body2.fontSize,
        fontWeight: theme.typography.subtitle2.fontWeight,
        letterSpacing: 0.5,
        lineHeight: 1.4,

        // The field itself carries the focus affordance. Recolouring the label on focus too
        // reads as a state change on the value, which is what the error colour is reserved for.
        [`&.${formLabelClasses.focused}`]: {
          color: palette.text.secondary,
        },
        [`&.${formLabelClasses.error}`]: {
          color: palette.error.main,
        },
        [`&.${formLabelClasses.disabled}`]: {
          color: palette.text.disabled,
        },
      };
    },
    asterisk: ({ theme }) => ({
      color: (theme.vars || theme).palette.error.main,
    }),
  },
};

export default FormLabel;
