import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { Link as RouterLink } from 'react-router';
import RoutineStory from 'components/sections/communication/RoutineStory';
import { EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { listThreads } from 'services/communicationApi';
import { listMyDailyRoutines } from 'services/dailyRoutinesApi';
import paths from 'routes/paths';
import { DailyRoutine } from 'types/dailyRoutine';
import { formatCivilDate } from 'utils/civilDate';
import { communicationErrorText } from 'utils/communicationError';

/**
 * Sent Infantil days, read as a story. Children who are not Infantil never appear: the
 * school only publishes a card for those classes, and a missing card is not an empty row.
 * The reply stays on the family thread.
 */
const MyDailyRoutine = () => {
  const { t, locale } = useTranslation();
  const school = useGuardianSchool();
  const schoolId = school?.school_id ?? null;

  const [routines, setRoutines] = useState<DailyRoutine[]>([]);
  const [names, setNames] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [cards, threads] = await Promise.all([
        listMyDailyRoutines(schoolId),
        listThreads(schoolId, 'guardian'),
      ]);
      setRoutines(cards);
      setNames(new Map(threads.map((thread) => [thread.student_id, thread.student_name])));
    } catch (err) {
      setRoutines([]);
      setError(communicationErrorText(err, t, 'dailyRoutine.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.myDailyRoutine')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('myDailyRoutine.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.myDailyRoutine')} subtitle={t('myDailyRoutine.subtitle')} />
      {error && <ErrorBanner message={error} />}

      {loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress />
        </Stack>
      ) : routines.length === 0 ? (
        <SectionCard>
          <EmptyState
            title={t('myDailyRoutine.empty.title')}
            description={t('myDailyRoutine.empty.description')}
            headingLevel={2}
          />
        </SectionCard>
      ) : (
        routines.map((routine) => {
          const name = names.get(routine.student_id) ?? t('dailyRoutine.studentFallback', { id: routine.student_id });
          return (
            <SectionCard key={routine.id} title={`${name} · ${formatCivilDate(routine.date, locale)}`}>
              <Stack direction="column" gap={2}>
                <RoutineStory
                  routine={routine}
                  schoolId={school.school_id}
                  audience="guardian"
                />
                <Button
                  component={RouterLink}
                  to={`${paths.myMessages}?student_id=${routine.student_id}`}
                  variant="outlined"
                >
                  {t('dailyRoutine.reply')}
                </Button>
              </Stack>
            </SectionCard>
          );
        })
      )}
    </Stack>
  );
};

export default MyDailyRoutine;
