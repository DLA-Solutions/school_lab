import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import CrmContactFormDialog from 'components/sections/crm/CrmContactFormDialog';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchField,
  SectionCard,
  SemanticChip,
  SemanticChipVariant,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { deleteCrmContact, listCrmContacts } from 'services/crmApi';
import { CRM_TEMPERATURES, CrmContact, CrmTemperature } from 'types/crm';
import { membershipHasPermission } from 'utils/onboarding/access';
import { useDebouncedValue } from 'utils/useDebouncedValue';

const PAGE_SIZE = 25;

/** Cold reads as neutral/calm, warm as attention, hot as the strongest signal. */
const TEMPERATURE_VARIANT: Record<CrmTemperature, SemanticChipVariant> = {
  cold: 'info',
  warm: 'warning',
  hot: 'error',
};

type TemperatureFilter = CrmTemperature | 'all';

const CrmContacts = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  // Same permission `CrmContactPolicy` checks — the page never asks the API for what it would
  // only refuse with a 403.
  const canManage = school !== null && membershipHasPermission(school, 'manage_enrollment');

  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [temperature, setTemperature] = useState<TemperatureFilter>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CrmContact | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CrmContact | null>(null);

  const load = useCallback(async () => {
    if (!schoolId || !canManage) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listCrmContacts({
        schoolId,
        page: page + 1,
        q: debouncedSearch,
        temperature: temperature === 'all' ? undefined : temperature,
      });
      setContacts(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setContacts([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('crm.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, canManage, page, debouncedSearch, temperature, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const handleTemperatureChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTemperature(event.target.value as TemperatureFilter);
    setPage(0);
  };

  const openForm = (contact: CrmContact | null) => {
    setEditing(contact);
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

    try {
      await deleteCrmContact(schoolId, pendingDelete.id);

      if (contacts.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        load();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('crm.deleteError'));
    } finally {
      setPendingDelete(null);
    }
  };

  const renderOptional = ({ value }: GridRenderCellParams<CrmContact, string | null>) =>
    value ? (
      <Typography variant="body2" noWrap title={value}>
        {value}
      </Typography>
    ) : (
      <Typography variant="body2" color="text.secondary">
        {t('common.none')}
      </Typography>
    );

  const columns: GridColDef<CrmContact>[] = [
    { field: 'name', headerName: t('crm.column.name'), flex: 1, minWidth: 180 },
    {
      field: 'phone',
      headerName: t('crm.column.phone'),
      width: 160,
      renderCell: renderOptional,
    },
    {
      field: 'email',
      headerName: t('crm.column.email'),
      flex: 1,
      minWidth: 200,
      renderCell: renderOptional,
    },
    {
      field: 'notes',
      headerName: t('crm.column.notes'),
      flex: 1.5,
      minWidth: 240,
      renderCell: renderOptional,
    },
    {
      field: 'temperature',
      headerName: t('crm.column.temperature'),
      width: 140,
      renderCell: ({ row }: GridRenderCellParams<CrmContact>) => (
        <SemanticChip
          variant={TEMPERATURE_VARIANT[row.temperature]}
          label={t(`crm.temperature.${row.temperature}`)}
        />
      ),
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 110,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<CrmContact>) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
          <Tooltip title={t('common.edit')}>
            <IconButton
              size="small"
              aria-label={t('crm.editAria', { name: row.name })}
              onClick={() => openForm(row)}
            >
              <IconifyIcon icon="mingcute:edit-2-line" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton
              size="small"
              aria-label={t('crm.deleteAria', { name: row.name })}
              onClick={() => setPendingDelete(row)}
            >
              <IconifyIcon icon="mingcute:delete-2-line" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  if (!school || !canManage) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('crm.title')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('crm.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  const filtered = Boolean(debouncedSearch) || temperature !== 'all';

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('crm.title')}
        actions={
          <>
            <SearchField
              value={search}
              onChange={handleSearchChange}
              placeholder={t('crm.searchPlaceholder')}
              ariaLabel={t('crm.searchAria')}
              sx={{ width: 260 }}
            />
            <TextField
              select
              size="small"
              variant="filled"
              label={t('crm.filter.label')}
              value={temperature}
              onChange={handleTemperatureChange}
              sx={{ width: 160 }}
            >
              <MenuItem value="all">{t('crm.filter.all')}</MenuItem>
              {CRM_TEMPERATURES.map((value) => (
                <MenuItem key={value} value={value}>
                  {t(`crm.temperature.${value}`)}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" size="small" onClick={() => openForm(null)}>
              {t('crm.new')}
            </Button>
          </>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && contacts.length === 0 && !error ? (
          <EmptyState
            title={filtered ? t('crm.empty.searchTitle') : t('crm.empty.title')}
            description={
              filtered ? t('crm.empty.searchDescription') : t('crm.empty.description')
            }
            action={
              filtered ? undefined : (
                <Button variant="contained" size="small" onClick={() => openForm(null)}>
                  {t('crm.new')}
                </Button>
              )
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={contacts}
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

      <CrmContactFormDialog
        open={formOpen}
        schoolId={school.school_id}
        contact={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('crm.deleteTitle')}
        message={t('crm.deleteMessage', { name: pendingDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Stack>
  );
};

export default CrmContacts;
