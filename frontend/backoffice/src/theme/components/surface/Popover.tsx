import type { Theme, Components } from '@mui/material/styles';
import { menuClasses } from '@mui/material/Menu';

const Popover: Components<Omit<Theme, 'components'>>['MuiPopover'] = {
  defaultProps: {
    // The overlay vocabulary is a flat surface with a hairline border, not a raised one: the
    // Paper override already carries the brand shadow, so MUI's elevation-8 overlay tint would
    // only wash the surface out.
    elevation: 0,
  },
  styleOverrides: {
    // Menu composes Popover, so this slot also lands on every Menu, Select and ProfileMenu paper.
    // Those already declare their own border and zero padding through the Menu and Paper
    // overrides; excluding them keeps this override from re-deciding a surface that is already
    // settled, and makes the rule below apply only to a Popover used on its own.
    paper: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        [`&:not(.${menuClasses.paper})`]: {
          border: `1px solid ${palette.divider}`,
          backgroundImage: 'none',
          // A floating panel is not a card: the Paper default of 28px is right for a section on
          // the page and far too generous for a control anchored to a button.
          padding: theme.spacing(2),
        },
      };
    },
  },
};

export default Popover;
