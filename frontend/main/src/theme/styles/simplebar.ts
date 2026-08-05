import { Theme } from '@mui/material';

const simplebar = (theme: Theme) => ({
  '& .simplebar-track': {
    '&.simplebar-vertical': {
      '& .simplebar-scrollbar': {
        '&:before': {
          // See `scrollbar.ts`: `neutral.main` keeps the dark thumb at #AEB9E1 and darkens the
          // light one to #7E89AC, which is the difference between 1.85:1 and 3.31:1 on the page
          // backdrop the sidebar scroller sits on.
          backgroundColor: (theme.vars || theme).palette.neutral.main,
        },
        '&.simplebar-visible': {
          '&:before': {
            opacity: 1,
          },
        },
      },
    },
  },
});

export default simplebar;
