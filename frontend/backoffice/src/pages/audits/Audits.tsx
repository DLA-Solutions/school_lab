import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { listAudits } from 'services/auditsApi';
import { AuditActor, AuditListFilters, PlatformAudit } from 'types/audit';

const formatAuditActor = (actor: AuditActor | null | undefined) => {
  if (!actor) {
    return null;
  }

  const typeLabel = actor.type.replace(/([a-z])([A-Z])/g, '$1 $2');

  return `${typeLabel} #${actor.id}`;
};

const PAGE_SIZE = 25;
const ALL_ACTIONS = 'all';

type ActionFilter = typeof ALL_ACTIONS | 'create' | 'update' | 'destroy';

const ACTION_FILTER_LABELS: Record<ActionFilter, string> = {
  all: 'Todas',
  create: 'create',
  update: 'update',
  destroy: 'destroy',
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('pt-BR');
};

const parseActionFilter = (value: string | null): ActionFilter => {
  if (value && value in ACTION_FILTER_LABELS && value !== ALL_ACTIONS) {
    return value as ActionFilter;
  }

  return ALL_ACTIONS;
};

/**
 * Cross-tenant audit log — read-only, no export (BR-BOE05).
 */
const Audits = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [audits, setAudits] = useState<PlatformAudit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [schoolIdFilter, setSchoolIdFilter] = useState(() => searchParams.get('school_id') ?? '');
  const [actionFilter, setActionFilter] = useState<ActionFilter>(() =>
    parseActionFilter(searchParams.get('action')),
  );
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('date_from') ?? '');
  const [dateTo, setDateTo] = useState(() => searchParams.get('date_to') ?? '');

  const listFilters = useMemo<AuditListFilters>(
    () => ({
      school_id: schoolIdFilter.trim(),
      action: actionFilter === ALL_ACTIONS ? '' : actionFilter,
      date_from: dateFrom,
      date_to: dateTo,
    }),
    [actionFilter, dateFrom, dateTo, schoolIdFilter],
  );

  const hasActiveFilters =
    Boolean(schoolIdFilter.trim()) ||
    actionFilter !== ALL_ACTIONS ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listAudits(page + 1, listFilters);
      setAudits(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setAudits([]);
      setTotal(0);

      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar a auditoria. Verifique sua conexão.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [listFilters, page]);

  useEffect(() => {
    setPage(0);
  }, [schoolIdFilter, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (schoolIdFilter.trim()) {
      params.set('school_id', schoolIdFilter.trim());
    }

    if (actionFilter !== ALL_ACTIONS) {
      params.set('action', actionFilter);
    }

    if (dateFrom) {
      params.set('date_from', dateFrom);
    }

    if (dateTo) {
      params.set('date_to', dateTo);
    }

    setSearchParams(params, { replace: true });
  }, [actionFilter, dateFrom, dateTo, schoolIdFilter, setSearchParams]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSchoolIdKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      setSchoolIdFilter(event.currentTarget.value);
    }
  };

  const columns: GridColDef<PlatformAudit>[] = [
    {
      field: 'created_at',
      headerName: t('backoffice.audits.timestamp'),
      width: 190,
      renderCell: ({ row }: GridRenderCellParams<PlatformAudit>) => (
        <Typography variant="body2">{formatTimestamp(row.created_at)}</Typography>
      ),
    },
    {
      field: 'school_id',
      headerName: t('backoffice.audits.schoolId'),
      width: 100,
      renderCell: renderOptionalNumber,
    },
    {
      field: 'actor',
      headerName: t('backoffice.audits.actor'),
      flex: 1,
      minWidth: 180,
      valueGetter: (_value, row) => formatAuditActor(row.actor),
      renderCell: renderOptionalText,
    },
    {
      field: 'action',
      headerName: t('backoffice.audits.action'),
      width: 110,
    },
    {
      field: 'auditable_type',
      headerName: t('backoffice.audits.auditableType'),
      flex: 1,
      minWidth: 140,
    },
    {
      field: 'changed_keys',
      headerName: t('backoffice.audits.changedKeys'),
      flex: 1,
      minWidth: 180,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<PlatformAudit>) => {
        if (row.changed_keys.length === 0) {
          return (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          );
        }

        return (
          <Typography variant="body2" noWrap title={row.changed_keys.join(', ')}>
            {row.changed_keys.join(', ')}
          </Typography>
        );
      },
    },
  ];

  if (forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('backoffice.audits.title')} />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="Auditoria da plataforma."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('backoffice.audits.title')}
        subtitle={t('backoffice.audits.subtitle')}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              id="audit-school-id-filter"
              label={t('backoffice.audits.filterSchoolId')}
              defaultValue={schoolIdFilter}
              onBlur={(event) => setSchoolIdFilter(event.target.value)}
              onKeyDown={handleSchoolIdKeyDown}
              size="small"
              variant="filled"
              sx={{ width: 130 }}
            />
            <TextField
              id="audit-action-filter"
              label={t('backoffice.audits.filterAction')}
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value as ActionFilter)}
              select
              size="small"
              variant="filled"
              sx={{ width: 130 }}
            >
              {(Object.keys(ACTION_FILTER_LABELS) as ActionFilter[]).map((value) => (
                <MenuItem key={value} value={value}>
                  {value === ALL_ACTIONS ? t('backoffice.audits.actionAll') : value}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="audit-date-from"
              label={t('backoffice.audits.filterDateFrom')}
              type="date"
              value={dateFrom}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDateFrom(event.target.value)}
              size="small"
              variant="filled"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 160 }}
            />
            <TextField
              id="audit-date-to"
              label={t('backoffice.audits.filterDateTo')}
              type="date"
              value={dateTo}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDateTo(event.target.value)}
              size="small"
              variant="filled"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 160 }}
            />
          </Stack>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && audits.length === 0 && !error ? (
          <EmptyState
            title={
              hasActiveFilters
                ? t('backoffice.audits.emptyFiltered')
                : t('backoffice.audits.empty')
            }
            description={
              hasActiveFilters
                ? t('backoffice.audits.emptyFiltered')
                : t('backoffice.audits.subtitle')
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={audits}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              paginationMode="server"
              rowCount={total}
              pageSizeOptions={[PAGE_SIZE]}
              paginationModel={{ page, pageSize: PAGE_SIZE }}
              onPaginationModelChange={(model) => setPage(model.page)}
              rangeLabel={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </Box>
        )}
      </SectionCard>
    </Stack>
  );
};

const renderOptionalText = ({ value }: GridRenderCellParams<PlatformAudit, string | null>) =>
  value ? (
    <Typography variant="body2">{value}</Typography>
  ) : (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );

const renderOptionalNumber = ({ value }: GridRenderCellParams<PlatformAudit, number | null>) =>
  value != null ? (
    <Typography variant="body2">{value}</Typography>
  ) : (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );

export default Audits;
