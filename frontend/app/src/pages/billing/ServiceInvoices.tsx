import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import {
  downloadStaffServiceInvoicePdf,
  listStaffServiceInvoices,
} from 'services/serviceInvoicesApi';
import { ServiceInvoice, ServiceInvoiceStatus } from 'types/serviceInvoice';
import { downloadBlob } from 'utils/downloadBlob';
import type { MessageKey } from 'locales';

const PAGE_SIZE = 25;

const STATUS_KEYS: Record<ServiceInvoiceStatus, MessageKey> = {
  pending: 'serviceInvoices.status.pending',
  enqueued: 'serviceInvoices.status.enqueued',
  authorized: 'serviceInvoices.status.authorized',
  rejected: 'serviceInvoices.status.rejected',
  failed: 'serviceInvoices.status.failed',
  canceled: 'serviceInvoices.status.canceled',
};

const STATUS_VARIANTS: Record<
  ServiceInvoiceStatus,
  'success' | 'warning' | 'error' | 'info'
> = {
  pending: 'info',
  enqueued: 'warning',
  authorized: 'success',
  rejected: 'error',
  failed: 'error',
  canceled: 'info',
};

const formatDateTime = (iso: string | null, locale: string) => {
  if (!iso) {
    return '—';
  }

  return new Date(iso).toLocaleString(locale === 'en-US' ? 'en-US' : 'pt-BR');
};

/**
 * Staff view of NFS-e issued for confirmed payments.
 *
 * Read-only — issuance is automatic on payment confirmation; this screen is for support and
 * reconciliation when a municipality is slow or a guardian asks for the PDF again.
 */
const ServiceInvoices = () => {
  const { t, locale } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [rows, setRows] = useState<ServiceInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listStaffServiceInvoices({ schoolId, page: page + 1 });
      setRows(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('serviceInvoices.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, schoolId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadPdf = async (invoice: ServiceInvoice) => {
    if (!schoolId || !invoice.pdf_available) {
      return;
    }

    setDownloadingId(invoice.id);

    try {
      const blob = await downloadStaffServiceInvoicePdf(schoolId, invoice.id);
      downloadBlob(blob, `nfse-${invoice.invoice_number ?? invoice.id}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('serviceInvoices.pdfError'));
    } finally {
      setDownloadingId(null);
    }
  };

  const columns: GridColDef<ServiceInvoice>[] = [
    {
      field: 'status',
      headerName: t('serviceInvoices.column.status'),
      flex: 0.8,
      minWidth: 120,
      renderCell: ({ row }: GridRenderCellParams<ServiceInvoice>) => (
        <SemanticChip
          variant={STATUS_VARIANTS[row.status]}
          label={t(STATUS_KEYS[row.status])}
        />
      ),
    },
    {
      field: 'invoice_number',
      headerName: t('serviceInvoices.column.number'),
      flex: 0.7,
      minWidth: 100,
      valueGetter: (_value, row) => row.invoice_number ?? '—',
    },
    {
      field: 'charge_id',
      headerName: t('serviceInvoices.column.charge'),
      flex: 0.6,
      minWidth: 90,
    },
    {
      field: 'payment_id',
      headerName: t('serviceInvoices.column.payment'),
      flex: 0.6,
      minWidth: 90,
    },
    {
      field: 'authorized_at',
      headerName: t('serviceInvoices.column.authorizedAt'),
      flex: 1,
      minWidth: 160,
      valueGetter: (_value, row) => formatDateTime(row.authorized_at, locale),
    },
    {
      field: 'pdf',
      headerName: t('serviceInvoices.column.pdf'),
      flex: 0.7,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<ServiceInvoice>) =>
        row.pdf_available ? (
          <Button
            size="small"
            variant="text"
            disabled={downloadingId === row.id}
            startIcon={<IconifyIcon icon="mingcute:file-line" />}
            onClick={() => downloadPdf(row)}
          >
            {downloadingId === row.id ? t('serviceInvoices.downloading') : t('serviceInvoices.downloadPdf')}
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
  ];

  if (!schoolId) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.serviceInvoices')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('serviceInvoices.noAccess')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('nav.serviceInvoices')}
        subtitle={t('serviceInvoices.description')}
      />

      {error ? <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} /> : null}

      <SectionCard>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <EmptyState
            title={t('serviceInvoices.empty.title')}
            description={t('serviceInvoices.empty.description')}
            headingLevel={3}
          />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowCount={total}
            paginationMode="server"
            paginationModel={{ page, pageSize: PAGE_SIZE }}
            onPaginationModelChange={(model) => setPage(model.page)}
            pageSizeOptions={[PAGE_SIZE]}
            disableRowSelectionOnClick
            autoHeight
          />
        )}
      </SectionCard>
    </Stack>
  );
};

export default ServiceInvoices;
