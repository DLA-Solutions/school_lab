import type { Theme, Components } from '@mui/material/styles';

const Button: Components<Omit<Theme, 'components'>>['MuiButton'] = {
  defaultProps: {
    disableElevation: true,
  },
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        color: palette.text.primary,
        borderRadius: theme.shape.borderRadius,
        textTransform: 'initial',
        letterSpacing: 0.5,
        fontWeight: 500,
      };
    },
    contained: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        '&.Mui-disabled': {
          color: palette.text.secondary,
          background: palette.text.disabled,
        },
      };
    },
    outlined: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        '&.Mui-disabled': {
          color: palette.text.disabled,
          borderColor: palette.text.disabled,
        },
      };
    },
    text: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        '&.Mui-disabled': {
          color: palette.text.disabled,
        },
      };
    },
    containedPrimary: ({ theme }) => {
      const palette = (theme.vars || theme).palette;
      const gradient = `linear-gradient(128.49deg, ${palette.gradients.primary.main} 19.86%, ${palette.gradients.primary.state} 68.34%)`;

      return {
        // The gradient is the same in both schemes, so the label must be too. White is the best any
        // flat colour reaches across the sweep — 3.73:1 at #CB3CFF, 5.90:1 at #7F25FB — and that
        // 3.73:1 floor is exactly what waiver W3 accepts. Inheriting the root's `text.primary`
        // would give light mode #171923, whose worst case is 2.97:1, outside the waiver's terms.
        color: palette.common.white,
        background: gradient,
        '&:hover': {
          background: gradient,
        },
      };
    },
    containedError: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        // `error.main` is both a foreground on the page (FormHelperText, RateChip) and the fill of
        // this button, and those two jobs need disjoint luminance ranges — no single value serves
        // both, so the label is what moves. Inheriting the root's `text.primary` puts white on
        // dark's #FF5A65 at 3.04:1 and near-black on light's #B03C44 at 2.98:1; each scheme needs
        // the other one's end of the scale. This is the confirm control of a destructive action.
        color: palette.common.white, // 5.87:1 on light's #B03C44
        ...theme.applyStyles('dark', {
          color: palette.grey[900], // 5.75:1 on dark's #FF5A65
        }),
      };
    },
    containedSecondary: ({ theme }) => ({
      background: (theme.vars || theme).palette.surface.alt,
      '&:hover': { background: (theme.vars || theme).palette.surface.alt },
    }),
    sizeLarge: ({ theme }) => ({
      padding: theme.spacing(1.25, 2.25),
      fontSize: theme.typography.button.fontSize,
    }),
    sizeMedium: ({ theme }) => ({
      padding: theme.spacing(1, 1.5),
      fontSize: theme.typography.subtitle2.fontSize,
    }),
    sizeSmall: ({ theme }) => ({
      padding: theme.spacing(0.875, 1.15),
      fontSize: theme.typography.caption.fontSize,
    }),
  },
};

export default Button;
