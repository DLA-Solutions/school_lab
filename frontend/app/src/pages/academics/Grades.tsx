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
  GradeBook,
  fetchGradeBook,
  listSchoolClasses,
  listSubjects,
  saveGradeBookEntry,
} from 'services/academicsApi';
import { SchoolClass, Subject } from 'types/academics';
import { schoolClassLabel } from 'utils/schoolClassLabel';

/** How long a cell waits after the last keystroke before it saves itself. */
const AUTOSAVE_DELAY = 600;

type CellState = 'idle' | 'saving' | 'saved' | 'error';

const cellKey = (studentId: number, periodId: number, componentId: number) =>
  `${studentId}:${periodId}:${componentId}`;

/**
 * The mark sheet: the students of one class down, the year's periods across — each period split
 * into its own named components (P1, P2, a general work grade, and so on; however many the school
 * set up, not a fixed count).
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
  // Teacher-scoped: the dropdowns only offer what this teacher actually teaches. Other staff
  // roles see the unrestricted listing, same as before.
  const isTeacher = school?.role === 'teacher';

  // The chosen lesson lives in the URL, so a teacher can come back to the same sheet.
  const [searchParams, setSearchParams] = useSearchParams();
  const classId = searchParams.get('school_class_id') ?? '';
  const subjectId = searchParams.get('subject_id') ?? '';

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [book, setBook] = useState<GradeBook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Held apart from the book: the input shows what was typed, the book holds what was saved.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Record<string, CellState>>({});

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    const loadOptions = async () => {
      try {
        const [classesResponse, subjectsResponse] = await Promise.all([
          listSchoolClasses(schoolId, { mine: isTeacher }),
          listSubjects(schoolId, 1, undefined, isTeacher),
        ]);
        setClasses(classesResponse.data);
        setSubjects(subjectsResponse.data);
      } catch {
        setClasses([]);
        setSubjects([]);
      }
    };

    loadOptions();
  }, [schoolId, isTeacher]);

  const load = useCallback(async () => {
    if (!schoolId || !classId || !subjectId) {
      setBook(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      setBook(await fetchGradeBook(schoolId, Number(classId), Number(subjectId)));
      setDrafts({});
      setStates({});
    } catch (err) {
      setBook(null);
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
    async (studentId: number, periodId: number, componentId: number, raw: string) => {
      if (!schoolId || !classId) {
        return;
      }

      const key = cellKey(studentId, periodId, componentId);
      // An emptied cell is stored as empty rather than as a zero: it means "not given yet".
      const trimmed = raw.trim();
      const value = trimmed === '' ? null : Number(trimmed.replace(',', '.'));

      if (value !== null && (Number.isNaN(value) || value < 0 || value > 10)) {
        setStates((current) => ({ ...current, [key]: 'error' }));
        return;
      }

      setStates((current) => ({ ...current, [key]: 'saving' }));

      try {
        await saveGradeBookEntry(schoolId, Number(classId), {
          studentId,
          academicPeriodId: periodId,
          evaluationComponentId: componentId,
          value,
        });
        setStates((current) => ({ ...current, [key]: 'saved' }));
      } catch {
        setStates((current) => ({ ...current, [key]: 'error' }));
      }
    },
    [schoolId, classId],
  );

  // One timer per cell, restarted on each keystroke: the mark is written once typing settles
  // rather than on every character.
  useEffect(() => {
    const timers = Object.entries(drafts).map(([key, value]) => {
      const [studentId, periodId, componentId] = key.split(':').map(Number);

      return window.setTimeout(() => save(studentId, periodId, componentId, value), AUTOSAVE_DELAY);
    });

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [drafts, save]);

  const chosen = useMemo(() => Boolean(classId) && Boolean(subjectId), [classId, subjectId]);

  const cellValue = (
    studentId: number,
    periodId: number,
    componentId: number,
    saved: number | null | undefined,
  ) => {
    const key = cellKey(studentId, periodId, componentId);

    return drafts[key] ?? (saved === null || saved === undefined ? '' : String(saved).replace('.', ','));
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
        ) : !book || book.students.length === 0 ? (
          <EmptyState
            title={t('grades.empty.title')}
            description={t('grades.empty.description')}
            headingLevel={2}
          />
        ) : book.periods.length === 0 ? (
          // The book only marks the periods of the class's own year. When that year has none set
          // up there is nothing to mark, and saying so beats a grid with a single empty column.
          <EmptyState
            title={t('grades.noPeriods.title', { year: book.context.year })}
            description={t('grades.noPeriods.description', { year: book.context.year })}
            headingLevel={2}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ width: 1, overflowX: 'auto' }}>
            {/* The class and subject are chosen in dropdowns above and the year is implied by the
                class, so without this the teacher stares at a wall of numbers with nothing on
                screen confirming whose year they belong to. */}
            <Typography variant="subtitle2" mb={0.5}>
              {t('grades.context', {
                subject: book.context.subject_name,
                schoolClass: book.context.school_class_label,
              })}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              {t('grades.autosaveHint')}
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell rowSpan={2}>{t('common.student')}</TableCell>
                  {book.periods.map((period) => (
                    // One spanning header per period, so "1º trimestre" reads as the group that
                    // owns the P1 / P2 / Trabalho columns under it, rather than three loose ones.
                    <TableCell
                      key={period.id}
                      align="center"
                      colSpan={Math.max(period.components.length, 1)}
                    >
                      {period.name}
                      {period.closed && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('grades.closed')}
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  {book.periods.flatMap((period) =>
                    period.components.map((component) => (
                      <TableCell key={`${period.id}:${component.id}`} align="center">
                        <Typography variant="caption" color="text.secondary">
                          {component.name}
                        </Typography>
                      </TableCell>
                    )),
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {book.students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.name}</TableCell>
                    {book.periods.flatMap((period) =>
                      period.components.map((component) => {
                        const key = cellKey(student.id, period.id, component.id);
                        const state = states[key];
                        const saved = student.entries[period.id]?.[component.id] ?? null;

                        return (
                          <TableCell key={key} align="center">
                            <Stack direction="row" gap={0.5} alignItems="center">
                              <TextField
                                // Labelled per cell: a grid of bare inputs is unreadable to a
                                // screen reader, which cannot see the row and column headers.
                                inputProps={{
                                  'aria-label': t('grades.cellAria', {
                                    student: student.name,
                                    period: period.name,
                                    component: component.name,
                                  }),
                                  inputMode: 'decimal',
                                }}
                                value={cellValue(student.id, period.id, component.id, saved)}
                                onChange={(e) =>
                                  setDrafts((current) => ({ ...current, [key]: e.target.value }))
                                }
                                disabled={period.closed}
                                error={state === 'error'}
                                variant="filled"
                                size="small"
                                sx={{ width: 76 }}
                              />
                              <Box sx={{ width: 16, display: 'flex', alignItems: 'center' }}>
                                {stateIcon(state)}
                              </Box>
                            </Stack>
                          </TableCell>
                        );
                      }),
                    )}
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
