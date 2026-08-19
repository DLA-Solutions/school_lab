import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import {
  GradeSheet,
  fetchGradeSheet,
  listSchoolClasses,
  listSubjects,
  saveGradeCell,
} from 'services/academicsApi';
import { SchoolClass, Subject } from 'types/academics';
import { schoolClassLabel } from 'utils/schoolClassLabel';

/** How long a cell waits after the last keystroke before it saves itself. */
const AUTOSAVE_DELAY = 600;

type CellState = 'idle' | 'saving' | 'saved' | 'error';

const cellKey = (studentId: number, periodId: number) => `${studentId}:${periodId}`;

/**
 * The mark sheet: the students of one class down, the year's periods across.
 *
 * Every cell saves itself once typing settles — a teacher marking thirty children should not lose
 * the lot because they closed the tab, and a single "save" at the end is exactly the button people
 * forget. Each cell reports its own state, so a failure is attached to the mark that failed rather
 * than to the sheet as a whole.
 */
const Grades = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  // The chosen lesson lives in the URL, so a teacher can come back to the same sheet.
  const [searchParams, setSearchParams] = useSearchParams();
  const classId = searchParams.get('school_class_id') ?? '';
  const subjectId = searchParams.get('subject_id') ?? '';

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Held apart from the sheet: the input shows what was typed, the sheet holds what was saved.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Record<string, CellState>>({});

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    const loadOptions = async () => {
      try {
        const [classesResponse, subjectsResponse] = await Promise.all([
          listSchoolClasses(schoolId),
          listSubjects(schoolId),
        ]);
        setClasses(classesResponse.data);
        setSubjects(subjectsResponse.data);
      } catch {
        setClasses([]);
        setSubjects([]);
      }
    };

    loadOptions();
  }, [schoolId]);

  const load = useCallback(async () => {
    if (!schoolId || !classId || !subjectId) {
      setSheet(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      setSheet(await fetchGradeSheet(schoolId, Number(classId), Number(subjectId)));
      setDrafts({});
      setStates({});
    } catch (err) {
      setSheet(null);
      // The API refuses a lesson the teacher is not assigned to, and says so.
      setError(err instanceof ApiError ? err.message : t('grades.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, classId, subjectId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key: string, value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  };

  const save = useCallback(
    async (studentId: number, periodId: number, raw: string) => {
      if (!schoolId) {
        return;
      }

      const key = cellKey(studentId, periodId);
      // An emptied cell is stored as empty rather than as a zero: it means "not given yet".
      const trimmed = raw.trim();
      const score = trimmed === '' ? null : Number(trimmed.replace(',', '.'));

      if (score !== null && (Number.isNaN(score) || score < 0 || score > 10)) {
        setStates((current) => ({ ...current, [key]: 'error' }));
        return;
      }

      setStates((current) => ({ ...current, [key]: 'saving' }));

      try {
        await saveGradeCell(schoolId, {
          schoolClassId: Number(classId),
          subjectId: Number(subjectId),
          studentId,
          academicPeriodId: periodId,
          score,
        });
        setStates((current) => ({ ...current, [key]: 'saved' }));
      } catch {
        setStates((current) => ({ ...current, [key]: 'error' }));
      }
    },
    [schoolId, classId, subjectId],
  );

  // One timer per cell, restarted on each keystroke: the mark is written once typing settles
  // rather than on every character.
  useEffect(() => {
    const timers = Object.entries(drafts).map(([key, value]) => {
      const [studentId, periodId] = key.split(':').map(Number);

      return window.setTimeout(() => save(studentId, periodId, value), AUTOSAVE_DELAY);
    });

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [drafts, save]);

  const chosen = useMemo(
    () => Boolean(classId) && Boolean(subjectId),
    [classId, subjectId],
  );

  const cellValue = (studentId: number, periodId: number, saved: number | null) => {
    const key = cellKey(studentId, periodId);

    return drafts[key] ?? (saved === null ? '' : String(saved).replace('.', ','));
  };

  const stateIcon = (state: CellState | undefined) => {
    if (state === 'saving') return <CircularProgress size={12} />;
    if (state === 'saved') return <IconifyIcon icon="mingcute:check-line" aria-hidden />;
    if (state === 'error') return <IconifyIcon icon="mingcute:alert-line" aria-hidden />;
    return null;
  };

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.grades')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('classes.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.grades')} />

      <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
        <TextField
          id="grades-class"
          label={t('common.class')}
          value={classId}
          onChange={(e) => setFilter('school_class_id', e.target.value)}
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
        <TextField
          id="grades-subject"
          label={t('common.subject')}
          value={subjectId}
          onChange={(e) => setFilter('subject_id', e.target.value)}
          variant="filled"
          size="small"
          select
          sx={{ width: 200 }}
        >
          {subjects.map((subject) => (
            <MenuItem key={subject.id} value={String(subject.id)}>
              {subject.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!chosen ? (
          <EmptyState
            title={t('grades.choose.title')}
            description={t('grades.choose.description')}
            headingLevel={2}
          />
        ) : loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        ) : !sheet || sheet.students.length === 0 ? (
          <EmptyState
            title={t('grades.empty.title')}
            description={t('grades.empty.description')}
            headingLevel={2}
          />
        ) : sheet.periods.length === 0 ? (
          // The sheet only marks the periods of the class's own year. When that year has none set
          // up there is nothing to mark, and saying so beats a grid with a single empty column.
          <EmptyState
            title={t('grades.noPeriods.title', { year: sheet.context.year })}
            description={t('grades.noPeriods.description', { year: sheet.context.year })}
            headingLevel={2}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ width: 1, overflowX: 'auto' }}>
            {/* The class and subject are chosen in dropdowns above and the year is implied by the
                class, so without this the teacher stares at a wall of numbers with nothing on
                screen confirming whose year they belong to. */}
            <Typography variant="subtitle2" mb={0.5}>
              {t('grades.context', {
                subject: sheet.context.subject_name,
                schoolClass: sheet.context.school_class_label,
              })}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              {t('grades.autosaveHint')}
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.student')}</TableCell>
                  {sheet.periods.map((period) => (
                    <TableCell key={period.id} align="center">
                      {period.name}
                      {period.closed && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('grades.closed')}
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sheet.students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.name}</TableCell>
                    {sheet.periods.map((period) => {
                      const key = cellKey(student.id, period.id);
                      const state = states[key];

                      return (
                        <TableCell key={period.id} align="center">
                          <Stack direction="row" gap={0.5} alignItems="center">
                            <TextField
                              // Labelled per cell: a grid of bare inputs is unreadable to a
                              // screen reader, which cannot see the row and column headers.
                              inputProps={{
                                'aria-label': t('grades.cellAria', {
                                  student: student.name,
                                  period: period.name,
                                }),
                                inputMode: 'decimal',
                              }}
                              value={cellValue(student.id, period.id, student.scores[period.id])}
                              onChange={(e) =>
                                setDrafts((current) => ({ ...current, [key]: e.target.value }))
                              }
                              disabled={period.closed}
                              error={state === 'error'}
                              variant="filled"
                              size="small"
                              sx={{ width: 84 }}
                            />
                            <Box sx={{ width: 16, display: 'flex', alignItems: 'center' }}>
                              {stateIcon(state)}
                            </Box>
                          </Stack>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionCard>
    </Stack>
  );
};

export default Grades;
