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
import PersonDocumentsDialog from 'components/sections/documents/PersonDocumentsDialog';
import GuardianChargesDialog from 'components/sections/people/guardians/GuardianChargesDialog';
import GuardianContractsDialog from 'components/sections/people/guardians/GuardianContractsDialog';
import GuardianDetailsDialog from 'components/sections/people/guardians/GuardianDetailsDialog';
import RegisterReportDialog from 'components/sections/people/RegisterReportDialog';
import GuardianFormDialog from 'components/sections/people/guardians/GuardianFormDialog';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchField,
  SectionCard,
  SuccessBanner,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import {
  activateGuardian,
  fetchGuardiansReport,
  sendGuardianAccess,
  deleteGuardian,
  listGuardians,
} from 'services/guardiansApi';
import { GUARDIAN_REPORT_COLUMNS, GUARDIAN_REPORT_DEFAULTS } from 'pages/people/guardiansReport';
import { Guardian } from 'types/guardian';
import { formatCpf } from 'utils/documentNumber';
import { useDebouncedValue } from 'utils/useDebouncedValue';

// The API paginates with Pagy at a fixed 25 per page and takes no page-size parameter, so the
// grid follows the server rather than offering a page-size selector it could not honour.
const PAGE_SIZE = 25;

// The API stores the CPF as 11 bare digits; the mask belongs to the reader, not the column.
const renderCpf = ({ value }: GridRenderCellParams<Guardian, string>) => (
  <Typography variant="body2">{formatCpf(value)}</Typography>
);

