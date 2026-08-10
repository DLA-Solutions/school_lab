import type { Theme, Components } from '@mui/material/styles';

const PaginationItem: Components<Omit<Theme, 'components'>>['MuiPaginationItem'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        // `neutral.light` is byte-identical in both schemes, so the digit that reads at 12.72:1 on
        // a dark card is 1.38:1 on a white one. `text.secondary` is the semantic token for
        // de-emphasised text and is scheme-aware: 9.05:1 dark, 7.53:1 light.
        color: palette.text.secondary,
        fontSize: theme.typography.body2.fontSize,
        '&.Mui-selected': {
          background: palette.primary.main,
          // The selected digit sits on the brand purple in both schemes, so a single near-black
          // label serves both: 4.69:1, against 2.70:1 for the inherited `neutral.light`.
          color: palette.grey[900],
          '&:hover': {
            background: palette.primary.main,
          },
        },
      };
    },
  },
};

export default PaginationItem;
