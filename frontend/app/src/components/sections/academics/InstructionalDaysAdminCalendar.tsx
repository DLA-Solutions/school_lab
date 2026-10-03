import { useCallback, useEffect, useState } from 'react';
import 'dayjs/locale/pt-br';
import dayjs, { Dayjs } from 'dayjs';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { EmptyState, ErrorBanner, SectionCard, SuccessBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import {
  SchoolYear,
  fetchInstructionalDays,
  getActiveSchoolYear,
  upsertInstructionalDays,
} from 'services/schoolYearsApi';

export interface InstructionalDaysAdminCalendarProps {
  schoolId: number;
  /** `manage_school_settings` gates the write; any active staff membership may read (BR-SY10). */
  canManage: boolean;
}

/**
 * BR-SY10 / UC-SY05 — the admin's day-by-day marking screen for the active school year.
 *
 * A month at a time, matching the API (`GET/PUT .../instructional_days?month=`): the calendar
 * only ever asks for the month it is currently showing, and only ever writes the days someone
 * actually clicked — everything else stays exactly as it was.
 */
const InstructionalDaysAdminCalendar = ({ schoolId, canManage }: InstructionalDaysAdminCalendarProps) => {
  const { t, locale } = useTranslation();

  const [year, setYear] = useState<SchoolYear | null>(null);
  const [yearLoading, setYearLoading] = useState(true);
  const [yearError, setYearError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setYearLoading(true);
      setYearError('');

      try {
        const activeYear = await getActiveSchoolYear(schoolId);
        if (active) {
          setYear(activeYear);
        }
      } catch (err) {
        if (active) {
          setYearError(err instanceof ApiError ? err.message : t('lessonPlans.admin.loadError'));
        }
      } finally {
        if (active) {
          setYearLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [schoolId, t]);

  // Starts on the year's own first month rather than "today" — "today" can sit outside the
  // active year's bounds, which `DateCalendar` would otherwise have to clamp on its own.
  const [viewMonth, setViewMonth] = useState<Dayjs | null>(null);

  useEffect(() => {
    setViewMonth(year ? dayjs(year.starts_on) : null);
  }, [year]);

  const [baseline, setBaseline] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  const monthKey = viewMonth?.format('YYYY-MM') ?? null;

  useEffect(() => {
    if (!year || !monthKey) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const days = await fetchInstructionalDays(schoolId, year.id, monthKey);
        if (!active) {
          return;
        }

        const map: Record<string, boolean> = {};
        days.forEach((entry) => {
          map[entry.date] = entry.instructional;
        });
        setBaseline(map);
        setPending({});
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : t('lessonPlans.admin.loadError'));
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
  }, [schoolId, year, monthKey, t]);

  const dayValue = useCallback(
    (key: string) => pending[key] ?? baseline[key] ?? false,
    [pending, baseline],
  );

  const handleDayClick = (day: Dayjs) => {
    // eslint-disable-next-line no-console
    console.log('handleDayClick', day.format('YYYY-MM-DD'), 'canManage', canManage);
    if (!canManage) {
      return;
    }

    const key = day.format('YYYY-MM-DD');
    setSavedNotice('');
    setPending((current) => {
      const next = { ...current, [key]: !dayValue(key) };
      // eslint-disable-next-line no-console
      console.log('setPending', next);
      return next;
    });
  };

  const pendingCount = Object.keys(pending).length;

  const handleSave = async () => {
    if (!year || pendingCount === 0) {
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const days = Object.entries(pending).map(([date, instructional]) => ({ date, instructional }));
      await upsertInstructionalDays(schoolId, year.id, days);
      setBaseline((current) => ({ ...current, ...pending }));
      setPending({});
      setSavedNotice(t('lessonPlans.admin.saved'));
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t('lessonPlans.admin.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // `disabled` here only ever means "outside the active year's bounds" (minDate/maxDate below) —
  // every in-bounds day stays clickable, whichever of the two states it is in.
  const AdminDay = useCallback(
    (props: PickersDayProps) => {
      const { day, disabled, outsideCurrentMonth, ...other } = props;
      const instructional = dayValue(day.format('YYYY-MM-DD'));
      // eslint-disable-next-line no-console
      console.log('AdminDay props keys', day.format('D'), Object.keys(other));

      return (
        <PickersDay
          {...other}
          day={day}
          disabled={disabled}
          outsideCurrentMonth={outsideCurrentMonth}
          sx={
            instructional && !outsideCurrentMonth
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
    },
    [dayValue],
  );

  if (yearLoading) {
    return (
      <SectionCard>
        <Stack alignItems="center" py={6}>
          <CircularProgress />
        </Stack>
      </SectionCard>
    );
  }

  if (yearError) {
    return (
      <SectionCard>
        <ErrorBanner message={yearError} />
      </SectionCard>
    );
  }

  if (!year) {
    return (
      <SectionCard>
        <EmptyState
          title={t('lessonPlans.admin.noActiveYear.title')}
          description={t('lessonPlans.admin.noActiveYear.description')}
          headingLevel={2}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <Stack direction="column" gap={2}>
        <Box>
          <Typography variant="subtitle1">{t('lessonPlans.admin.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('lessonPlans.admin.description')}
          </Typography>
          {!canManage && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              {t('lessonPlans.admin.readOnlyHint')}
            </Typography>
          )}
        </Box>

        {error && <ErrorBanner message={error} />}
        {saveError && <ErrorBanner message={saveError} />}
        {savedNotice && <SuccessBanner message={savedNotice} />}

        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          adapterLocale={locale === 'en-US' ? 'en' : 'pt-br'}
        >
          <DateCalendar
            referenceDate={dayjs(year.starts_on)}
            minDate={dayjs(year.starts_on)}
            maxDate={dayjs(year.ends_on)}
            loading={loading}
            onMonthChange={(month) => setViewMonth(month as Dayjs)}
            onChange={(day) => handleDayClick(day as Dayjs)}
            slots={{ day: AdminDay }}
          />
        </LocalizationProvider>

        <Stack direction="row" gap={2.5} alignItems="center" flexWrap="wrap">
          <Stack direction="row" gap={1} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }} />
            <Typography variant="caption">{t('lessonPlans.admin.legend.instructional')}</Typography>
          </Stack>
          <Stack direction="row" gap={1} alignItems="center">
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Typography variant="caption">
              {t('lessonPlans.admin.legend.notInstructional')}
            </Typography>
          </Stack>
        </Stack>

        {canManage && (
          <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || pendingCount === 0}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {t('lessonPlans.admin.saveChanges')}
            </Button>
            {pendingCount > 0 && (
              <Typography variant="caption" color="text.secondary">
                {t('lessonPlans.admin.pendingChanges', { count: pendingCount })}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
};

export default InstructionalDaysAdminCalendar;
