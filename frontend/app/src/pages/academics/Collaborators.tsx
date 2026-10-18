import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSearchParams } from 'react-router';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import CollaboratorBankAccountDialog from 'components/sections/academics/CollaboratorBankAccountDialog';
import CollaboratorDetailsDialog from 'components/sections/academics/CollaboratorDetailsDialog';
import CollaboratorFormDialog from 'components/sections/academics/CollaboratorFormDialog';
import CollaboratorHealthProfileDialog from 'components/sections/academics/CollaboratorHealthProfileDialog';
import TeacherAssignmentsDialog from 'components/sections/academics/TeacherAssignmentsDialog';
import PersonDocumentsDialog from 'components/sections/documents/PersonDocumentsDialog';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchField,
  SectionCard,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { deleteTeacher, fetchTeachersDossierPdf, listTeachers } from 'services/academicsApi';
import { COLLABORATOR_DOCUMENT_TYPES } from 'services/documentsApi';
import { Teacher } from 'types/academics';
import { downloadBlob } from 'utils/downloadBlob';
import { formatCpf } from 'utils/documentNumber';
import { membershipHasPermission } from 'utils/onboarding/access';
import { useDebouncedValue } from 'utils/useDebouncedValue';

const PAGE_SIZE = 25;

const renderCpf = ({ value }: GridRenderCellParams<Teacher, string>) => (
  <Typography variant="body2">{formatCpf(value)}</Typography>
);

