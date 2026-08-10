import type { Theme, Components } from '@mui/material/styles';

const DialogContent: Components<Omit<Theme, 'components'>>['MuiDialogContent'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(1.5, 3),
    }),
  },
};

export default DialogContent;
