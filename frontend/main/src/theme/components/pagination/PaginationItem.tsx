import type { Theme, Components } from '@mui/material/styles';

const PaginationItem: Components<Omit<Theme, 'components'>>['MuiPaginationItem'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        color: palette.neutral.light,
        fontSize: theme.typography.body2.fontSize,
        '&.Mui-selected': {
          background: palette.primary.main,
          '&:hover': {
            background: palette.primary.main,
          },
        },
      };
    },
  },
};

export default PaginationItem;
