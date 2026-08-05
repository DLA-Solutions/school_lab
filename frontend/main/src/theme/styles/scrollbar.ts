import { Theme } from '@mui/material';

const scrollbar = (theme: Theme) => {
  const palette = (theme.vars || theme).palette;

  return {
    '@supports (-moz-appearance:none)': {
      // A custom scrollbar is a UI component and the thumb is the part a pointer user has to find,
      // so SC 1.4.11 applies. `grey[300]` is the same #AEB9E1 in both schemes and drops to 1.85:1
      // on the light backdrop. `neutral.main` is that same #AEB9E1 in dark — nothing moves there —
      // and #7E89AC in light, which clears 3:1 (3.31:1 on the page, 3.46:1 on a card).
      scrollbarColor: `${palette.neutral.main} transparent`,
    },
    '*::-webkit-scrollbar': {
      width: 5,
      height: 5,
      WebkitAppearance: 'none',
      backgroundColor: 'transparent',
      visibility: 'hidden',
    },
    '*::-webkit-scrollbar-track': {
      margin: 0,
    },
    '*::-webkit-scrollbar-thumb': {
      borderRadius: 3,
      backgroundColor: palette.background.paper,
      visibility: 'hidden',
    },
  };
};

export default scrollbar;
