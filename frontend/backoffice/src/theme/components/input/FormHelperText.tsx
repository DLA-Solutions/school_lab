import type { Theme, Components } from '@mui/material/styles';

const FormHelperText: Components<Omit<Theme, 'components'>>['MuiFormHelperText'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      marginLeft: 0,
      marginRight: 0,
      fontSize: theme.typography.caption.fontSize,
      color: (theme.vars || theme).palette.text.secondary,

      '&.Mui-error': {
        color: (theme.vars || theme).palette.error.main,
      },
    }),
  },
};

export default FormHelperText;
