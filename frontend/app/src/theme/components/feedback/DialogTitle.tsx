import type { Theme, Components } from '@mui/material/styles';

const DialogTitle: Components<Omit<Theme, 'components'>>['MuiDialogTitle'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(3, 3, 1.5),
      fontSize: theme.typography.h6.fontSize,
      fontWeight: theme.typography.h6.fontWeight,
    }),
  },
};

export default DialogTitle;
