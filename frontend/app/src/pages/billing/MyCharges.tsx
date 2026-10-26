import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormLabel from '@mui/material/FormLabel';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import type { Theme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import ToggleButton, { toggleButtonClasses } from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
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
  MyChargeListStatus,
  MyChargesPeriod,
  getMyCharge,
  listMyCharges,
  reissueMyCharge,
} from 'services/myChargesApi';
import { downloadMyServiceInvoicePdf, listMyServiceInvoices } from 'services/serviceInvoicesApi';
import { listMyStudents } from 'services/studentsApi';
import { Charge } from 'types/charge';
import { MyCharge } from 'types/myCharge';
import { ServiceInvoice } from 'types/serviceInvoice';
import { Student } from 'types/student';
import { formatCents } from 'utils/money';
import { downloadBlob } from 'utils/downloadBlob';
import type { MessageKey } from 'locales';

/** Pagy's default. The API ignores a client page size, so the grid asks for the same 25. */
const PAGE_SIZE = 25;

/**
 * Invoices and charges are separate paginated lists. Matching only invoice page 1 would hide
 * Baixar NFS-e once a charge's note sits further down. Stop when every charge on this page has
 * been seen, the invoice list runs out, or the cap is hit.
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

/** Timestamp (`paid_at`) → locale date in the viewer's timezone; ISO dates use `formatDate`. */
const formatTimestamp = (iso: string | null, locale: string) =>
  iso ? new Date(iso).toLocaleDateString(locale === 'en-US' ? 'en-US' : 'pt-BR') : '—';

type FilterMode = 'month' | 'range';

/** Ties the mode toggle to its visible label, so the group keeps an accessible name. */
const MODE_LABEL_ID = 'my-charges-mode-label';

/**
 * The mode toggle reads as one of the filter controls and as the primary Button: its selected
 * segment takes the same brand gradient and label as `containedPrimary`, and its frame takes the
 * text fields' border so the row matches. Every colour is a palette token; none is a literal.
 */
const modeToggleSx = (theme: Theme) => {
  const palette = (theme.vars || theme).palette;
  const primaryFill = `linear-gradient(128.49deg, ${palette.gradients.primary.main} 19.86%, ${palette.gradients.primary.state} 68.34%)`;

  return {
    // Same box as the small filled TextFields beside it (35px tall, 4px radius). sx multiplies a
    // bare `borderRadius` by the theme's shape, so `1` is the theme's 4px.
    height: 35,
    border: 1,
    borderStyle: 'solid',
    borderColor: palette.neutral.darker,
    ...theme.applyStyles('dark', { borderColor: palette.neutral.dark }),
    borderRadius: 1,
    background: palette.background.paper,
    overflow: 'hidden',

    [`& .${toggleButtonClasses.root}`]: {
      border: 0,
      borderRadius: 0,
      color: palette.text.secondary,
      letterSpacing: 0.5,
      fontWeight: 500,
      textTransform: 'none',
      px: 1.75,
      '&:hover': {
        color: palette.text.primary,
      },
    },
    [`& .${toggleButtonClasses.selected}, & .${toggleButtonClasses.selected}:hover`]: {
      // White is the label the primary Button uses on this gradient; waiver W3 in
      // docs/guidelines/web-ui/accessibility.md covers the same pairing.
      background: primaryFill,
      color: palette.common.white,
    },
  };
};

/** Past years a family may still look up, and one year ahead for boletos issued in advance. */
const YEARS_BACK = 4;
const YEARS_AHEAD = 1;

/** Guardian-facing tag: the staff-side "Vencido" reads as "Atrasado" to a family. */
const statusLabel = (status: MyCharge['status'], t: (key: MessageKey) => string) =>
  status === 'cancelled' ? t('charges.status.cancelled') : t(`myCharges.status.${status}`);

const chargeLabel = (charge: MyCharge, t: (key: MessageKey) => string) =>
  charge.kind === 'one_off'
    ? (charge.description ?? t('charges.kind.oneOff'))
    : (charge.student?.name ?? t('charges.kind.tuition'));

/**
 * Paid boletos and NFS-e are separate paginated lists. Matching only invoice page 1 would hide
 * Baixar NFS-e once a charge's note sits further down. Stop when every charge on this page has
 * been seen, the invoice list runs out, or the cap is hit.
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
 * The guardian's boletos: every status — pending, overdue, paid — in one list (latest due date
 * first, as the API orders it), narrowed server-side by status, child, and a due-date window
 * chosen either as month/year or as a from/to range. The two window shapes are exclusive
 * on the API, so switching mode clears the other one. A paid row only shows what was settled —
 * the API still returns its old slip data, which is never offered for payment.
 */
