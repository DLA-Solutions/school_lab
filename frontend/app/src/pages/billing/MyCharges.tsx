import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import BoletoPreviewDialog from 'components/sections/billing/charges/BoletoPreviewDialog';
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
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import {
  getMyCharge,
  listMyChargeHistory,
  listMyOpenCharges,
  reissueMyCharge,
} from 'services/myChargesApi';
import { downloadMyServiceInvoicePdf, listMyServiceInvoices } from 'services/serviceInvoicesApi';
import { listMyStudents } from 'services/studentsApi';
import { Charge } from 'types/charge';
import { MyCharge, MyChargeHistory } from 'types/myCharge';
import { ServiceInvoice } from 'types/serviceInvoice';
import { Student } from 'types/student';
import { formatCents } from 'utils/money';
import { downloadBlob } from 'utils/downloadBlob';
import type { MessageKey } from 'locales';

type TabValue = 'open' | 'history';

/** Pagy's default. The API ignores a client page size, so the grid asks for the same 25. */
const PAGE_SIZE = 25;

/**
 * Invoices are ordered differently from paid charges. A miscounted total must not walk forever:
 * 20 pages is 500 notes at the default size.
 */
const INVOICE_PAGE_CAP = 20;

const STATUS_VARIANT: Record<MyCharge['status'], 'success' | 'warning' | 'error' | 'info'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'error',
  cancelled: 'info',
};

/** ISO date → locale short date without timezone round trip. */
const formatDate = (iso: string | null, locale: string) => {
  if (!iso) {
    return '—';
  }

  const [year, month, day] = iso.split('-');

  return locale === 'en-US' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
};

const chargeLabel = (charge: MyCharge | MyChargeHistory, t: (key: MessageKey) => string) =>
  charge.kind === 'one_off'
    ? (charge.description ?? t('charges.kind.oneOff'))
    : (charge.student?.name ?? t('charges.kind.tuition'));

/**
 * Paid boletos and NFS-e are separate paginated lists. Matching only invoice page 1 would hide
 * Baixar NFS-e once a charge's note sits further down. Stop when every charge on this history
 * page has been seen, the invoice list runs out, or the cap is hit.
 */
const invoicesCoveringCharges = async (schoolId: number, chargeIds: number[]) => {
  const pending = new Set(chargeIds);
  const collected: ServiceInvoice[] = [];

  if (pending.size === 0) {
    return collected;
  }

  for (let invoicePage = 1; invoicePage <= INVOICE_PAGE_CAP; invoicePage += 1) {
    const response = await listMyServiceInvoices({ schoolId, page: invoicePage });
    const batch = response.data ?? [];
    collected.push(...batch);

    for (const invoice of batch) {
      pending.delete(invoice.charge_id);
    }

    const perPage = response.meta.per_page;
    const shortPage = batch.length === 0 || perPage <= 0 || batch.length < perPage;
    const reachedEnd = response.meta.total > 0 && collected.length >= response.meta.total;

    if (pending.size === 0 || shortPage || reachedEnd) {
      break;
    }
  }

  return collected;
};

/** Maps guardian detail into the staff preview dialog's expected shape. */
const toPreviewCharge = (charge: MyCharge): Charge => ({
  id: charge.id,
  billing_period: charge.billing_period ?? '',
  original_amount_cents: charge.total_amount_cents,
  discount_amount_cents: 0,
  late_fee_amount_cents: 0,
  total_amount_cents: charge.total_amount_cents,
  due_date: charge.due_date,
  status: charge.status,
  kind: charge.kind,
  description: charge.description,
  boleto_url: charge.payment_methods.boleto_url,
  contract_id: charge.contract_id,
  student: charge.student,
  guardian: {
    id: 0,
    name: charge.student?.name ?? '',
    cpf: '',
  },
});

/**
 * The guardian's boletos: what is still open, what was already paid, and how to pay or reissue.
 *
 * Open and history are separate tabs because they answer different questions — what do I owe now,
 * versus what did I already settle — and mixing them would bury paid rows among debts.
 */
