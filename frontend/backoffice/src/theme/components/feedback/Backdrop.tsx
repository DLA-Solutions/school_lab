import type { Theme, Components } from '@mui/material/styles';
import { backdropClasses } from '@mui/material/Backdrop';

const Backdrop: Components<Omit<Theme, 'components'>>['MuiBackdrop'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        // Menu, Select and Popover mount a backdrop only to catch the outside click, and MUI marks
        // it with `.MuiBackdrop-invisible` rather than a separate element. A styleOverride on the
        // root is serialised after that class, so painting the root unguarded would drop a scrim
        // behind every open dropdown.
        [`&:not(.${backdropClasses.invisible})`]: {
          // Dark scheme dims with the app backdrop itself, so a dialog reads as the page receding
          // rather than as a black sheet dropped over it.
          backgroundColor: theme.alpha(palette.background.default, 0.6),
          // The light scheme's own backdrop is near-white and would veil nothing. `text.primary`
          // is its darkest token, and one of the few MUI generates a channel token for, which is
          // what `theme.alpha` needs to stay a CSS variable.
          ...theme.applyStyles('light', {
            backgroundColor: theme.alpha(palette.text.primary, 0.5),
          }),
        },
      };
    },
  },
};

export default Backdrop;
