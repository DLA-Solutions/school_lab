import type { Theme, Components } from '@mui/material/styles';
import { pickersOutlinedInputClasses } from '@mui/x-date-pickers/PickersTextField';
import { iconButtonClasses } from '@mui/material';

/**
 * The date-picker field.
 *
 * `MuiDatePicker` itself takes only `defaultProps` — MUI X gives a picker no `styleOverrides` key,
 * because a picker is a composition and each themable part carries its own key. The part that
 * renders on a screen before anything is opened is the field, and the field the SPA mounts is the
 * outlined one, so this is where the picker's appearance belongs. The popper's month and year grids
 * are themed next door in `MonthCalendar` / `YearCalendar`.
 *
 * Everything here was a ~40-line `sx` block on `components/common/DateSelect.tsx`. It is written
 * against `MuiPickersOutlinedInput` rather than the shared `MuiPickersInputBase` for a mechanical
 * reason worth stating: the outlined slot's own styles are emitted *after* the base slot's, so a
 * padding or width declared on the base is overwritten by the variant. The variant is the last
 * writer, and these declarations have to win.
 */
const PickersOutlinedInput: Components<Omit<Theme, 'components'>>['MuiPickersOutlinedInput'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      // The field reads as a control sunk into the card rather than as a bordered input, so it
      // takes the alternate surface and drops the notch in all three states — including focus,
      // where the outlined input would otherwise draw a 2px ring.
      backgroundColor: (theme.vars || theme).palette.surface.alt,
      padding: theme.spacing(0, 1),

      [`& .${pickersOutlinedInputClasses.notchedOutline}`]: {
        borderWidth: 0,
      },
      [`&:hover .${pickersOutlinedInputClasses.notchedOutline}`]: {
        borderWidth: 0,
      },
      [`&.Mui-focused .${pickersOutlinedInputClasses.notchedOutline}`]: {
        borderWidth: 0,
      },

      // The calendar button is an adornment inside the field, not a control in its own right.
      [`& .${iconButtonClasses.edgeEnd}`]: {
        color: (theme.vars || theme).palette.text.secondary,
        margin: 0,

        '& > svg': {
          fontSize: theme.typography.subtitle1.fontSize,
        },
      },
    }),
    // MUI sizes the container for the widest value the format can hold; a month-and-year field
    // asks for far less, so it shrinks to its content above a floor.
    sectionsContainer: ({ theme }) => ({
      padding: theme.spacing(1, 0),
      width: 'auto',
      minWidth: 80,
    }),
  },
};

export default PickersOutlinedInput;
