import { Theme } from '@mui/material';

const scrollbar = (theme: Theme) => {
  const palette = (theme.vars || theme).palette;

  return {
    '@supports (-moz-appearance:none)': {
      scrollbarColor: `${palette.grey[300]} transparent`,
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
