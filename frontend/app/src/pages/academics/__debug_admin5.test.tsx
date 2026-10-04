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
  const [year, setYear] = useState<{ starts_on: string; ends_on: string } | null>(null);
  const [yearLoading, setYearLoading] = useState(true);

  useEffect(() => {
    Promise.resolve().then(() => {
      setYear({ starts_on: '2026-02-01', ends_on: '2026-12-18' });
      setYearLoading(false);
    });
  }, []);

  const [viewMonth, setViewMonth] = useState<Dayjs | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewMonth(year ? dayjs(year.starts_on) : null);
  }, [year]);

  const [baseline, setBaseline] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const monthKey = viewMonth?.format('YYYY-MM') ?? null;

  useEffect(() => {
    if (!year || !monthKey) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.resolve().then(() => {
      setBaseline({});
      setPending({});
      setLoading(false);
    });
  }, [year, monthKey]);

  const dayValue = useCallback((key: string) => pending[key] ?? baseline[key] ?? false, [pending, baseline]);

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

  const handleDayClick = (day: Dayjs) => {
    console.log('handleDayClick', day.format('YYYY-MM-DD'));
    const key = day.format('YYYY-MM-DD');
    setPending((c) => ({ ...c, [key]: !dayValue(key) }));
  };

  if (yearLoading || !year) return <div>loading</div>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateCalendar
        referenceDate={dayjs(year.starts_on)}
        minDate={dayjs(year.starts_on)}
        maxDate={dayjs(year.ends_on)}
        loading={loading}
        onMonthChange={(month) => setViewMonth(month as Dayjs)}
        onChange={(day) => handleDayClick(day as Dayjs)}
        slots={{ day: CustomDay }}
      />
    </LocalizationProvider>
  );
};

describe('debug5', () => {
  it('fires onChange', async () => {
    renderWithTheme(<Harness />);
    const day12 = await screen.findByRole('gridcell', { name: '12' });
    await user.click(day12);
  });
});
