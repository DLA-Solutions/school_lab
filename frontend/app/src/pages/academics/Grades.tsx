import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
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
import { fetchReportCardPreviewPdf } from 'services/reportCardsApi';
import { SchoolClass, Subject } from 'types/academics';
import { previewBlob, revokeBlobUrls } from 'utils/previewBlob';
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

  // The teacher-only live boletim preview (BR-RC14): which student's icon is mid-fetch, which
  // student's period menu (when the book has more than one) is open, and any failure to report.
  const [previewingStudentId, setPreviewingStudentId] = useState<number | null>(null);
  const [previewMenu, setPreviewMenu] = useState<{ studentId: number; anchorEl: HTMLElement } | null>(
    null,
  );
  const [previewError, setPreviewError] = useState('');

  // Preview tabs load the blob URL asynchronously, so it has to outlive this call — tracked here
  // and revoked only once, on unmount, rather than right after `previewBlob` opens the tab.
  const previewUrls = useRef<string[]>([]);
  useEffect(() => () => revokeBlobUrls(previewUrls.current), []);

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

  const closePreviewMenu = () => setPreviewMenu(null);

  // Fetches the live PDF for one student and pops it open in a new tab — a preview to look at,
  // not a file to keep, so `previewBlob` rather than a forced download. `academicPeriodId` is
  // either one period's id or the literal `'all'` (BR-RC14, AC-RC13) — sent on the wire exactly
  // as given, never coerced through `Number(...)`.
  const openPreview = useCallback(
    async (studentId: number, academicPeriodId: number | 'all') => {
      if (!schoolId) {
        return;
      }

      closePreviewMenu();
      setPreviewError('');
      setPreviewingStudentId(studentId);

      try {
        const blob = await fetchReportCardPreviewPdf(schoolId, studentId, academicPeriodId);
        previewUrls.current.push(previewBlob(blob));
      } catch (err) {
        setPreviewError(err instanceof ApiError ? err.message : t('grades.previewReportCard.error'));
      } finally {
        setPreviewingStudentId(null);
      }
    },
    [schoolId, t],
  );

  // One period: preview it directly. More than one: the icon needs to ask which, since the
  // preview endpoint always wants exactly one `academic_period_id`.
  const handlePreviewClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    studentId: number,
    periods: GradeBook['periods'],
  ) => {
    if (previewingStudentId !== null || periods.length === 0) {
      return;
    }

    if (periods.length === 1) {
      openPreview(studentId, periods[0].id);
      return;
    }

    setPreviewMenu({ studentId, anchorEl: event.currentTarget });
  };

  const cellValue = (
    studentId: number,
    periodId: number,
    componentId: number,
    saved: number | null | undefined,
  ) => {
    const key = cellKey(studentId, periodId, componentId);

    return drafts[key] ?? (saved === null || saved === undefined ? '' : String(saved).replace('.', ','));
  };

  // Fixed-size slot regardless of state: an icon that pops in and out would otherwise nudge the
  // input's own width (and the text inside it) as a cell goes idle -> saving -> saved.
  const stateIcon = (state: CellState | undefined) => (
    <Box
      sx={{
        width: 14,
        height: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {state === 'saving' && <CircularProgress size={10} />}
      {state === 'saved' && (
        <IconifyIcon icon="mingcute:check-line" aria-hidden width={12} height={12} />
      )}
      {state === 'error' && (
        <IconifyIcon
          icon="mingcute:alert-line"
          aria-hidden
          width={12}
          height={12}
          sx={{ color: 'error.main' }}
        />
      )}
    </Box>
  );

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
      {previewError && <ErrorBanner message={previewError} />}

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
          <Box px={2} py={2.5} sx={{ width: 1, overflowX: 'auto' }}>
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

            {/* Dense by design: up to four bimestres of three components each (12 grade columns)
                need to sit next to the roll, so every grade cell below trades the usual
                comfortable padding for a tight, deliberate footprint. The student name column is
                the deliberate exception: it is sized to show a full name (measured for real names
                up to ~50 characters, not clipped to save width), so the sheet can now need
                horizontal scroll on narrower viewports — overflowX on the wrapper above is the
                safety net for that. */}
            <Table size="small" sx={{ width: 'auto' }}>
              <TableHead>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ maxWidth: 420, px: 1 }}>
                    {t('common.student')}
                  </TableCell>
                  {book.periods.map((period) => (
                    // One spanning header per period, so "1º trimestre" reads as the group that
                    // owns the P1 / P2 / Trabalho columns under it, rather than three loose ones.
                    <TableCell
                      key={period.id}
                      align="center"
                      colSpan={Math.max(period.components.length, 1)}
                      sx={{ px: 0.5, py: 0.5 }}
                    >
                      {period.name}
                      {period.closed && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('grades.closed')}
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                  {isTeacher && (
                    // The live boletim preview (BR-RC14) is a teacher-only action; staff roles with
                    // unrestricted grade access get it through the published report card screens.
                    <TableCell rowSpan={2} align="center" sx={{ px: 1 }}>
                      {t('grades.previewReportCard.columnHeader')}
                    </TableCell>
                  )}
                </TableRow>
                <TableRow>
                  {book.periods.flatMap((period) =>
                    period.components.map((component) => (
                      <TableCell
                        key={`${period.id}:${component.id}`}
                        align="center"
                        sx={{ px: 0.5, py: 0.25 }}
                      >
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
                    <TableCell
                      // Sized to fit a real name in full (measured: Inter 0.875rem at this
                      // padding renders a realistic 50-character Portuguese name at ~360-386px,
                      // including some deliberately wide stress cases). The title attribute and
                      // the ellipsis styling below are now only a fallback for the rare outlier
                      // that still overruns this budget.
                      title={student.name}
                      sx={{
                        maxWidth: 420,
                        px: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {student.name}
                    </TableCell>
                    {book.periods.flatMap((period) =>
                      period.components.map((component) => {
                        const key = cellKey(student.id, period.id, component.id);
                        const state = states[key];
                        const saved = student.entries[period.id]?.[component.id] ?? null;

                        return (
                          <TableCell key={key} align="center" sx={{ px: 0.25, py: 0.5 }}>
                            {/* The state icon overlays the input's own corner instead of sitting
                                in an endAdornment slot: an adornment is a flex sibling of the
                                input and steals width from it, which at this column width left
                                almost nothing for the digits themselves. pointerEvents: 'none'
                                keeps it from ever stealing a click meant for the field. */}
                            <Box sx={{ position: 'relative', display: 'inline-block' }}>
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
                                hiddenLabel
                                value={cellValue(student.id, period.id, component.id, saved)}
                                onChange={(e) =>
                                  setDrafts((current) => ({ ...current, [key]: e.target.value }))
                                }
                                disabled={period.closed}
                                error={state === 'error'}
                                variant="filled"
                                size="small"
                                sx={{
                                  width: 56,
                                  '& .MuiFilledInput-input': {
                                    textAlign: 'center',
                                    px: 0.5,
                                    py: 0.75,
                                    fontSize: '0.8125rem',
                                  },
                                }}
                              />
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 2,
                                  right: 2,
                                  pointerEvents: 'none',
                                }}
                              >
                                {stateIcon(state)}
                              </Box>
                            </Box>
                          </TableCell>
                        );
                      }),
                    )}
                    {isTeacher && (
                      <TableCell align="center" sx={{ px: 1 }}>
                        <Tooltip title={t('grades.previewReportCard.button')}>
                          <span>
                            <IconButton
                              size="small"
                              aria-label={t('grades.previewReportCard.aria', {
                                student: student.name,
                              })}
                              onClick={(e) => handlePreviewClick(e, student.id, book.periods)}
                              disabled={previewingStudentId !== null}
                            >
                              {previewingStudentId === student.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <IconifyIcon icon="mingcute:eye-line" width={16} height={16} />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* One menu, positioned against whichever row's icon opened it — the preview itself
                always wants exactly one academic_period_id, so with more than one period the
                teacher has to pick before the request goes out. */}
            <Menu anchorEl={previewMenu?.anchorEl ?? null} open={Boolean(previewMenu)} onClose={closePreviewMenu}>
              <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block' }}>
                {t('grades.previewReportCard.periodMenu.label')}
              </Typography>
              {/* A different kind of choice from the periods below it — the combined, every-period
                  PDF (BR-RC14, AC-RC13) rather than one more period — so it sits apart, set off by
                  the divider rather than folded into the list as if it were just another term. */}
              <MenuItem onClick={() => previewMenu && openPreview(previewMenu.studentId, 'all')}>
                {t('grades.previewReportCard.periodMenu.all')}
              </MenuItem>
              <Divider />
              {book.periods.map((period) => (
                <MenuItem
                  key={period.id}
                  onClick={() => previewMenu && openPreview(previewMenu.studentId, period.id)}
                >
                  {period.name}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}
      </SectionCard>
    </Stack>
  );
};

export default Grades;
