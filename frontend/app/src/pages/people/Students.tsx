import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSearchParams } from 'react-router';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import AuthorizedPickupsDialog from 'components/sections/people/students/AuthorizedPickupsDialog';
import HealthRecordsDialog from 'components/sections/people/students/HealthRecordsDialog';
import StudentAcademicDialog from 'components/sections/people/students/StudentAcademicDialog';
import StudentFormDialog from 'components/sections/people/students/StudentFormDialog';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchField,
  SectionCard,
  SemanticChip,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import {
  activateStudent,
  deleteStudent,
  fetchStudentsReport,
  listStudents,
} from 'services/studentsApi';
import RegisterReportDialog from 'components/sections/people/RegisterReportDialog';
import { STUDENT_REPORT_COLUMNS, STUDENT_REPORT_DEFAULTS } from 'pages/people/studentsReport';
import { Student } from 'types/student';
import { formatCpf } from 'utils/documentNumber';
import { useDebouncedValue } from 'utils/useDebouncedValue';
import { gradeLevelLabel } from 'utils/gradeLevels';
import type { MessageKey } from 'locales';

const PAGE_SIZE = 25;

const renderCpf = ({ value }: GridRenderCellParams<Student, string>) => (
  <Typography variant="body2">{formatCpf(value)}</Typography>
);

const renderBirthDate = ({ value }: GridRenderCellParams<Student, string>) => {
  if (!value) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }

  const [year, month, day] = value.split('-');

  return <Typography variant="body2">{`${day}/${month}/${year}`}</Typography>;
};

const RELATIONSHIP_KEYS: Record<string, MessageKey> = {
  father: 'students.relationship.father',
  mother: 'students.relationship.mother',
  other: 'students.relationship.other',
};

