import type { Theme, Components } from '@mui/material/styles';

const Tooltip: Components<Omit<Theme, 'components'>>['MuiTooltip'] = {
  styleOverrides: {
    tooltip: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        backgroundColor: palette.neutral.darker,
        // The plate is `neutral.darker` (#343B4F) in *both* schemes — deliberately inverted — so
        // the label cannot follow `text.primary`, which is #171923 in light and lands at 1.57:1.
        // White holds 11.14:1 on that plate regardless of scheme, and leaves dark unchanged.
        color: palette.common.white,
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
