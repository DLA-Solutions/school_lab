import type { Theme, Components } from '@mui/material/styles';

const Tooltip: Components<Omit<Theme, 'components'>>['MuiTooltip'] = {
  styleOverrides: {
    tooltip: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        backgroundColor: palette.neutral.darker,
        color: palette.text.primary,
        fontSize: theme.typography.caption.fontSize,
        fontWeight: 500,
        padding: theme.spacing(0.75, 1.25),
        borderRadius: theme.shape.borderRadius,
      };
    },
    arrow: ({ theme }) => ({
      color: (theme.vars || theme).palette.neutral.darker,
    }),
  },
};

export default Tooltip;
