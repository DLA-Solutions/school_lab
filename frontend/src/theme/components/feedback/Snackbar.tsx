import type { Theme, Components } from '@mui/material/styles';

const Snackbar: Components<Omit<Theme, 'components'>>['MuiSnackbar'] = {
  defaultProps: {
    // MUI anchors bottom-left, which in this shell lands on top of the 300px sidebar. Bottom-right
    // is the only corner the navigation never occupies.
    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
    // MUI defaults to `null` — a toast that stays until something dismisses it. Transient feedback
    // should clear itself; a message that must persist passes `autoHideDuration={null}` explicitly
    // and gives the user a close affordance.
    autoHideDuration: 6000,
  },
  styleOverrides: {
    // Below sm the snackbar stretches edge to edge and MUI insets it by 8px. Match the shell's own
    // xs padding so it sits on the same margin as the content behind it.
    root: ({ theme }) => ({
      [theme.breakpoints.down('sm')]: {
        left: theme.spacing(2),
        right: theme.spacing(2),
      },
    }),
  },
};

export default Snackbar;
