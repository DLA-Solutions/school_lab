import { useCallback, useEffect, useState } from 'react';
import { describe, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs, { Dayjs } from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { renderWithTheme } from 'test/renderWithTheme';

const user = userEvent.setup({ delay: null });

const Harness = () => {
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState<Dayjs>(dayjs('2026-02-01'));

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.resolve().then(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [viewMonth]);

  const dayValue = useCallback((key: string) => pending[key] ?? false, [pending]);

  const CustomDay = useCallback(
    (props: PickersDayProps) => {
      const { day, disabled, outsideCurrentMonth, ...other } = props;
      const instructional = dayValue(day.format('YYYY-MM-DD'));
      return (
        <PickersDay
          {...other}
          day={day}
          disabled={disabled}
          outsideCurrentMonth={outsideCurrentMonth}
          sx={instructional ? { bgcolor: 'success.main' } : undefined}
        />
      );
    },
    [dayValue],
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateCalendar
        referenceDate={dayjs('2026-02-01')}
        minDate={dayjs('2026-02-01')}
        maxDate={dayjs('2026-12-18')}
        loading={loading}
        onMonthChange={(month) => setViewMonth(month as Dayjs)}
        onChange={(day) => {
          console.log('onChange fired', (day as Dayjs).format('YYYY-MM-DD'));
          setPending((c) => ({ ...c, [(day as Dayjs).format('YYYY-MM-DD')]: true }));
        }}
        slots={{ day: CustomDay }}
      />
    </LocalizationProvider>
  );
};

describe('debug3', () => {
  it('fires onChange', async () => {
    renderWithTheme(<Harness />);
    const day12 = await screen.findByRole('gridcell', { name: '12' });
    await user.click(day12);
  });
});
