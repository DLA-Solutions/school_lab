import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { DataTable, EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import MyIncidentPreviewDialog from 'components/sections/academics/MyIncidentPreviewDialog';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import { listAllMyChildIncidents } from 'services/incidentsApi';
import { listMyStudents } from 'services/studentsApi';
import { Incident } from 'types/incidents';
import { Student } from 'types/student';

/**
 * "Ata" (BC7, `docs/prds/academic/incidents.md`) as a family reads it — every published,
 * guardian-visible incident about any of the guardian's own children, merged into one list
 * rather than stacked per child (`MyHealthRecords.tsx`'s pattern): with a date range and a
 * student picker, the point of this screen is comparing atas across children, which a per-child
 * section layout would make harder, not easier.
 *
 * No create/approve/publish here — those are staff-only actions
 * (`IncidentPolicy#create?`/`#approve?`/`#publish?`); a guardian only ever reads.
 */
const MyAtas = () => {
  const { t } = useTranslation();
  const membership = useGuardianSchool();
  const schoolId = membership?.school_id ?? null;

  const [students, setStudents] = useState<Student[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewing, setPreviewing] = useState<Incident | null>(null);

  const [studentFilter, setStudentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listMyStudents(schoolId);
      setStudents(response.data);

      // One unreadable child's atas should not hide the rest of the family's list.
      const rows = await Promise.all(
        response.data.map((student) =>
          listAllMyChildIncidents(schoolId, student.id).catch(() => [] as Incident[]),
        ),
      );

      setIncidents(rows.flat());
    } catch (err) {
      setStudents([]);
      setIncidents([]);
      setError(err instanceof ApiError ? err.message : t('myAtas.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Client-side only: the full set is already in hand, and a family's atas never approach a
  // volume where filtering server-side would matter.
  const filteredIncidents = useMemo(
    () =>
      incidents
        .filter((incident) => !studentFilter || String(incident.student_id) === studentFilter)
        .filter((incident) => {
          const day = incident.created_at.slice(0, 10);
          if (dateFrom && day < dateFrom) {
            return false;
          }
          if (dateTo && day > dateTo) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [incidents, studentFilter, dateFrom, dateTo],
  );

  const columns = useMemo<GridColDef<Incident>[]>(
    () => [
      {
        field: 'student_name',
        headerName: t('common.student'),
        flex: 1,
        minWidth: 180,
      },
      {
        field: 'incident_type_name',
        headerName: t('myAtas.column.type'),
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'created_at',
        headerName: t('myAtas.column.date'),
        width: 130,
        renderCell: ({ row }: GridRenderCellParams<Incident>) =>
          new Date(row.created_at).toLocaleDateString(),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<Incident>) => (
          <Tooltip title={t('myAtas.preview')}>
            <IconButton
              size="small"
              aria-label={t('myAtas.previewAria', { student: row.student_name })}
              onClick={() => setPreviewing(row)}
            >
              <IconifyIcon icon="mingcute:eye-line" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [t],
  );

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('myAtas.title')} />

      <SectionCard>
        <Stack direction="column" gap={2}>
          <Typography variant="body2" color="text.secondary">
            {t('myAtas.description')}
          </Typography>

          <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
            <TextField
              id="my-atas-filter-student"
              label={t('myAtas.filter.student')}
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              variant="filled"
              size="small"
              select
              sx={{ width: 240 }}
            >
              <MenuItem value="">{t('myAtas.filter.allStudents')}</MenuItem>
              {students.map((student) => (
                <MenuItem key={student.id} value={String(student.id)}>
                  {student.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="my-atas-filter-from"
              label={t('myAtas.filter.from')}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              variant="filled"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              id="my-atas-filter-to"
              label={t('myAtas.filter.to')}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              variant="filled"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}

          {loading ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress size={28} />
            </Stack>
          ) : filteredIncidents.length === 0 && !error ? (
            <EmptyState
              title={t('myAtas.empty.title')}
              description={t('myAtas.empty.description')}
              headingLevel={2}
            />
          ) : (
            <Box sx={{ height: 594, width: 1 }}>
              <DataTable
                rows={filteredIncidents}
                columns={columns}
                loading={loading}
                disableRowSelectionOnClick
                pageSizeOptions={[25]}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                rangeLabel={({ from, to, count }) => t('common.range', { from, to, count })}
              />
            </Box>
          )}
        </Stack>
      </SectionCard>

      <MyIncidentPreviewDialog
        open={previewing !== null}
        schoolId={schoolId!}
        incident={previewing}
        onClose={() => setPreviewing(null)}
      />
    </Stack>
  );
};

export default MyAtas;
