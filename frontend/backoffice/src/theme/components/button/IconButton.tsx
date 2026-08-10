import type { Theme, Components } from '@mui/material/styles';

const IconButton: Components<Omit<Theme, 'components'>>['MuiIconButton'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      marginLeft: 0,
      color: (theme.vars || theme).palette.text.secondary,
      // Hovering must make the control clearer, never fainter: the icon takes the primary text
      // colour and sits on a defined plate rather than on whatever the row happens to be.
      '&:hover': {
        color: (theme.vars || theme).palette.text.primary,
        backgroundColor: (theme.vars || theme).palette.surface.alt,
      },
      '&.Mui-disabled': {
        color: (theme.vars || theme).palette.text.disabled,
      },
    }),
    sizeLarge: ({ theme }) => ({
      fontSize: theme.typography.h5.fontSize,
      padding: theme.spacing(1),
    }),
    sizeMedium: ({ theme }) => ({
      fontSize: theme.typography.h6.fontSize,
      padding: theme.spacing(0.75),
    }),
    sizeSmall: ({ theme }) => ({
      fontSize: theme.typography.button.fontSize,
      padding: theme.spacing(0.5),
    }),
  },
};

export default IconButton;