const Collaborators = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  // Same gate the roster listing itself answers to on the API (`TeacherPolicy#index?`) — kept
  // explicit here too so the button never renders for staff who would only get a 403 from it.
  const canViewHealthProfile = school !== null && membershipHasPermission(school, 'manage_people');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [assignmentsFor, setAssignmentsFor] = useState<Teacher | null>(null);
  const [detailsFor, setDetailsFor] = useState<Teacher | null>(null);
  const [documentsFor, setDocumentsFor] = useState<Teacher | null>(null);
  const [bankAccountFor, setBankAccountFor] = useState<Teacher | null>(null);
  const [healthProfileFor, setHealthProfileFor] = useState<Teacher | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listTeachers({ schoolId, page: page + 1, q: debouncedSearch });
      setTeachers(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setTeachers([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('collaborators.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, debouncedSearch, t]);

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

  const handleConfirmDelete = async () => {
    if (!schoolId || !pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteTeacher(schoolId, pendingDelete.id);
      setPendingDelete(null);

      if (teachers.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        load();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('collaborators.deleteError'));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // Always every collaborator of the school, active and discarded alike — there is no column
  // picker or filter to carry over from the roster: the dossier is a fixed, one-click export.
  const handleExportPdf = async () => {
    if (!schoolId) {
      return;
    }

    setExportingPdf(true);
    setError('');

    try {
      const blob = await fetchTeachersDossierPdf(schoolId);
      const schoolSlug = (school?.school_name ?? String(schoolId)).toLowerCase().replace(/\s+/g, '-');
      downloadBlob(blob, `colaboradores-${schoolSlug}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('collaborators.exportPdfError'));
    } finally {
      setExportingPdf(false);
    }
  };

  const columns: GridColDef<Teacher>[] = [
      // O nome ocupa a sobra da largura: nomes completos são longos e quebrá-los em duas linhas
      // fazia cada linha da tabela ter uma altura diferente da vizinha.
      { field: 'name', headerName: t('common.name'), flex: 1.6, minWidth: 260 },
      { field: 'job_title', headerName: t('common.position'), flex: 1, minWidth: 170 },
      { field: 'cpf', headerName: 'CPF', width: 150, renderCell: renderCpf },
      {
        // Última coluna e encostada na borda: as ações são o fim da linha, não uma coluna de
        // dados solta no meio da largura.
        field: 'actions',
        headerName: t('common.actions'),
        width: 230,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }: GridRenderCellParams<Teacher>) => (
          <Stack
            direction="row"
            spacing={0.5}
            justifyContent="flex-end"
            alignItems="center"
            width={1}
            height={1}
          >
            <Tooltip title={t('collaborators.details')}>
              <IconButton
                size="small"
                aria-label={t('collaborators.detailsAria', { name: row.name })}
                onClick={() => setDetailsFor(row)}
              >
                <IconifyIcon icon="mingcute:information-line" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.personalDocuments')}>
              <IconButton
                size="small"
                aria-label={`${t('common.personalDocuments')} ${row.name}`}
                onClick={() => setDocumentsFor(row)}
              >
                <IconifyIcon icon="mingcute:file-certificate-line" />
              </IconButton>
            </Tooltip>
            {/* Where the salary is sent. Next to the person rather than in the billing
                settings: whoever keeps the collaborator's register current is the one who
                learns their account changed. */}
            <Tooltip title={t('collaborators.bankAccount')}>
              <IconButton
                size="small"
                aria-label={t('collaborators.bankAccountAria', { name: row.name })}
                onClick={() => setBankAccountFor(row)}
              >
                <IconifyIcon icon="mingcute:bank-card-line" />
              </IconButton>
            </Tooltip>
            {canViewHealthProfile && (
              <Tooltip title={t('collaborators.healthProfile')}>
                <IconButton
                  size="small"
                  aria-label={t('collaborators.healthProfileAria', { name: row.name })}
                  onClick={() => setHealthProfileFor(row)}
                >
                  <IconifyIcon icon="mingcute:heartbeat-line" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t('collaborators.classesTooltip')}>
              <IconButton
                size="small"
                aria-label={t('collaborators.classesAria', { name: row.name })}
                onClick={() => setAssignmentsFor(row)}
              >
                <IconifyIcon icon="mingcute:book-2-line" />
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
          </Stack>
        ),
      },
  ];

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('collaborators.title')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('collaborators.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('collaborators.title')}
        actions={
          <>
            <SearchField
              value={search}
              onChange={handleSearchChange}
              placeholder={t('collaborators.searchPlaceholder')}
              ariaLabel={t('collaborators.searchAria')}
              sx={{ width: 260 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('collaborators.new')}
            </Button>
            {/* Same `manage_people` gate the dossier endpoint itself enforces — the button never
                renders for staff who would only get a 403 from it. */}
            {canViewHealthProfile && (
              <Button
                variant="outlined"
                size="small"
                aria-label={t('collaborators.exportPdfAria')}
                startIcon={
                  exportingPdf ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <IconifyIcon icon="mingcute:file-export-line" />
                  )
                }
                onClick={handleExportPdf}
                disabled={exportingPdf}
              >
                {t('collaborators.exportPdf')}
              </Button>
            )}
          </>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && teachers.length === 0 && !error ? (
          <EmptyState
            title={
              debouncedSearch
                ? t('collaborators.empty.searchTitle')
                : t('collaborators.empty.title')
            }
            description={
              debouncedSearch
                ? t('collaborators.empty.searchDescription', { query: debouncedSearch })
                : t('collaborators.empty.description')
            }
            action={
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                {t('collaborators.new')}
              </Button>
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={teachers}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              // Altura fixa e generosa: com `auto` a altura seguia o nome que quebrasse, e as
              // linhas ficavam com espaçamentos diferentes entre si.
              rowHeight={64}
              columnHeaderHeight={56}
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

      <CollaboratorFormDialog
        key={`${formOpen}-${editing?.id ?? 'new'}`}
        open={formOpen}
        schoolId={school.school_id}
        teacher={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
          load();
        }}
      />

      {detailsFor && (
        <CollaboratorDetailsDialog
          open
          teacher={detailsFor}
          onClose={() => setDetailsFor(null)}
        />
      )}

      {assignmentsFor && (
        <TeacherAssignmentsDialog
          open
          schoolId={school.school_id}
          teacher={assignmentsFor}
          onClose={() => setAssignmentsFor(null)}
          onChanged={load}
        />
      )}

      {bankAccountFor && (
        <CollaboratorBankAccountDialog
          open
          schoolId={school.school_id}
          teacher={bankAccountFor}
          onClose={() => setBankAccountFor(null)}
        />
      )}

      {healthProfileFor && (
        <CollaboratorHealthProfileDialog
          open
          schoolId={school.school_id}
          teacher={healthProfileFor}
          onClose={() => setHealthProfileFor(null)}
        />
      )}

      {documentsFor && (
        <PersonDocumentsDialog
          open
          schoolId={school.school_id}
          documentableType="Teacher"
          documentableId={documentsFor.id}
          title={documentsFor.name}
          subtitle={documentsFor.job_title ?? undefined}
          documentTypes={COLLABORATOR_DOCUMENT_TYPES}
          emptyDescription={t('documents.empty.collaborator')}
          onClose={() => setDocumentsFor(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('collaborators.deleteTitle')}
        message={t('collaborators.deleteMessage', { name: pendingDelete?.name ?? '' })}
        confirmLabel={deleting ? t('common.deleting') : t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Stack>
  );
};

export default Collaborators;