const MyCharges = () => {
  const { t, locale } = useTranslation();
  const school = useGuardianSchool();
  const schoolId = school?.school_id ?? null;

  const [tab, setTab] = useState<TabValue>('open');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const [openRows, setOpenRows] = useState<MyCharge[]>([]);
  const [historyRows, setHistoryRows] = useState<MyChargeHistory[]>([]);
  const [historyInvoices, setHistoryInvoices] = useState<ServiceInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);

  const [detail, setDetail] = useState<MyCharge | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [reissuing, setReissuing] = useState(false);
  const [previewing, setPreviewing] = useState<MyCharge | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    const studentFilter = studentId ? Number(studentId) : undefined;
    const apiPage = page + 1;

    try {
      if (tab === 'open') {
        const response = await listMyOpenCharges({
          schoolId,
          studentId: studentFilter,
          page: apiPage,
        });
        setOpenRows(response.data);
        setTotal(response.meta.total);
        setHistoryInvoices([]);
      } else {
        const historyResponse = await listMyChargeHistory({
          schoolId,
          studentId: studentFilter,
          page: apiPage,
        });
        const invoices = await invoicesCoveringCharges(
          schoolId,
          historyResponse.data.map((row) => row.id),
        );
        setHistoryRows(historyResponse.data);
        setTotal(historyResponse.meta.total);
        setHistoryInvoices(invoices);
      }
    } catch (err) {
      setOpenRows([]);
      setHistoryRows([]);
      setHistoryInvoices([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('myCharges.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, tab, studentId, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    const loadStudents = async () => {
      try {
        const response = await listMyStudents(schoolId);
        setStudents(response.data);
      } catch {
        setStudents([]);
      }
    };

    loadStudents();
  }, [schoolId]);

  // A different tab or child is a different list; page 4 of the previous one is not this list.
  const resetListing = () => {
    setPage(0);
    setLoading(true);
    setOpenRows([]);
    setHistoryRows([]);
    setHistoryInvoices([]);
    setTotal(0);
  };

  const openDetail = async (id: number) => {
    if (!schoolId) {
      return;
    }

    setDetail(null);
    setDetailLoading(true);
    setDetailError('');
    setPixCopied(false);

    try {
      setDetail(await getMyCharge(schoolId, id));
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : t('myCharges.detailError'));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailError('');
    setPixCopied(false);
  };

  const handleReissue = async () => {
    if (!schoolId || !detail) {
      return;
    }

    setReissuing(true);
    setDetailError('');
    setNotice('');

    try {
      const updated = await reissueMyCharge(schoolId, detail.id);
      setDetail(updated);
      setNotice(t('myCharges.reissueSuccess'));
      await load();
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : t('myCharges.reissueError'));
    } finally {
      setReissuing(false);
    }
  };

  const copyPix = async (pix: string) => {
    try {
      await navigator.clipboard.writeText(pix);
      setPixCopied(true);
    } catch {
      setDetailError(t('myCharges.pixCopyError'));
    }
  };

  const invoiceForCharge = (chargeId: number) =>
    historyInvoices.find(
      (invoice) =>
        invoice.charge_id === chargeId &&
        invoice.status === 'authorized' &&
        invoice.pdf_available,
    ) ?? null;

  const downloadInvoice = async (invoice: ServiceInvoice) => {
    if (!schoolId) {
      return;
    }

    setDownloadingInvoiceId(invoice.id);
    setError('');

    try {
      const blob = await downloadMyServiceInvoicePdf(schoolId, invoice.id);
      downloadBlob(blob, `nfse-${invoice.invoice_number ?? invoice.id}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('myCharges.invoicePdfError'));
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const openColumns: GridColDef<MyCharge>[] = [
    {
      field: 'status',
      headerName: t('common.status'),
      width: 130,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <SemanticChip variant={STATUS_VARIANT[row.status]} label={t(`charges.status.${row.status}`)} />
      ),
    },
    {
      field: 'total_amount_cents',
      headerName: t('common.amount'),
      width: 130,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <Typography variant="body2">{formatCents(row.total_amount_cents)}</Typography>
      ),
    },
    {
      field: 'due_date',
      headerName: t('charges.column.due'),
      width: 140,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <Typography variant="body2">{formatDate(row.due_date, locale)}</Typography>
      ),
    },
    {
      field: 'label',
      headerName: t('common.student'),
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <Typography variant="body2" color="text.secondary">
          {chargeLabel(row, t)}
        </Typography>
      ),
    },
    {
      field: 'pay',
      headerName: t('common.actions'),
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <Button size="small" variant="outlined" onClick={() => openDetail(row.id)}>
          {t('myCharges.viewDetail')}
        </Button>
      ),
    },
  ];

  const historyColumns: GridColDef<MyChargeHistory>[] = [
    {
      field: 'status',
      headerName: t('common.status'),
      width: 130,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyChargeHistory>) => (
        <SemanticChip variant={STATUS_VARIANT[row.status]} label={t(`charges.status.${row.status}`)} />
      ),
    },
    {
      field: 'total_amount_cents',
      headerName: t('common.amount'),
      width: 130,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyChargeHistory>) => (
        <Typography variant="body2">{formatCents(row.total_amount_cents)}</Typography>
      ),
    },
    {
      field: 'paid_at',
      headerName: t('myCharges.paidAt'),
      width: 160,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyChargeHistory>) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(row.paid_at).toLocaleDateString(locale === 'en-US' ? 'en-US' : 'pt-BR')}
        </Typography>
      ),
    },
    {
      field: 'label',
      headerName: t('common.student'),
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyChargeHistory>) => (
        <Typography variant="body2" color="text.secondary">
          {chargeLabel(row, t)}
        </Typography>
      ),
    },
    {
      field: 'invoice',
      headerName: t('common.actions'),
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<MyChargeHistory>) => {
        const invoice = invoiceForCharge(row.id);

        if (!invoice) {
          return null;
        }

        return (
          <Button
            size="small"
            variant="outlined"
            disabled={downloadingInvoiceId === invoice.id}
            startIcon={<IconifyIcon icon="mingcute:file-line" />}
            onClick={() => downloadInvoice(invoice)}
          >
            {downloadingInvoiceId === invoice.id
              ? t('myCharges.invoiceDownloading')
              : t('myCharges.downloadInvoice')}
          </Button>
        );
      },
    },
  ];

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.myCharges')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('myCharges.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  const rows = tab === 'open' ? openRows : historyRows;
  const columns = tab === 'open' ? openColumns : historyColumns;

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.myCharges')} />

      {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard padding={0}>
        <Box px={3.5} pt={3.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
            <Tabs
              value={tab}
              onChange={(_, value: TabValue) => {
                setTab(value);
                resetListing();
              }}
            >
              <Tab value="open" label={t('myCharges.tab.open')} />
              <Tab value="history" label={t('myCharges.tab.history')} />
            </Tabs>

            {students.length > 1 && (
              <TextField
                id="my-charges-child"
                label={t('guardians.charges.child')}
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value);
                  resetListing();
                }}
                variant="filled"
                size="small"
                select
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="">{t('guardians.charges.allChildren')}</MenuItem>
                {students.map((student) => (
                  <MenuItem key={student.id} value={String(student.id)}>
                    {student.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </Box>

        {!loading && rows.length === 0 && !error ? (
          <EmptyState
            title={tab === 'open' ? t('myCharges.empty.open.title') : t('myCharges.empty.history.title')}
            description={
              tab === 'open'
                ? t('myCharges.empty.open.description')
                : t('myCharges.empty.history.description')
            }
            headingLevel={3}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={rows}
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

      <Dialog open={detail !== null || detailLoading} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle>{t('myCharges.detail.title')}</DialogTitle>
        <DialogContent dividers>
          {detailError && (
            <ErrorBanner message={detailError} onRetry={() => detail && openDetail(detail.id)} retryLabel={t('common.tryAgain')} />
          )}

          {detailLoading && (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Stack>
          )}

          {detail && !detailLoading && (
            <Stack direction="column" gap={2}>
              <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
                <SemanticChip
                  variant={STATUS_VARIANT[detail.status]}
                  label={t(`charges.status.${detail.status}`)}
                />
                <Typography variant="subtitle1">{formatCents(detail.total_amount_cents)}</Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary">
                {t('charges.column.due')} {formatDate(detail.due_date, locale)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {chargeLabel(detail, t)}
              </Typography>

              {detail.interest_rate_percent !== null && (
                <Typography variant="body2" color="text.secondary">
                  {t('myCharges.interestRate', {
                    rate: String(detail.interest_rate_percent).replace('.', locale === 'en-US' ? '.' : ','),
                  })}
                </Typography>
              )}

              <Divider />

              <Typography variant="subtitle2">{t('myCharges.payment.title')}</Typography>

              {detail.payment_methods.boleto_url && (
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconifyIcon icon="mingcute:file-line" />}
                    onClick={() => setPreviewing(detail)}
                  >
                    {t('myCharges.payment.previewBoleto')}
                  </Button>
                  <Link href={detail.payment_methods.boleto_url} target="_blank" rel="noopener">
                    <Button
                      variant="text"
                      size="small"
                      startIcon={<IconifyIcon icon="mingcute:external-link-line" />}
                    >
                      {t('charges.open')}
                    </Button>
                  </Link>
                </Stack>
              )}

              {detail.payment_methods.pix_copy_paste && (
                <Stack direction="column" gap={1}>
                  <Typography variant="body2" color="text.secondary">
                    {t('myCharges.payment.pix')}
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    {detail.payment_methods.pix_copy_paste}
                  </Box>
                  <Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<IconifyIcon icon="mingcute:copy-2-line" />}
                      onClick={() => copyPix(detail.payment_methods.pix_copy_paste!)}
                    >
                      {pixCopied ? t('myCharges.payment.pixCopied') : t('myCharges.payment.copyPix')}
                    </Button>
                  </Box>
                </Stack>
              )}

              {!detail.payment_methods.boleto_url && !detail.payment_methods.pix_copy_paste && (
                <Typography variant="body2" color="text.secondary">
                  {t('myCharges.payment.unavailable')}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {detail && (detail.status === 'pending' || detail.status === 'overdue') && (
            <Button onClick={handleReissue} disabled={reissuing} variant="outlined">
              {reissuing ? t('myCharges.reissuing') : t('myCharges.reissue')}
            </Button>
          )}
          <Button onClick={closeDetail} variant="contained">
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <BoletoPreviewDialog
        open={previewing !== null}
        charge={previewing ? toPreviewCharge(previewing) : null}
        onClose={() => setPreviewing(null)}
      />
    </Stack>
  );
};

export default MyCharges;
