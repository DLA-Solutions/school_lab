import type { Theme, Components } from '@mui/material/styles';

const InputBase: Components<Omit<Theme, 'components'>>['MuiInputBase'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        border: 1,
        borderStyle: 'solid',
        // A form control's boundary is the canonical SC 1.4.11 case: this border is the only thing
        // that says where the field is. `neutral.darker` clears 3:1 in light (11.14:1 on the card)
        // but collapses to 1.58:1 in dark, so dark takes `neutral.dark` instead — 5.07:1 on
        // `background.paper`, 5.44:1 on the `colorSecondary` backdrop. Light is left exactly as it
        // renders today. Raising `neutral.darker` itself is not an option: it is also the Tooltip
        // and SnackbarContent plate and the Divider colour.
        borderColor: palette.neutral.darker,
        ...theme.applyStyles('dark', {
          borderColor: palette.neutral.dark,
        }),
        borderRadius: theme.shape.borderRadius,
        background: `${palette.background.paper} !important`,
        fontSize: theme.typography.subtitle2.fontSize,
        padding: theme.spacing(1.25),
        letterSpacing: 0.5,

        '& input::placeholder': {
          color: palette.text.secondary,
          opacity: 1,
        },
        '&:before, &:after': {
          display: 'none',
        },
      };
    },
    colorSecondary: ({ theme }) => ({
      background: `${(theme.vars || theme).palette.background.default} !important`,
    }),
    sizeSmall: ({ theme }) => ({
      padding: theme.spacing(1, 1.25),
      fontSize: theme.typography.caption.fontSize,
    }),
  },
};

export default InputBase;
