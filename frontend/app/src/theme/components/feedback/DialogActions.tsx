import type { Theme, Components } from '@mui/material/styles';

const DialogActions: Components<Omit<Theme, 'components'>>['MuiDialogActions'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(1.5, 3, 3),
      gap: theme.spacing(1),
    }),
  },
};

export default DialogActions;
