import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridColDef } from '@mui/x-data-grid';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
  SuccessBanner,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { RequestAction, actOnRequest, listRequests } from 'services/requestsApi';
import { GuardianRequest, GuardianRequestStatus } from 'types/guardianRequest';
import RequestDetailsDialog from './RequestDetailsDialog';

const PAGE_SIZE = 25;

/** How each state reads on the chip. `in_progress` is amber because it is work someone holds. */
const STATUS_VARIANT: Record<GuardianRequestStatus, 'info' | 'warning' | 'success' | 'error'> = {
  pending: 'info',
  in_progress: 'warning',
  fulfilled: 'success',
  rejected: 'error',
};

/**
 * Solicitações: what guardians have asked the school for, as one queue.
 *
 * The screen lands on what is still open, because the only reason to come here is to clear work.
 * Answered requests are still reachable through the filter — a guardian who telephones about a
 * refusal is asking about something that left the queue weeks ago.
 */
const Requests = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [status, setStatus] = useState('open');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<GuardianRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openFor, setOpenFor] = useState<GuardianRequest | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listRequests(schoolId, { status, kind, page: page + 1 });
      setRows(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('requests.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, status, kind, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Changing what is being looked at goes back to the first page: page three of the open pile is
  // not page three of the refused one.
  const setFilter = (apply: () => void) => {
    apply();
    setPage(0);
  };

  const act = async (row: GuardianRequest, action: RequestAction, resolutionNote?: string) => {
    if (!schoolId) {
      return;
    }

    setError('');

    try {
      await actOnRequest(schoolId, row.id, action, resolutionNote);
      setNotice(t(`requests.done.${action}`));
      setOpenFor(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('requests.actionError'));
    }
  };

  const columns = useMemo<GridColDef<GuardianRequest>[]>(
    () => [
      {
        field: 'kind',
        headerName: t('requests.column.kind'),
        flex: 1,
        minWidth: 150,
        renderCell: ({ row }) => t(`requests.kind.${row.kind}`),
      },
      {
        field: 'student_name',
        headerName: t('common.student'),
        flex: 1,
        minWidth: 160,
      },
      {
        field: 'guardian_name',
        headerName: t('requests.column.guardian'),
        flex: 1,
        minWidth: 160,
      },
      {
        field: 'created_at',
        headerName: t('requests.column.openedOn'),
        width: 130,
        renderCell: ({ row }) => new Date(row.created_at).toLocaleDateString(),
      },
      {
        field: 'status',
        headerName: t('requests.column.status'),
        width: 150,
        renderCell: ({ row }) => (
          <SemanticChip
            variant={STATUS_VARIANT[row.status]}
            label={t(`requests.status.${row.status}`)}
          />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 120,
        sortable: false,
        renderCell: ({ row }) => (
          <Button size="small" onClick={() => setOpenFor(row)}>
            {t('requests.open')}
          </Button>
        ),
      },
    ],
    [t],
  );

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.requests')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('requests.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.requests')} />

      <Typography variant="body2" color="text.secondary">
        {t('requests.intro')}
      </Typography>

      <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
        <TextField
          id="requests-status"
          label={t('requests.column.status')}
          value={status}
          onChange={(e) => setFilter(() => setStatus(e.target.value))}
          variant="filled"
          size="small"
          select
          sx={{ width: 220 }}
        >
          <MenuItem value="open">{t('requests.filter.open')}</MenuItem>
          <MenuItem value="pending">{t('requests.status.pending')}</MenuItem>
          <MenuItem value="in_progress">{t('requests.status.in_progress')}</MenuItem>
          <MenuItem value="fulfilled">{t('requests.status.fulfilled')}</MenuItem>
          <MenuItem value="rejected">{t('requests.status.rejected')}</MenuItem>
          <MenuItem value="">{t('requests.filter.all')}</MenuItem>
        </TextField>
        <TextField
          id="requests-kind"
          label={t('requests.column.kind')}
          value={kind}
          onChange={(e) => setFilter(() => setKind(e.target.value))}
          variant="filled"
          size="small"
          select
          sx={{ width: 220 }}
        >
          <MenuItem value="">{t('requests.filter.allKinds')}</MenuItem>
          <MenuItem value="declaration">{t('requests.kind.declaration')}</MenuItem>
          <MenuItem value="second_call">{t('requests.kind.second_call')}</MenuItem>
        </TextField>
      </Stack>

      {error && <ErrorBanner message={error} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard padding={0}>
        {!loading && rows.length === 0 && !error ? (
          <EmptyState
            title={t('requests.empty.title')}
            description={t('requests.empty.description')}
            headingLevel={2}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={rows}
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

      {openFor && (
        <RequestDetailsDialog
          open
          request={openFor}
          onClose={() => setOpenFor(null)}
          onAct={(action, note) => act(openFor, action, note)}
        />
      )}
    </Stack>
  );
};

export default Requests;
