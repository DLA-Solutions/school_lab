import type { Theme, Components } from '@mui/material/styles';
import { monthCalendarClasses } from '@mui/x-date-pickers/MonthCalendar';

const MonthCalendar: Components<Omit<Theme, 'components'>>['MuiMonthCalendar'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        [`& .${monthCalendarClasses.button}.Mui-selected`]: {
          background: `${palette.primary.main} !important`,
          // Same pairing as the selected pagination digit (B06): MUI derives the label from
          // `primary.contrastText`, which resolves to white on the brand purple at 3.73:1. The
          // month abbreviation is text, so 4.5:1 applies. `grey[900]` holds #171923 in both
          // schemes, which is what a background that is the brand purple in both schemes needs.
          color: palette.grey[900],
        },
      };
    },
  },
};

export default MonthCalendar;
