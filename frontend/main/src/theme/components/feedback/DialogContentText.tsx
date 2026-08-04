import type { Theme, Components } from '@mui/material/styles';

const DialogContentText: Components<Omit<Theme, 'components'>>['MuiDialogContentText'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      color: (theme.vars || theme).palette.text.secondary,
      fontSize: theme.typography.body2.fontSize,
    }),
  },
};

export default DialogContentText;
