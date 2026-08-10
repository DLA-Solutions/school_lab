import type { Theme, Components } from '@mui/material/styles';
import { yearCalendarClasses } from '@mui/x-date-pickers/YearCalendar';

const YearCalendar: Components<Omit<Theme, 'components'>>['MuiYearCalendar'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        [`& .${yearCalendarClasses.button}.Mui-selected`]: {
          background: `${palette.primary.main} !important`,
          // The four-digit year, on the same brand-purple fill as the selected month — see
          // `MonthCalendar.tsx` for the measurement.
          color: palette.grey[900],
        },
      };
    },
  },
};

export default YearCalendar;
