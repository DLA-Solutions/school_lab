import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router';
import { DataTable, EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import { listMyChildDailyRoutineEntries } from 'services/dailyRoutineApi';
import { listMyStudents } from 'services/studentsApi';
import { DailyRoutineEntry } from 'types/dailyRoutine';
import { Student } from 'types/student';

/**
 * Infant routine as a guardian reads it (UC-DR04). The list is whatever
 * `listMyChildDailyRoutineEntries` returns for one linked child — the API already
 * keeps drafts out and answers 404 for another family. Recording stays on the staff page.
 */
const MyDailyRoutine = () => {
  const { t, locale } = useTranslation();
  const membership = useGuardianSchool();
  const schoolId = membership?.school_id ?? null;
  const [searchParams, setSearchParams] = useSearchParams();

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState('');

  const [entries, setEntries] = useState<DailyRoutineEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [entriesReload, setEntriesReload] = useState(0);

  const [dateFrom, setDateFrom] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => dayjs().endOf('month').format('YYYY-MM-DD'));

  const studentQuery = searchParams.get('student');
  const explicitStudentId =
    studentQuery != null && /^\d+$/.test(studentQuery) ? Number(studentQuery) : null;
  const activeStudentId = explicitStudentId ?? (students.length === 1 ? students[0].id : null);

  const loadStudents = useCallback(async () => {
    if (!schoolId) {
      setStudents([]);
      setStudentsLoading(false);
      return;
    }

    setStudentsLoading(true);
    setStudentsError('');

    try {
      const response = await listMyStudents(schoolId);
      setStudents(response.data);
    } catch (err) {
      setStudents([]);
      setStudentsError(err instanceof ApiError ? err.message : t('myDailyRoutine.loadError'));
    } finally {
      setStudentsLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (!schoolId) {
      setEntriesLoading(false);
      return;
    }

    if (studentsLoading) {
      return;
    }

    if (activeStudentId == null) {
      setEntries([]);
      setNotFound(false);
      setEntriesError('');
      setEntriesLoading(false);
      return;
    }

    let ignore = false;
    const studentId = activeStudentId;

    setEntriesLoading(true);
    setNotFound(false);
    setEntriesError('');

    const run = async () => {
      try {
        const rows = await listMyChildDailyRoutineEntries(schoolId, studentId, {
          from: dateFrom || undefined,
          to: dateTo || undefined,
        });

        if (ignore) {
          return;
        }

        setEntries(rows);
      } catch (err) {
        if (ignore) {
          return;
        }

        setEntries([]);

        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setEntriesError(err instanceof ApiError ? err.message : t('myDailyRoutine.loadError'));
        }
      } finally {
        if (!ignore) {
          setEntriesLoading(false);
        }
      }
    };

    run();

    return () => {
      ignore = true;
    };
  }, [schoolId, studentsLoading, activeStudentId, dateFrom, dateTo, entriesReload, t]);

  const selectValue =
    activeStudentId != null && students.some((student) => student.id === activeStudentId)
      ? String(activeStudentId)
      : '';

  const selectStudent = (value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) {
        next.set('student', value);
      } else {
        next.delete('student');
      }
      return next;
    });
  };

  const formatRoutineDate = useCallback(
    (isoDate: string) => {
      const [year, month, day] = isoDate.split('-');
      if (!year || !month || !day) {
        return isoDate;
      }

      return locale === 'en-US' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
    },
    [locale],
  );

  const snackLabel = useCallback(
    (value: boolean | null) => {
      if (value === null) {
        return t('myDailyRoutine.snack.notRecorded');
      }

      return value ? t('myDailyRoutine.snack.eaten') : t('myDailyRoutine.snack.notEaten');
    },
    [t],
  );

  const columns = useMemo<GridColDef<DailyRoutineEntry>[]>(
    () => [
      {
        field: 'date',
        headerName: t('dailyRoutine.dateLabel'),
        width: 140,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<DailyRoutineEntry>) => formatRoutineDate(row.date),
      },
      {
        field: 'snack_eaten',
        headerName: t('dailyRoutine.column.snack'),
        width: 160,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<DailyRoutineEntry>) => snackLabel(row.snack_eaten),
      },
      {
        field: 'poop_count',
        headerName: t('dailyRoutine.column.poop'),
        width: 110,
        sortable: false,
        filterable: false,
      },
      {
        field: 'pee_count',
        headerName: t('dailyRoutine.column.pee'),
        width: 110,
        sortable: false,
        filterable: false,
      },
      {
        field: 'notes',
        headerName: t('dailyRoutine.column.notes'),
        flex: 1,
        minWidth: 200,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<DailyRoutineEntry>) =>
          row.notes?.trim() ? row.notes : t('common.none'),
      },
    ],
    [formatRoutineDate, snackLabel, t],
  );

  const loading = studentsLoading || entriesLoading;
  const showNoChildren =
    !loading && !studentsError && !notFound && students.length === 0 && explicitStudentId == null;
  const showChooseChild =
    !loading &&
    !studentsError &&
    !entriesError &&
    !notFound &&
    students.length > 1 &&
    explicitStudentId == null;
  const showEmpty =
    !loading &&
    !studentsError &&
    !entriesError &&
    !notFound &&
    !showNoChildren &&
    !showChooseChild &&
    entries.length === 0;
  const showTable =
    !loading && !notFound && !entriesError && !showNoChildren && !showChooseChild && entries.length > 0;

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('myDailyRoutine.title')} />

      <SectionCard>
        <Stack direction="column" gap={2}>
          <Typography variant="body2" color="text.secondary">
            {t('myDailyRoutine.description')}
          </Typography>

          <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
            <TextField
              id="my-daily-routine-student"
              label={t('myDailyRoutine.filter.student')}
              value={selectValue}
              onChange={(event) => selectStudent(event.target.value)}
              variant="filled"
              size="small"
              select
              sx={{ width: 240 }}
            >
              {selectValue === '' && (
                <MenuItem value="">{t('myDailyRoutine.filter.choose')}</MenuItem>
              )}
              {students.map((student) => (
                <MenuItem key={student.id} value={String(student.id)}>
                  {student.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="my-daily-routine-from"
              label={t('myDailyRoutine.filter.from')}
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              variant="filled"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              id="my-daily-routine-to"
              label={t('myDailyRoutine.filter.to')}
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              variant="filled"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          {studentsError && (
            <ErrorBanner
              message={studentsError}
              onRetry={loadStudents}
              retryLabel={t('common.tryAgain')}
            />
          )}
          {entriesError && (
            <ErrorBanner
              message={entriesError}
              onRetry={() => setEntriesReload((current) => current + 1)}
              retryLabel={t('common.tryAgain')}
            />
          )}

          {loading ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress size={28} />
            </Stack>
          ) : notFound ? (
            <EmptyState
              title={t('myDailyRoutine.notFound.title')}
              description={t('myDailyRoutine.notFound.description')}
              headingLevel={2}
            />
          ) : showNoChildren ? (
            <EmptyState
              title={t('myDailyRoutine.noChildren.title')}
              description={t('myDailyRoutine.noChildren.description')}
              headingLevel={2}
            />
          ) : showChooseChild ? (
            <EmptyState
              title={t('myDailyRoutine.chooseChild.title')}
              description={t('myDailyRoutine.chooseChild.description')}
              headingLevel={2}
            />
          ) : showEmpty ? (
            <EmptyState
              title={t('myDailyRoutine.empty.title')}
              description={t('myDailyRoutine.empty.description')}
              headingLevel={2}
            />
          ) : showTable ? (
            <Box sx={{ height: 594, width: 1 }}>
              <DataTable
                rows={entries}
                columns={columns}
                loading={loading}
                disableRowSelectionOnClick
                pageSizeOptions={[25]}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                rangeLabel={({ from, to, count }) => t('common.range', { from, to, count })}
              />
            </Box>
          ) : null}
        </Stack>
      </SectionCard>
    </Stack>
  );
};

export default MyDailyRoutine;
