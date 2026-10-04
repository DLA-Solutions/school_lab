import { Fragment, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
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
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { listSchoolClasses } from 'services/academicsApi';
import {
  fetchDailyRoutineRoster,
  sendDailyRoutineEntry,
  upsertDailyRoutineEntry,
} from 'services/dailyRoutineApi';
import { SchoolClass } from 'types/academics';
import { DailyRoutineRosterRow, DailyRoutineUpsertPayload } from 'types/dailyRoutine';
import { schoolClassLabel } from 'utils/schoolClassLabel';

/** How long a notes field waits after the last keystroke before it saves itself. */
const NOTES_AUTOSAVE_DELAY = 600;

/**
 * BC11 "Rotina Infantil" (`docs/prds/academic/routine.md`) — the daily roster: every student in
 * one class on one date, with snack/diaper counts and free-text notes recorded one tap at a time.
 *
 * Every icon tap or notes edit is its own immediate upsert (UC-DR02, BR-DR04) — there is no "save
 * draft" button, matching the API: each call leaves `status` as `draft` unless the row is already
 * `sent`. A dedicated "Enviar" per row (UC-DR03) is the only action that notifies guardians, and
 * is intentionally still clickable once already `sent` — the API is idempotent (BR-DR04/AC-DR04).
 *
 * Class listing mirrors `LessonPlanCalendar`/`Grades`: `mine: isTeacher` narrows to the teacher's
 * own assigned classes (BR-DR07); staff see every class in the school.
 */
const DailyRoutine = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  const isTeacher = school?.role === 'teacher';

  const [searchParams, setSearchParams] = useSearchParams();
  const classId = searchParams.get('school_class_id') ?? '';
  const date = searchParams.get('date') || dayjs().format('YYYY-MM-DD');

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [optionsError, setOptionsError] = useState('');

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    const loadClasses = async () => {
      try {
        const response = await listSchoolClasses(schoolId, { mine: isTeacher });
        setClasses(response.data);
      } catch (err) {
        setClasses([]);
        setOptionsError(
          err instanceof ApiError ? err.message : t('dailyRoutine.optionsLoadError'),
        );
      }
    };

    loadClasses();
  }, [schoolId, isTeacher, t]);

  const [roster, setRoster] = useState<DailyRoutineRosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId || !classId) {
      setRoster([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const rows = await fetchDailyRoutineRoster(schoolId, Number(classId), date);
      setRoster(rows);
    } catch (err) {
      setRoster([]);
      setError(err instanceof ApiError ? err.message : t('dailyRoutine.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, classId, date, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Held apart from the roster: the field shows what was typed, the roster holds what was saved.
  const [notesDrafts, setNotesDrafts] = useState<Record<number, string>>({});
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<number>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    setNotesDrafts({});
    setRowErrors({});
  }, [classId, date]);

  const handleUpsert = useCallback(
    async (studentId: number, patch: Omit<DailyRoutineUpsertPayload, 'student_id' | 'date'>) => {
      if (!schoolId || !date) {
        return;
      }

      setSavingIds((current) => new Set(current).add(studentId));
      setRowErrors((current) => ({ ...current, [studentId]: '' }));

      try {
        const entry = await upsertDailyRoutineEntry(schoolId, {
          student_id: studentId,
          date,
          ...patch,
        });
        setRoster((current) =>
          current.map((row) =>
            row.student_id === studentId ? { ...row, daily_routine_entry: entry } : row,
          ),
        );
      } catch (err) {
        setRowErrors((current) => ({
          ...current,
          [studentId]: err instanceof ApiError ? err.message : t('dailyRoutine.upsertError'),
        }));
      } finally {
        setSavingIds((current) => {
          const next = new Set(current);
          next.delete(studentId);
          return next;
        });
      }
    },
    [schoolId, date, t],
  );

  // One timer per student's notes, restarted on each keystroke: the note is written once typing
  // settles rather than on every character — same pattern as Grades.tsx's mark cells.
  useEffect(() => {
    const timers = Object.entries(notesDrafts).map(([studentId, value]) =>
      window.setTimeout(() => handleUpsert(Number(studentId), { notes: value }), NOTES_AUTOSAVE_DELAY),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [notesDrafts, handleUpsert]);

  const handleSend = useCallback(
    async (row: DailyRoutineRosterRow) => {
      if (!schoolId || !row.daily_routine_entry) {
        return;
      }

      const entryId = row.daily_routine_entry.id;
      setSendingIds((current) => new Set(current).add(row.student_id));
      setRowErrors((current) => ({ ...current, [row.student_id]: '' }));

      try {
        const entry = await sendDailyRoutineEntry(schoolId, entryId);
        setRoster((current) =>
          current.map((r) =>
            r.student_id === row.student_id ? { ...r, daily_routine_entry: entry } : r,
          ),
        );
      } catch (err) {
        setRowErrors((current) => ({
          ...current,
          [row.student_id]: err instanceof ApiError ? err.message : t('dailyRoutine.sendError'),
        }));
      } finally {
        setSendingIds((current) => {
          const next = new Set(current);
          next.delete(row.student_id);
          return next;
        });
      }
    },
    [schoolId, t],
  );

  // One click replays the same per-student upsert used by a single icon tap, across the whole
  // roster (BR-DR04) — no new semantic, just a convenience loop. Kept sequential-looking via
  // Promise.allSettled rather than three independently-triggerable runs, since three concurrent
  // bulk passes over the same rows would race on `savingIds`/`roster` state.
  const [bulkField, setBulkField] = useState<'snack' | 'poop' | 'pee' | null>(null);

  const handleBulkMark = useCallback(
    async (field: 'snack' | 'poop' | 'pee') => {
      setBulkField(field);
      try {
        await Promise.allSettled(
          roster.map((row) => {
            const entry = row.daily_routine_entry;
            if (field === 'snack') {
              return handleUpsert(row.student_id, { snack_eaten: true });
            }
            if (field === 'poop') {
              return handleUpsert(row.student_id, { poop_count: (entry?.poop_count ?? 0) + 1 });
            }
            return handleUpsert(row.student_id, { pee_count: (entry?.pee_count ?? 0) + 1 });
          }),
        );
      } finally {
        setBulkField(null);
      }
    },
    [roster, handleUpsert],
  );

  // Separate from `bulkField` (mark-all touches fields, this touches send) so the two can be
  // cross-disabled against each other below — both loop over the same rows via Promise.allSettled.
  const [sendingAll, setSendingAll] = useState(false);

  const handleSendAll = useCallback(async () => {
    setSendingAll(true);
    try {
      await Promise.allSettled(
        roster
          .filter((row) => row.daily_routine_entry?.status === 'draft')
          .map((row) => handleSend(row)),
      );
    } finally {
      setSendingAll(false);
    }
  }, [roster, handleSend]);

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

  const chosen = Boolean(classId);

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.dailyRoutine')} />
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
      <PageHeader title={t('nav.dailyRoutine')} />

      <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
        <TextField
          id="daily-routine-class"
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
          id="daily-routine-date"
          label={t('dailyRoutine.dateLabel')}
          type="date"
          value={date}
          onChange={(e) => setFilter('date', e.target.value)}
          variant="filled"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 180 }}
        />
      </Stack>

      {optionsError && <ErrorBanner message={optionsError} />}
      {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}

      <SectionCard padding={0}>
        {!chosen ? (
          <EmptyState
            title={t('dailyRoutine.choose.title')}
            description={t('dailyRoutine.choose.description')}
            headingLevel={2}
          />
        ) : loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        ) : roster.length === 0 ? (
          <EmptyState
            title={t('dailyRoutine.empty.title')}
            description={t('dailyRoutine.empty.description')}
            headingLevel={2}
          />
        ) : (
          <Box px={2} py={2.5} sx={{ width: 1, overflowX: 'auto' }}>
            <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
              <Button
                size="small"
                variant="outlined"
                disabled={bulkField !== null || sendingAll || roster.length === 0}
                onClick={() => handleBulkMark('snack')}
                startIcon={
                  bulkField === 'snack' ? (
                    <CircularProgress size={14} />
                  ) : (
                    <IconifyIcon icon="mingcute:cookie-fill" width={16} height={16} />
                  )
                }
              >
                {t('dailyRoutine.bulk.snack')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={bulkField !== null || sendingAll || roster.length === 0}
                onClick={() => handleBulkMark('poop')}
                startIcon={
                  bulkField === 'poop' ? (
                    <CircularProgress size={14} />
                  ) : (
                    <IconifyIcon icon="mingcute:toilet-paper-fill" width={16} height={16} />
                  )
                }
              >
                {t('dailyRoutine.bulk.poop')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={bulkField !== null || sendingAll || roster.length === 0}
                onClick={() => handleBulkMark('pee')}
                startIcon={
                  bulkField === 'pee' ? (
                    <CircularProgress size={14} />
                  ) : (
                    <IconifyIcon icon="mingcute:drop-fill" width={16} height={16} />
                  )
                }
              >
                {t('dailyRoutine.bulk.pee')}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="primary"
                disabled={
                  bulkField !== null ||
                  sendingAll ||
                  !roster.some((row) => row.daily_routine_entry?.status === 'draft')
                }
                onClick={handleSendAll}
                startIcon={
                  sendingAll ? (
                    <CircularProgress size={14} />
                  ) : (
                    <IconifyIcon icon="mingcute:send-plane-line" width={16} height={16} />
                  )
                }
              >
                {t('dailyRoutine.bulk.sendAll')}
              </Button>
            </Stack>
            <Table size="small" sx={{ width: 'auto' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ maxWidth: 320, px: 1 }}>{t('common.student')}</TableCell>
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    {t('dailyRoutine.column.snack')}
                  </TableCell>
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    {t('dailyRoutine.column.poop')}
                  </TableCell>
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    {t('dailyRoutine.column.pee')}
                  </TableCell>
                  <TableCell sx={{ px: 1, minWidth: 220 }}>
                    {t('dailyRoutine.column.notes')}
                  </TableCell>
                  <TableCell align="center" sx={{ px: 1 }}>
                    {t('dailyRoutine.column.status')}
                  </TableCell>
                  <TableCell align="center" sx={{ px: 1 }}>
                    {t('dailyRoutine.column.send')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roster.map((row) => {
                  const entry = row.daily_routine_entry;
                  const snackEaten = entry?.snack_eaten ?? null;
                  const poopCount = entry?.poop_count ?? 0;
                  const peeCount = entry?.pee_count ?? 0;
                  const busy = savingIds.has(row.student_id);
                  const sendBusy = sendingIds.has(row.student_id);
                  const sent = entry?.status === 'sent';
                  const rowError = rowErrors[row.student_id];

                  return (
                    <Fragment key={row.student_id}>
                      <TableRow>
                        <TableCell
                          title={row.student_name}
                          sx={{
                            maxWidth: 320,
                            px: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.student_name}
                        </TableCell>

                        <TableCell align="center" sx={{ px: 0.5 }}>
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <IconButton
                              size="small"
                              aria-label={t('dailyRoutine.snackYesAria', {
                                student: row.student_name,
                              })}
                              aria-pressed={snackEaten === true}
                              disabled={busy}
                              onClick={() => handleUpsert(row.student_id, { snack_eaten: true })}
                              sx={{ color: snackEaten === true ? 'success.main' : 'text.disabled' }}
                            >
                              <IconifyIcon icon="mingcute:cookie-fill" width={18} height={18} />
                            </IconButton>
                            <IconButton
                              size="small"
                              aria-label={t('dailyRoutine.snackNoAria', {
                                student: row.student_name,
                              })}
                              aria-pressed={snackEaten === false}
                              disabled={busy}
                              onClick={() => handleUpsert(row.student_id, { snack_eaten: false })}
                              sx={{ color: snackEaten === false ? 'error.main' : 'text.disabled' }}
                            >
                              <IconifyIcon icon="mingcute:close-circle-fill" width={18} height={18} />
                            </IconButton>
                          </Stack>
                        </TableCell>

                        <TableCell align="center" sx={{ px: 0.5 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                            <IconButton
                              size="small"
                              aria-label={t('dailyRoutine.poopAria', {
                                student: row.student_name,
                                count: poopCount,
                              })}
                              disabled={busy}
                              onClick={() =>
                                handleUpsert(row.student_id, { poop_count: poopCount + 1 })
                              }
                              sx={{ color: poopCount > 0 ? 'primary.main' : 'text.disabled' }}
                            >
                              <IconifyIcon icon="mingcute:toilet-paper-fill" width={18} height={18} />
                            </IconButton>
                            <Typography variant="body2" sx={{ minWidth: 16, textAlign: 'center' }}>
                              {poopCount}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell align="center" sx={{ px: 0.5 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                            <IconButton
                              size="small"
                              aria-label={t('dailyRoutine.peeAria', {
                                student: row.student_name,
                                count: peeCount,
                              })}
                              disabled={busy}
                              onClick={() => handleUpsert(row.student_id, { pee_count: peeCount + 1 })}
                              sx={{ color: peeCount > 0 ? 'secondary.main' : 'text.disabled' }}
                            >
                              <IconifyIcon icon="mingcute:drop-fill" width={18} height={18} />
                            </IconButton>
                            <Typography variant="body2" sx={{ minWidth: 16, textAlign: 'center' }}>
                              {peeCount}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell sx={{ px: 1, minWidth: 220 }}>
                          <TextField
                            fullWidth
                            hiddenLabel
                            multiline
                            minRows={1}
                            maxRows={3}
                            variant="filled"
                            size="small"
                            placeholder={t('dailyRoutine.notesPlaceholder')}
                            inputProps={{
                              'aria-label': t('dailyRoutine.notesAria', {
                                student: row.student_name,
                              }),
                            }}
                            value={notesDrafts[row.student_id] ?? entry?.notes ?? ''}
                            onChange={(e) =>
                              setNotesDrafts((current) => ({
                                ...current,
                                [row.student_id]: e.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </TableCell>

                        <TableCell align="center" sx={{ px: 1 }}>
                          {entry ? (
                            <SemanticChip
                              variant={sent ? 'success' : 'warning'}
                              label={t(`dailyRoutine.status.${entry.status}`)}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {t('common.none')}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell align="center" sx={{ px: 1 }}>
                          <Tooltip
                            title={
                              sent
                                ? t('dailyRoutine.resendAria', { student: row.student_name })
                                : t('dailyRoutine.sendAria', { student: row.student_name })
                            }
                          >
                            <span>
                              <Button
                                size="small"
                                variant={sent ? 'text' : 'outlined'}
                                color={sent ? 'success' : 'primary'}
                                disabled={!entry || sendBusy}
                                onClick={() => handleSend(row)}
                                startIcon={
                                  sendBusy ? (
                                    <CircularProgress size={14} />
                                  ) : (
                                    <IconifyIcon
                                      icon={sent ? 'mingcute:check-circle-fill' : 'mingcute:send-plane-line'}
                                      width={16}
                                      height={16}
                                    />
                                  )
                                }
                              >
                                {sent ? t('dailyRoutine.sent') : t('dailyRoutine.send')}
                              </Button>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                      {rowError && (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ py: 0.5, border: 0 }}>
                            <Typography variant="caption" color="error.main">
                              {rowError}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionCard>
    </Stack>
  );
};

export default DailyRoutine;
