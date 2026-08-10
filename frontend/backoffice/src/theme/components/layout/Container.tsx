import type { Theme, Components } from '@mui/material/styles';

const Container: Components<Omit<Theme, 'components'>>['MuiContainer'] = {
  styleOverrides: {
    // Gutters follow the same steps as the MainLayout main region (`p={{ xs: 2, sm: 3, lg: 5 }}`),
    // so a page rendered outside the shell — Error404, and later the public and printable views —
    // lines up with one rendered inside it. The xs and sm steps happen to equal MUI's defaults;
    // reading them from `theme.spacing` keeps them tied to the scale instead of to a coincidence.
    root: ({ theme }) => ({
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2),

      [theme.breakpoints.up('sm')]: {
        paddingLeft: theme.spacing(3),
        paddingRight: theme.spacing(3),
      },

      [theme.breakpoints.up('lg')]: {
        paddingLeft: theme.spacing(5),
        paddingRight: theme.spacing(5),
      },
    }),
  },
};

export default Container;
