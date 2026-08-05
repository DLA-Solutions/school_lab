import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';

// The field's appearance lives in the `MuiPickersOutlinedInput` override
// (`theme/components/date-picker/`), so what is left here is the picker's behaviour and how the
// control sits in the header row it shares with the chart legends.
const DateSelect = () => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        views={['month', 'year']}
        defaultValue={dayjs('Jan-2024')}
        format="MMM YYYY"
        sx={{ flexShrink: 0 }}
      />
    </LocalizationProvider>
  );
};

export default DateSelect;
