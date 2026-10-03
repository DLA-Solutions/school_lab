import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import 'dayjs/locale/pt-br';
import dayjs, { Dayjs } from 'dayjs';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { EmptyState, ErrorBanner, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { listSchoolClasses } from 'services/academicsApi';
import { fetchClassInstructionalDays } from 'services/lessonPlansApi';
import { SchoolClass } from 'types/academics';
import { ClassInstructionalDays } from 'types/lessonPlans';
import { schoolClassLabel } from 'utils/schoolClassLabel';
import LessonPlanFormDialog from './LessonPlanFormDialog';

export interface LessonPlanCalendarProps {
  schoolId: number;
}

/** A day that is not in the instructional set renders exactly like every MUI-disabled day. */
const InstructionalDay = (props: PickersDayProps) => {
  const { day, disabled, outsideCurrentMonth, ...other } = props;

  return (
    <PickersDay
      {...other}
      day={day}
      disabled={disabled}
      outsideCurrentMonth={outsideCurrentMonth}
      sx={
        !disabled && !outsideCurrentMonth
          ? {
              bgcolor: 'success.main',
              color: 'success.contrastText',
              fontWeight: 600,
              '&:hover': { bgcolor: 'success.dark' },
            }
          : undefined
      }
    />
  );
};

/**
 * UC-LP01/UC-LP02 — teacher side: pick a class, see its year as a calendar where only the days
 * the admin marked instructional (BR-SY10) are clickable, and write a plan for one from a popup.
 */
const LessonPlanCalendar = ({ schoolId }: LessonPlanCalendarProps) => {
  const { t, locale } = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();
  const classId = searchParams.get('school_class_id') ?? '';

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [optionsError, setOptionsError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await listSchoolClasses(schoolId, { mine: true });
        setClasses(response.data);
      } catch (err) {
        setClasses([]);
        setOptionsError(err instanceof ApiError ? err.message : t('lessonPlans.optionsLoadError'));
      }
    };

    load();
  }, [schoolId, t]);

  const selectedClass = useMemo(
    () => classes.find((schoolClass) => String(schoolClass.id) === classId) ?? null,
    [classes, classId],
  );

  const [calendar, setCalendar] = useState<ClassInstructionalDays | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!classId) {
      setCalendar(null);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchClassInstructionalDays(schoolId, Number(classId));
        if (active) {
          setCalendar(data);
        }
      } catch (err) {
        if (active) {
          setCalendar(null);
          setError(err instanceof ApiError ? err.message : t('lessonPlans.loadError'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [schoolId, classId, t]);

  const instructionalDates = useMemo(
    () => new Set(calendar?.instructional_dates ?? []),
    [calendar],
  );

  const shouldDisableDate = useCallback(
    (day: Dayjs) => !instructionalDates.has(day.format('YYYY-MM-DD')),
    [instructionalDates],
  );

  const [dialogDate, setDialogDate] = useState<string | null>(null);

  const handleDayClick = (day: Dayjs) => setDialogDate(day.format('YYYY-MM-DD'));
  const handleDialogClose = () => setDialogDate(null);
  const handleSaved = () => setDialogDate(null);

  const setClassFilter = (value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) {
          next.set('school_class_id', value);
        } else {
          next.delete('school_class_id');
        }
        return next;
      },
      { replace: true },
    );
  };

  return (
    <Stack direction="column" gap={3.5}>
      <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
        <TextField
          id="lesson-plan-class"
          label={t('common.class')}
          value={classId}
          onChange={(e) => setClassFilter(e.target.value)}
          variant="filled"
          size="small"
          select
          sx={{ width: 320 }}
        >
          {classes.map((schoolClass) => (
            <MenuItem key={schoolClass.id} value={String(schoolClass.id)}>
              {schoolClassLabel(schoolClass, t)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {optionsError && <ErrorBanner message={optionsError} />}
      {error && <ErrorBanner message={error} />}

      <SectionCard>
        {!classId ? (
          <EmptyState
            title={t('lessonPlans.choose.title')}
            description={t('lessonPlans.choose.description')}
            headingLevel={2}
          />
        ) : loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        ) : !calendar ? null : (
          <Stack direction="column" gap={2}>
            <Typography variant="caption" color="text.secondary">
              {t('lessonPlans.calendar.instructionalHint')}
            </Typography>

            {instructionalDates.size === 0 && (
              <Typography variant="body2" color="text.secondary">
                {t('lessonPlans.calendar.noInstructionalDays')}
              </Typography>
            )}

            <LocalizationProvider
              dateAdapter={AdapterDayjs}
              adapterLocale={locale === 'en-US' ? 'en' : 'pt-br'}
            >
              <DateCalendar
                referenceDate={dayjs(calendar.starts_on)}
                minDate={dayjs(calendar.starts_on)}
                maxDate={dayjs(calendar.ends_on)}
                shouldDisableDate={shouldDisableDate}
                onChange={(day) => handleDayClick(day as Dayjs)}
                slots={{ day: InstructionalDay }}
              />
            </LocalizationProvider>
          </Stack>
        )}
      </SectionCard>

      {dialogDate && selectedClass && (
        <LessonPlanFormDialog
          open
          schoolId={schoolId}
          schoolClassId={selectedClass.id}
          date={dialogDate}
          subjects={selectedClass.subjects}
          onClose={handleDialogClose}
          onSaved={handleSaved}
        />
      )}
    </Stack>
  );
};

export default LessonPlanCalendar;
