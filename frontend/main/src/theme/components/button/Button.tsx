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
        background: gradient,
        '&:hover': {
          background: gradient,
        },
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
