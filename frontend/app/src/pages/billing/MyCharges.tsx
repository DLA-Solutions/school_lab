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
import IconifyIcon from 'components/base/IconifyIcon';
import BoletoPreviewDialog from 'components/sections/billing/charges/BoletoPreviewDialog';
import {
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

  const [openRows, setOpenRows] = useState<MyCharge[]>([]);
  const [historyRows, setHistoryRows] = useState<MyChargeHistory[]>([]);
  const [historyInvoices, setHistoryInvoices] = useState<ServiceInvoice[]>([]);
  const [loading, setLoading] = useState(false);
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

    try {
      if (tab === 'open') {
        const response = await listMyOpenCharges({ schoolId, studentId: studentFilter });
        setOpenRows(response.data);
        setHistoryInvoices([]);
      } else {
        const [historyResponse, invoicesResponse] = await Promise.all([
          listMyChargeHistory({ schoolId, studentId: studentFilter }),
          listMyServiceInvoices({ schoolId }),
        ]);
        setHistoryRows(historyResponse.data);
        setHistoryInvoices(invoicesResponse.data);
      }
    } catch (err) {
      setOpenRows([]);
      setHistoryRows([]);
      setError(err instanceof ApiError ? err.message : t('myCharges.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, tab, studentId, t]);

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

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.myCharges')} />

      {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
          <Tabs value={tab} onChange={(_, value: TabValue) => setTab(value)}>
            <Tab value="open" label={t('myCharges.tab.open')} />
            <Tab value="history" label={t('myCharges.tab.history')} />
          </Tabs>

          {students.length > 1 && (
            <TextField
              id="my-charges-child"
              label={t('guardians.charges.child')}
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
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

        {loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        ) : rows.length === 0 ? (
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
          <Stack direction="column" divider={<Divider />} mt={2}>
            {tab === 'open'
              ? openRows.map((row) => (
                  <Stack
                    key={row.id}
                    direction="row"
                    gap={1.5}
                    alignItems="center"
                    flexWrap="wrap"
                    py={2}
                  >
                    <SemanticChip
                      variant={STATUS_VARIANT[row.status]}
                      label={t(`charges.status.${row.status}`)}
                    />
                    <Typography variant="body2" sx={{ minWidth: 96 }}>
                      {formatCents(row.total_amount_cents)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('charges.column.due')} {formatDate(row.due_date, locale)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {chargeLabel(row, t)}
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => openDetail(row.id)}>
                      {t('myCharges.viewDetail')}
                    </Button>
                  </Stack>
                ))
              : historyRows.map((row) => {
                  const invoice = invoiceForCharge(row.id);

                  return (
                  <Stack
                    key={row.id}
                    direction="row"
                    gap={1.5}
                    alignItems="center"
                    flexWrap="wrap"
                    py={2}
                  >
                    <SemanticChip variant="success" label={t('charges.status.paid')} />
                    <Typography variant="body2" sx={{ minWidth: 96 }}>
                      {formatCents(row.total_amount_cents)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('myCharges.paidAt')}{' '}
                      {new Date(row.paid_at).toLocaleDateString(locale === 'en-US' ? 'en-US' : 'pt-BR')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {chargeLabel(row, t)}
                    </Typography>
                    {invoice ? (
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
                    ) : null}
                  </Stack>
                  );
                })}
          </Stack>
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