const MyCharges = () => {
  const { t, locale } = useTranslation();
  const school = useGuardianSchool();
  const schoolId = school?.school_id ?? null;

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const [rows, setRows] = useState<MyCharge[]>([]);
  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
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

  const latestRequest = useRef(0);

  const rangeInvalid =
    filterMode === 'range' && dueDateFrom && dueDateTo && dueDateFrom > dueDateTo;

  const period = useMemo<MyChargesPeriod | undefined>(() => {
    if (filterMode === 'month') {
      // A month without a year is not a valid API filter; the month select stays disabled then.
      return year
        ? { kind: 'month', year: Number(year), month: month ? Number(month) : undefined }
        : undefined;
    }

    return dueDateFrom || dueDateTo
      ? { kind: 'range', from: dueDateFrom || undefined, to: dueDateTo || undefined }
      : undefined;
  }, [filterMode, year, month, dueDateFrom, dueDateTo]);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    // An inverted range is blocked inline; asking the API would only come back as a 422.
    if (rangeInvalid) {
      setLoading(false);
      return;
    }

    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setLoading(true);
    setError('');

    const studentFilter = studentId ? Number(studentId) : undefined;
    const apiPage = page + 1;

    try {
      const response = await listMyCharges({
        schoolId,
        studentId: studentFilter,
        status: statusFilter ? [statusFilter as MyChargeListStatus] : 'all',
        period,
        page: apiPage,
      });
      const matchedInvoices = await invoicesCoveringCharges(
        schoolId,
        response.data.filter((row) => row.status === 'paid').map((row) => row.id),
      );
      if (requestId !== latestRequest.current) {
        return;
      }
      setRows(response.data);
      setTotal(response.meta.total);
      setInvoices(matchedInvoices);
    } catch (err) {
      if (requestId !== latestRequest.current) {
        return;
      }
      setRows([]);
      setInvoices([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('myCharges.loadError'));
    } finally {
      if (requestId === latestRequest.current) {
        setLoading(false);
      }
    }
  }, [schoolId, studentId, statusFilter, period, rangeInvalid, page, t]);

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

  // A different filter is a different list; page 4 of the previous one is not this list.
  const resetListing = () => {
    setPage(0);
    setLoading(true);
    setRows([]);
    setInvoices([]);
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
    invoices.find(
      (invoice) =>
        invoice.charge_id === chargeId && invoice.status === 'authorized' && invoice.pdf_available,
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

  const columns: GridColDef<MyCharge>[] = [
    {
      field: 'status',
      headerName: t('common.status'),
      width: 130,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <SemanticChip variant={STATUS_VARIANT[row.status]} label={statusLabel(row.status, t)} />
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
      width: 120,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <Typography variant="body2">{formatDate(row.due_date, locale)}</Typography>
      ),
    },
    {
      field: 'paid_at',
      headerName: t('myCharges.paidAt'),
      width: 140,
      sortable: false,
      // Pending and overdue rows have nothing to show here yet; paid is the only status that
      // ever populates it, but the column stays so a paid row never loses when it settled.
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <Typography variant="body2" color="text.secondary">
          {formatTimestamp(row.paid_at, locale)}
        </Typography>
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
      field: 'actions',
      headerName: t('common.actions'),
      width: 260,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => {
        const invoice = invoiceForCharge(row.id);

        return (
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" py={0.5}>
            <Button size="small" variant="outlined" onClick={() => openDetail(row.id)}>
              {row.status === 'paid' ? t('common.view') : t('myCharges.viewDetail')}
            </Button>
            {invoice && (
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
            )}
          </Stack>
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

  const hasActiveFilters = Boolean(
    studentId || statusFilter || year || month || dueDateFrom || dueDateTo,
  );

  const changeFilter = (apply: () => void) => {
    apply();
    resetListing();
  };

  const changeMode = (next: FilterMode) =>
    changeFilter(() => {
      // The API rejects month/year together with from/to, so only one window survives a switch.
      setFilterMode(next);
      setYear('');
      setMonth('');
      setDueDateFrom('');
      setDueDateTo('');
    });

  const clearFilters = () =>
    changeFilter(() => {
      setStudentId('');
      setStatusFilter('');
      setYear('');
      setMonth('');
      setDueDateFrom('');
      setDueDateTo('');
    });

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: YEARS_BACK + YEARS_AHEAD + 1 },
    (_, index) => currentYear + YEARS_AHEAD - index,
  );
  const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const name = new Date(2000, index, 1).toLocaleDateString(locale, { month: 'long' });

    return { value: String(index + 1), label: name.charAt(0).toUpperCase() + name.slice(1) };
  });

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.myCharges')} />

      {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard padding={0}>
        <Box px={3.5} pt={3.5}>
          <Stack direction="row" gap={1.5} alignItems="flex-start" flexWrap="wrap">
            <TextField
              id="my-charges-status"
              label={t('common.status')}
              value={statusFilter}
              onChange={(event) => changeFilter(() => setStatusFilter(event.target.value))}
              variant="filled"
              size="small"
              select
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">{t('charges.filter.all')}</MenuItem>
              <MenuItem value="pending">{t('myCharges.status.pending')}</MenuItem>
              <MenuItem value="overdue">{t('myCharges.status.overdue')}</MenuItem>
              <MenuItem value="paid">{t('myCharges.status.paid')}</MenuItem>
            </TextField>

            {students.length > 1 && (
              <TextField
                id="my-charges-child"
                label={t('guardians.charges.child')}
                value={studentId}
                onChange={(event) => changeFilter(() => setStudentId(event.target.value))}
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

            <Stack direction="column" gap={0.75} alignItems="flex-start" sx={{ minWidth: 0 }}>
              {/* The label slot every TextField gets above its field, so the toggle lines up with them. */}
              <FormLabel id={MODE_LABEL_ID} component="span">
                {t('myCharges.filter.mode')}
              </FormLabel>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={filterMode}
                aria-labelledby={MODE_LABEL_ID}
                onChange={(_event, next: FilterMode | null) => {
                  if (next && next !== filterMode) {
                    changeMode(next);
                  }
                }}
                sx={modeToggleSx}
              >
                <ToggleButton value="month">{t('myCharges.filter.mode.month')}</ToggleButton>
                <ToggleButton value="range">{t('myCharges.filter.mode.range')}</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {filterMode === 'month' ? (
              <>
                <TextField
                  id="my-charges-year"
                  label={t('common.year')}
                  value={year}
                  onChange={(event) =>
                    changeFilter(() => {
                      setYear(event.target.value);
                      // A month only means something inside a year.
                      if (!event.target.value) {
                        setMonth('');
                      }
                    })
                  }
                  variant="filled"
                  size="small"
                  select
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">{t('myCharges.filter.allYears')}</MenuItem>
                  {yearOptions.map((option) => (
                    <MenuItem key={option} value={String(option)}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>

                {/* Disabled until a year is picked: the API only takes a month inside a year. */}
                <Tooltip
                  title={t('myCharges.filter.monthNeedsYear')}
                  disableHoverListener={Boolean(year)}
                  disableFocusListener
                  disableTouchListener
                >
                  <Box component="span" sx={{ display: 'flex' }}>
                    <TextField
                      id="my-charges-month"
                      label={t('myCharges.filter.month')}
                      value={month}
                      onChange={(event) => changeFilter(() => setMonth(event.target.value))}
                      variant="filled"
                      size="small"
                      select
                      disabled={!year}
                      sx={{ minWidth: 160 }}
                    >
                      <MenuItem value="">{t('myCharges.filter.allMonths')}</MenuItem>
                      {monthOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                </Tooltip>
              </>
            ) : (
              <>
                <TextField
                  id="my-charges-due-date-from"
                  label={t('myCharges.filter.dueDateFrom')}
                  type="date"
                  value={dueDateFrom}
                  onChange={(event) => changeFilter(() => setDueDateFrom(event.target.value))}
                  variant="filled"
                  size="small"
                  error={Boolean(rangeInvalid)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <TextField
                  id="my-charges-due-date-to"
                  label={t('myCharges.filter.dueDateTo')}
                  type="date"
                  value={dueDateTo}
                  onChange={(event) => changeFilter(() => setDueDateTo(event.target.value))}
                  variant="filled"
                  size="small"
                  error={Boolean(rangeInvalid)}
                  helperText={rangeInvalid ? t('myCharges.filter.rangeInvalid') : undefined}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </>
            )}

            {hasActiveFilters && (
              <Button variant="text" size="small" onClick={clearFilters} sx={{ mt: 0.75 }}>
                {t('myCharges.filter.clear')}
              </Button>
            )}
          </Stack>
        </Box>

        {rangeInvalid ? null : !loading && rows.length === 0 && !error ? (
          <EmptyState
            title={hasActiveFilters ? t('charges.emptySearch.title') : t('myCharges.empty.title')}
            description={
              hasActiveFilters
                ? t('charges.emptySearch.description')
                : t('myCharges.empty.description')
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
            <ErrorBanner
              message={detailError}
              onRetry={() => detail && openDetail(detail.id)}
              retryLabel={t('common.tryAgain')}
            />
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
                  label={statusLabel(detail.status, t)}
                />
                <Typography variant="subtitle1">
                  {formatCents(detail.total_amount_cents)}
                </Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary">
                {t('charges.column.due')} {formatDate(detail.due_date, locale)}
              </Typography>
              {detail.paid_at && (
                <Typography variant="body2" color="text.secondary">
                  {t('myCharges.paidAt')} {formatTimestamp(detail.paid_at, locale)}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {chargeLabel(detail, t)}
              </Typography>

              {detail.interest_rate_percent !== null && (
                <Typography variant="body2" color="text.secondary">
                  {t('myCharges.interestRate', {
                    rate: String(detail.interest_rate_percent).replace(
                      '.',
                      locale === 'en-US' ? '.' : ',',
                    ),
                  })}
                </Typography>
              )}

              {detail.status !== 'paid' && (
                <>
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
                          {pixCopied
                            ? t('myCharges.payment.pixCopied')
                            : t('myCharges.payment.copyPix')}
                        </Button>
                      </Box>
                    </Stack>
                  )}

                  {!detail.payment_methods.boleto_url && !detail.payment_methods.pix_copy_paste && (
                    <Typography variant="body2" color="text.secondary">
                      {t('myCharges.payment.unavailable')}
                    </Typography>
                  )}
                </>
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