const Students = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const debouncedSearch = useDebouncedValue(search);
  const activation = (searchParams.get('status') ?? 'active') as 'active' | 'inactive' | 'all';

  const [formOpen, setFormOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [healthFor, setHealthFor] = useState<Student | null>(null);
  const [pickupsFor, setPickupsFor] = useState<Student | null>(null);
  const [academicFor, setAcademicFor] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const renderClass = ({ row }: GridRenderCellParams<Student>) =>
    row.school_class_id ? (
      <Typography variant="body2">
        {`${gradeLevelLabel(row.grade_level)} ${row.school_class_name ?? ''}`.trim()}
      </Typography>
    ) : (
      <Typography variant="body2" color="text.secondary">
        {t('common.noClass')}
      </Typography>
    );

  const renderGuardians = ({ row }: GridRenderCellParams<Student>) =>
    row.guardians.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    ) : (
      <Stack direction="column" justifyContent="center" py={1}>
        {row.guardians.map((link) => (
          <Typography key={link.link_id} variant="caption">
            {`${t(RELATIONSHIP_KEYS[link.relationship] ?? 'students.relationship.other')}: ${link.name}`}
          </Typography>
        ))}
      </Stack>
    );

  // A place at the school is held by a signed contract, not by a row in the register — so the
  // column answers "is the paperwork done" rather than repeating what the row already shows.
  // A transfer still outranks it: that child has left, whatever their contract says.
  const renderStatus = ({ row }: GridRenderCellParams<Student>) => (
    <SemanticChip
      variant={row.status !== 'active' ? 'info' : row.contract_active ? 'success' : 'warning'}
      label={
        row.status !== 'active'
          ? t('common.transferred')
          : row.contract_active
            ? t('common.activeStatus')
            : t('students.withoutSignedContract')
      }
    />
  );

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listStudents({
        schoolId,
        page: page + 1,
        q: debouncedSearch,
        status: activation,
      });
      setStudents(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setStudents([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('students.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, debouncedSearch, activation, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (term) {
          next.set('q', term);
        } else {
          next.delete('q');
        }
        return next;
      },
      { replace: true },
    );
    setPage(0);
  };

  const handleActivationChange = (value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === 'active') {
          next.delete('status');
        } else {
          next.set('status', value);
        }
        return next;
      },
      { replace: true },
    );
    setPage(0);
  };

  const handleActivate = async (record: Student) => {
    if (!schoolId) {
      return;
    }

    setError('');

    try {
      await activateStudent(schoolId, record.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('students.activateError'));
    }
  };

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const handleConfirmDelete = async () => {
    if (!schoolId || !pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteStudent(schoolId, pendingDelete.id);
      setPendingDelete(null);

      if (students.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        load();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('students.deleteError'));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef<Student>[] = [
    { field: 'name', headerName: t('common.name'), flex: 1, minWidth: 180 },
    { field: 'cpf', headerName: 'CPF', width: 150, renderCell: renderCpf },
    {
      field: 'birth_date',
      headerName: t('common.birthDate'),
      width: 130,
      renderCell: renderBirthDate,
    },
    {
      field: 'grade_level',
      headerName: t('common.class'),
      width: 210,
      sortable: false,
      renderCell: renderClass,
    },
    {
      field: 'guardians',
      headerName: t('common.guardians'),
      width: 200,
      sortable: false,
      renderCell: renderGuardians,
    },
    {
      field: 'status',
      headerName: t('common.status'),
      width: 130,
      renderCell: renderStatus,
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 150,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<Student>) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
          {!row.active ? (
            <Tooltip title={t('common.activate')}>
              <IconButton
                size="small"
                aria-label={t('students.activateAria', { name: row.name })}
                onClick={() => handleActivate(row)}
              >
                <IconifyIcon icon="mingcute:refresh-2-line" />
              </IconButton>
            </Tooltip>
          ) : (
            <>
              {/* What the family told the school about the child's health. Read here rather
                    than chased over the phone on the day it matters. */}
              {/* How the child is getting on: the boletins published and what their teachers
                  wrote. Two readings of one question, so they share a button. */}
              <Tooltip title={t('academic.action')}>
                <IconButton
                  size="small"
                  aria-label={t('academic.aria', { name: row.name })}
                  onClick={() => setAcademicFor(row)}
                >
                  <IconifyIcon icon="mingcute:book-5-line" />
                </IconButton>
              </Tooltip>
              {/* Who may collect the child. Read at the gate, the moment somebody turns up
                  asking for the student. */}
              <Tooltip title={t('pickups.action')}>
                <IconButton
                  size="small"
                  aria-label={t('pickups.aria', { name: row.name })}
                  onClick={() => setPickupsFor(row)}
                >
                  <IconifyIcon icon="mingcute:user-follow-line" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('health.action')}>
                <IconButton
                  size="small"
                  aria-label={t('health.aria', { name: row.name })}
                  onClick={() => setHealthFor(row)}
                >
                  <IconifyIcon icon="mingcute:heartbeat-line" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.edit')}>
                <IconButton
                  size="small"
                  aria-label={`${t('common.edit')} ${row.name}`}
                  onClick={() => {
                    setEditing(row);
                    setFormOpen(true);
                  }}
                >
                  <IconifyIcon icon="mingcute:edit-2-line" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.delete')}>
                <IconButton
                  size="small"
                  aria-label={`${t('common.delete')} ${row.name}`}
                  onClick={() => setPendingDelete(row)}
                >
                  <IconifyIcon icon="mingcute:delete-2-line" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      ),
    },
  ];

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('students.title')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('students.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('students.title')}
        actions={
          <>
            <TextField
              id="activation-filter"
              label={t('common.status')}
              value={activation}
              onChange={(e) => handleActivationChange(e.target.value)}
              select
              size="small"
              variant="filled"
              sx={{ width: 150 }}
            >
              <MenuItem value="active">{t('common.actives')}</MenuItem>
              <MenuItem value="inactive">{t('common.inactives')}</MenuItem>
              <MenuItem value="all">{t('common.allStatus')}</MenuItem>
            </TextField>
            <SearchField
              value={search}
              onChange={handleSearchChange}
              placeholder={t('students.searchPlaceholder')}
              ariaLabel={t('students.searchAria')}
              sx={{ width: 260 }}
            />
            <Button variant="contained" size="small" onClick={handleCreate}>
              {t('students.new')}
            </Button>
            {/* Weighted below "Novo estudante": printing the roll is a routine errand, not the
                action the screen is mainly for. */}
            <Button
              variant="outlined"
              size="small"
              onClick={() => setReportOpen(true)}
              startIcon={<IconifyIcon icon="mingcute:file-export-line" />}
            >
              {t('students.report.action')}
            </Button>
          </>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && students.length === 0 && !error ? (
          <EmptyState
            title={debouncedSearch ? t('students.empty.searchTitle') : t('students.empty.title')}
            description={
              debouncedSearch
                ? t('students.empty.searchDescription', { query: debouncedSearch })
                : t('students.empty.description')
            }
            action={
              <Button variant="contained" size="small" onClick={handleCreate}>
                {t('students.new')}
              </Button>
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={students}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              getRowHeight={() => 'auto'}
              paginationMode="server"
              rowCount={total}
              pageSizeOptions={[PAGE_SIZE]}
              paginationModel={{ page, pageSize: PAGE_SIZE }}
              onPaginationModelChange={(model) => setPage(model.page)}
              rangeLabel={({ from, to, count }) => t('common.range', { from, to, count })}
            />
          </Box>
        )}
      </SectionCard>

      <StudentFormDialog
        key={`${formOpen}-${editing?.id ?? 'new'}`}
        open={formOpen}
        schoolId={school.school_id}
        student={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('students.deleteTitle')}
        message={t('students.deleteMessage', { name: pendingDelete?.name ?? '' })}
        confirmLabel={deleting ? t('common.deleting') : t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {academicFor && (
        <StudentAcademicDialog
          open
          schoolId={school.school_id}
          studentId={academicFor.id}
          studentName={academicFor.name}
          onClose={() => setAcademicFor(null)}
        />
      )}

      {pickupsFor && (
        <AuthorizedPickupsDialog
          open
          schoolId={school.school_id}
          studentId={pickupsFor.id}
          studentName={pickupsFor.name}
          onClose={() => setPickupsFor(null)}
        />
      )}

      {healthFor && (
        <HealthRecordsDialog
          open
          schoolId={school.school_id}
          studentId={healthFor.id}
          studentName={healthFor.name}
          readOnly
          onClose={() => setHealthFor(null)}
        />
      )}

      <RegisterReportDialog
        key={String(reportOpen)}
        open={reportOpen}
        schoolId={school.school_id}
        search={debouncedSearch}
        status={activation}
        columns={STUDENT_REPORT_COLUMNS}
        defaultColumns={STUDENT_REPORT_DEFAULTS}
        fetchReport={fetchStudentsReport}
        filename="estudantes.pdf"
        onClose={() => setReportOpen(false)}
      />
    </Stack>
  );
};

export default Students;