const Guardians = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // zero-based, as the grid counts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // The term lives in the URL so it survives a reload, can be linked to, and lets the global
  // search in the menu open this listing already filtered.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  // The API does the filtering, so the term is debounced rather than sent per keystroke.
  const debouncedSearch = useDebouncedValue(search);
  // Which records are shown. Inactive ones have to be reachable, or there is no way to bring
  // them back.
  const activation = (searchParams.get('status') ?? 'active') as 'active' | 'inactive' | 'all';

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Guardian | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Guardian | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [documentsFor, setDocumentsFor] = useState<Guardian | null>(null);
  const [contractsFor, setContractsFor] = useState<Guardian | null>(null);
  const [chargesFor, setChargesFor] = useState<Guardian | null>(null);
  const [detailsFor, setDetailsFor] = useState<Guardian | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [sendingAccessTo, setSendingAccessTo] = useState<number | null>(null);
  const [accessSent, setAccessSent] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listGuardians({
        schoolId,
        page: page + 1,
        q: debouncedSearch,
        status: activation,
      });
      setGuardians(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setGuardians([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('guardians.loadError'));
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
      // Typing must not push a history entry per keystroke.
      { replace: true },
    );
    // A narrower result rarely has the page the user is on — start over at the first.
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

  const handleSendAccess = async (record: Guardian) => {
    if (!schoolId) {
      return;
    }

    setError('');
    setAccessSent('');
    setSendingAccessTo(record.id);

    try {
      await sendGuardianAccess(schoolId, record.id);
      // The API answers the same whether it invited or reset, so the confirmation says what the
      // school can rely on — a link is on its way to the address on file.
      setAccessSent(t('guardians.accessSent', { email: record.email ?? '' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('guardians.accessError'));
    } finally {
      setSendingAccessTo(null);
    }
  };

  const handleActivate = async (record: Guardian) => {
    if (!schoolId) {
      return;
    }

    setError('');

    try {
      await activateGuardian(schoolId, record.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('guardians.activateError'));
    }
  };

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (guardian: Guardian) => {
    setEditing(guardian);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    // A new guardian is ordered by name, so it may land on any page — refetch instead of
    // splicing it into the current one.
    load();
  };

  const handleConfirmDelete = async () => {
    if (!schoolId || !pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteGuardian(schoolId, pendingDelete.id);
      setPendingDelete(null);

      // Stepping back off a page that just lost its only row keeps the grid from showing empty.
      if (guardians.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        load();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('guardians.deleteError'));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef<Guardian>[] = [
    { field: 'name', headerName: t('common.name'), flex: 1, minWidth: 180 },
    { field: 'cpf', headerName: 'CPF', width: 150, renderCell: renderCpf },
    { field: 'phone', headerName: t('common.phone'), width: 150 },
    {
      field: 'actions',
      headerName: t('common.actions'),
      // Seven buttons on an active row. Sized to fit them all: a cell too narrow clips the ones
      // on the left, which reads as the actions having disappeared rather than as an overflow.
      width: 320,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<Guardian>) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
          {/* An inactive record offers only the way back; editing or deleting it makes no sense
              until it is on the books again. */}
          {!row.active ? (
            <Tooltip title={t('common.activate')}>
              <IconButton
                size="small"
                aria-label={t('guardians.activateAria', { name: row.name })}
                onClick={() => handleActivate(row)}
              >
                <IconifyIcon icon="mingcute:refresh-2-line" />
              </IconButton>
            </Tooltip>
          ) : (
            <>
              <Tooltip title={t('guardians.details.tooltip')}>
                <IconButton
                  size="small"
                  aria-label={t('guardians.details.aria', { name: row.name })}
                  onClick={() => setDetailsFor(row)}
                >
                  <IconifyIcon icon="mingcute:information-line" />
                </IconButton>
              </Tooltip>
              {/* Gives the family a way in: an invitation if they have never set a password, a
                  reset if they have. Either way it ends at a screen where they choose one. */}
              <Tooltip title={t('guardians.sendAccess')}>
                {/* A disabled button gives no events, so the tooltip needs a wrapper to hang on. */}
                <span>
                  <IconButton
                    size="small"
                    aria-label={t('guardians.sendAccessAria', { name: row.name })}
                    disabled={sendingAccessTo === row.id}
                    onClick={() => handleSendAccess(row)}
                  >
                    <IconifyIcon icon="mingcute:mail-send-line" />
                  </IconButton>
                </span>
              </Tooltip>
              {/* "Is this family up to date" — the main charges listing answers it badly, being
                  ordered by date across every family at once. */}
              <Tooltip title={t('guardians.charges.tooltip')}>
                <IconButton
                  size="small"
                  aria-label={t('guardians.charges.aria', { name: row.name })}
                  onClick={() => setChargesFor(row)}
                >
                  <IconifyIcon icon="mingcute:receive-money-line" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.contracts')}>
                <IconButton
                  size="small"
                  aria-label={`${t('common.contracts')} ${row.name}`}
                  onClick={() => setContractsFor(row)}
                >
                  <IconifyIcon icon="mingcute:contacts-2-line" />
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
              <Tooltip title={t('common.edit')}>
                <IconButton
                  size="small"
                  aria-label={`${t('common.edit')} ${row.name}`}
                  onClick={() => handleEdit(row)}
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

  // Every People endpoint is gated by `school_staff?`, so a user signed in only as a guardian
  // would get a 403 on load. Say so up front instead of rendering an empty grid.
  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('guardians.title')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('guardians.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('guardians.title')}
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
              placeholder={t('guardians.searchPlaceholder')}
              ariaLabel={t('guardians.searchAria')}
              sx={{ width: 260 }}
            />
            <Button variant="contained" size="small" onClick={handleCreate}>
              {t('guardians.new')}
            </Button>
            {/* Weighted below "Novo responsável": printing the register is a routine errand, not
                the action the screen is mainly for. */}
            <Button
              variant="outlined"
              size="small"
              onClick={() => setReportOpen(true)}
              startIcon={<IconifyIcon icon="mingcute:file-export-line" />}
            >
              {t('guardians.report.action')}
            </Button>
          </>
        }
      />

      {error && <ErrorBanner message={error} />}
      {accessSent && <SuccessBanner message={accessSent} />}

      <SectionCard padding={0}>
        {!loading && guardians.length === 0 && !error ? (
          <EmptyState
            title={debouncedSearch ? t('guardians.empty.searchTitle') : t('guardians.empty.title')}
            description={
              debouncedSearch
                ? t('guardians.empty.searchDescription', { query: debouncedSearch })
                : t('guardians.empty.description')
            }
            action={
              <Button variant="contained" size="small" onClick={handleCreate}>
                {t('guardians.new')}
              </Button>
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={guardians}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
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

      {/* The key remounts the dialog each time it opens (and when the edited row changes), which
          is what clears the form — while keeping it mounted on close so the exit transition runs. */}
      <GuardianFormDialog
        key={`${formOpen}-${editing?.id ?? 'new'}`}
        open={formOpen}
        schoolId={school.school_id}
        guardian={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      {/* Mounted only while open so each guardian's dialog fetches its own data on mount. */}
      <RegisterReportDialog
        key={String(reportOpen)}
        open={reportOpen}
        schoolId={school.school_id}
        search={debouncedSearch}
        status={activation}
        columns={GUARDIAN_REPORT_COLUMNS}
        defaultColumns={GUARDIAN_REPORT_DEFAULTS}
        fetchReport={fetchGuardiansReport}
        filename="responsaveis.pdf"
        onClose={() => setReportOpen(false)}
      />

      {detailsFor && (
        <GuardianDetailsDialog
          open
          guardian={detailsFor}
          onClose={() => setDetailsFor(null)}
        />
      )}

      {chargesFor && (
        <GuardianChargesDialog
          open
          schoolId={school.school_id}
          guardian={chargesFor}
          onClose={() => setChargesFor(null)}
        />
      )}

      {contractsFor && (
        <GuardianContractsDialog
          open
          schoolId={school.school_id}
          guardian={contractsFor}
          onClose={() => setContractsFor(null)}
        />
      )}

      {documentsFor && (
        <PersonDocumentsDialog
          open
          schoolId={school.school_id}
          documentableType="Guardian"
          documentableId={documentsFor.id}
          title={documentsFor.name}
          subtitle={`CPF ${formatCpf(documentsFor.cpf)}`}
          emptyDescription={t('documents.empty.guardian')}
          onClose={() => setDocumentsFor(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('guardians.deleteTitle')}
        message={t('guardians.deleteMessage', { name: pendingDelete?.name ?? '' })}
        confirmLabel={deleting ? t('common.deleting') : t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Stack>
  );
};

export default Guardians;
