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
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import {
  MyChargeListStatus,
  MyChargesPeriod,
  fetchMyChargeBoletoPdf,
  getMyCharge,
  listMyCharges,
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

/**
 * Banco Inter issues asynchronously: a charge can sit with no Pix, no linha digitável and no PDF
 * for a while after it is issued (the API keeps re-reading the bank for roughly 43 minutes). The
 * open detail asks again on this cadence and gives up after the attempt cap — about ten minutes —
 * leaving a manual "check again" instead of polling a charge that may never get data.
 */
const GENERATION_POLL_MS = 20_000;
const GENERATION_POLL_MAX_ATTEMPTS = 30;

/**
 * True while a payable charge has nothing to pay with yet. A hosted link (Cora), the Pix code, the
 * linha digitável or an available PDF each count as data, so a charge that already has one never
 * waits.
 */
const isGeneratingBoleto = (charge: MyCharge) => {
  const methods = charge.payment_methods;

  return (
    (charge.status === 'pending' || charge.status === 'overdue') &&
    !methods.boleto_url &&
    !methods.pix_copy_paste &&
    !methods.digitable_line &&
    !methods.boleto_pdf_available
  );
};

/**
 * True when the guardian has a boleto to look at: a hosted file (Cora `boleto_url`) or a PDF the
 * API relays (Inter `boleto_pdf_available`). A cancelled charge never offers one, and a charge
 * still being generated has neither yet, so neither gets a button that would open an empty dialog.
 */
const hasViewableBoleto = (charge: MyCharge) =>
  charge.status !== 'cancelled' &&
  Boolean(charge.payment_methods.boleto_url || charge.payment_methods.boleto_pdf_available);

/** A copyable payment code shown in a box: wraps instead of widening the dialog. */
const CODE_BOX_SX = {
  p: 1.5,
  borderRadius: 1,
  bgcolor: 'action.hover',
  fontFamily: 'monospace',
  fontSize: '0.75rem',
  overflowWrap: 'anywhere',
} as const;

type CopiedCode = 'pix' | 'digitableLine';

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
 * What the Nota fiscal cell shows for a charge, from the invoices the API returned for it.
 * - `download`: authorized and its PDF is attached.
 * - `issuing`: the note exists but is not ready — pending/enqueued at Spedy, or authorized while
 *   the webhook has not attached the PDF yet.
 * - `none`: no invoice, or one the guardian cannot act on. `rejected`, `failed` and `canceled` are
 *   internal fiscal outcomes the school resolves; the guardian sees a plain "—" rather than an
 *   error they cannot fix. A paid charge with no invoice record also shows "—": the school may not
 *   issue NFS-e at all, so promising "awaiting issuance" could stay on screen forever.
 */
type InvoiceCell =
  | { kind: 'download'; invoice: ServiceInvoice }
  | { kind: 'issuing' }
  | { kind: 'none' };

/**
 * One invoice per charge for display. A charge can carry several (a re-issue after a failure):
 * the authorized one wins, otherwise the most recent — the highest id, as ids grow with creation.
 */
const pickInvoice = (invoices: ServiceInvoice[], chargeId: number) => {
  const candidates = invoices.filter((invoice) => invoice.charge_id === chargeId);

  return (
    [...candidates].sort((a, b) => {
      const authorizedDelta = Number(b.status === 'authorized') - Number(a.status === 'authorized');

      return authorizedDelta !== 0 ? authorizedDelta : b.id - a.id;
    })[0] ?? null
  );
};

const invoiceCell = (invoice: ServiceInvoice | null): InvoiceCell => {
  if (!invoice) {
    return { kind: 'none' };
  }

  switch (invoice.status) {
    case 'authorized':
      return invoice.pdf_available ? { kind: 'download', invoice } : { kind: 'issuing' };
    case 'pending':
    case 'enqueued':
      return { kind: 'issuing' };
    default:
      return { kind: 'none' };
  }
};

/**
 * Paid boletos and NFS-e are separate paginated lists. Matching only invoice page 1 would hide
 * the Nota fiscal cell's state once a charge's note sits further down. Invoices of every status
 * count (an in-flight note is shown as "issuing"). Stop when every charge on this page has been
 * seen, the invoice list runs out, or the cap is hit.
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
  payment_methods: charge.payment_methods,
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
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);

  const [detail, setDetail] = useState<MyCharge | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [previewing, setPreviewing] = useState<MyCharge | null>(null);
  const [copied, setCopied] = useState<CopiedCode | null>(null);
  const [generationStalled, setGenerationStalled] = useState(false);

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
    setCopied(null);
    setGenerationStalled(false);

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
    setCopied(null);
    setGenerationStalled(false);
  };

  const copyCode = async (code: CopiedCode, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(code);
    } catch {
      setDetailError(
        t(code === 'pix' ? 'myCharges.pixCopyError' : 'myCharges.digitableLineCopyError'),
      );
    }
  };

  const generating = detail !== null && !detailLoading && isGeneratingBoleto(detail);
  const generatingChargeId = generating ? detail.id : null;

  // While the bank is still producing the boleto, ask for the charge again until it has data.
  // One request at a time: the next timer is armed only after the previous answer lands, and every
  // exit — data arriving, the dialog closing, another charge opening, unmount — clears the timer
  // and discards a late answer, so nothing keeps polling in the background.
  useEffect(() => {
    if (!schoolId || generatingChargeId === null || generationStalled) {
      return undefined;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const schedule = () => {
      timer = setTimeout(async () => {
        attempts += 1;

        try {
          const fresh = await getMyCharge(schoolId, generatingChargeId);
          if (cancelled) {
            return;
          }
          setDetail(fresh);

          // Data arrived: the effect is torn down by the re-render, nothing more to arm.
          if (!isGeneratingBoleto(fresh)) {
            return;
          }
        } catch {
          // A failed poll is not worth interrupting the guardian for; the next attempt retries.
          if (cancelled) {
            return;
          }
        }

        if (attempts >= GENERATION_POLL_MAX_ATTEMPTS) {
          setGenerationStalled(true);
          return;
        }

        schedule();
      }, GENERATION_POLL_MS);
    };

    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [schoolId, generatingChargeId, generationStalled]);

  const invoiceForCharge = (chargeId: number) => pickInvoice(invoices, chargeId);

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
      width: 120,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <SemanticChip variant={STATUS_VARIANT[row.status]} label={statusLabel(row.status, t)} />
      ),
    },
    {
      field: 'total_amount_cents',
      headerName: t('common.amount'),
      width: 110,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <Typography variant="body2">{formatCents(row.total_amount_cents)}</Typography>
      ),
    },
    {
      field: 'due_date',
      headerName: t('charges.column.due'),
      width: 110,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <Typography variant="body2">{formatDate(row.due_date, locale)}</Typography>
      ),
    },
    {
      field: 'paid_at',
      headerName: t('myCharges.paidAt'),
      width: 120,
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
      minWidth: 140,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <Typography variant="body2" color="text.secondary">
          {chargeLabel(row, t)}
        </Typography>
      ),
    },
    {
      field: 'invoice',
      headerName: t('myCharges.column.invoice'),
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => {
        // An NFS-e only follows a baixa, so an unpaid row is always "—" whatever the list holds.
        const cell = invoiceCell(row.status === 'paid' ? invoiceForCharge(row.id) : null);

        if (cell.kind === 'download') {
          const { invoice } = cell;

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
        }

        if (cell.kind === 'issuing') {
          return <SemanticChip variant="info" label={t('myCharges.invoice.issuing')} />;
        }

        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 240,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<MyCharge>) => (
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" py={0.5}>
          <Button size="small" variant="outlined" onClick={() => openDetail(row.id)}>
            {row.status === 'paid' ? t('common.view') : t('myCharges.viewDetail')}
          </Button>
        </Stack>
      ),
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

                  {generating && !generationStalled && (
                    <Stack direction="row" gap={1.5} alignItems="center">
                      <CircularProgress size={20} aria-hidden sx={{ flexShrink: 0 }} />
                      <Box role="status">
                        <Typography variant="body2">
                          {t('myCharges.payment.generating.title')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('myCharges.payment.generating.description')}
                        </Typography>
                      </Box>
                    </Stack>
                  )}

                  {generating && generationStalled && (
                    <Stack direction="column" gap={1} alignItems="flex-start">
                      <Typography variant="body2" color="text.secondary">
                        {t('myCharges.payment.generating.stalled')}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setGenerationStalled(false)}
                      >
                        {t('myCharges.payment.generating.checkAgain')}
                      </Button>
                    </Stack>
                  )}

                  {hasViewableBoleto(detail) && (
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<IconifyIcon icon="mingcute:file-line" />}
                        onClick={() => setPreviewing(detail)}
                      >
                        {detail.payment_methods.boleto_pdf_available
                          ? t('myCharges.payment.previewBoletoPdf')
                          : t('myCharges.payment.previewBoleto')}
                      </Button>
                      {detail.payment_methods.boleto_url && (
                        <Link
                          href={detail.payment_methods.boleto_url}
                          target="_blank"
                          rel="noopener"
                        >
                          <Button
                            variant="text"
                            size="small"
                            startIcon={<IconifyIcon icon="mingcute:external-link-line" />}
                          >
                            {t('charges.open')}
                          </Button>
                        </Link>
                      )}
                    </Stack>
                  )}

                  {detail.payment_methods.pix_copy_paste && (
                    <Stack direction="column" gap={1}>
                      <Typography variant="body2" color="text.secondary">
                        {t('myCharges.payment.pix')}
                      </Typography>
                      <Box sx={CODE_BOX_SX}>{detail.payment_methods.pix_copy_paste}</Box>
                      <Box>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<IconifyIcon icon="mingcute:copy-2-line" />}
                          onClick={() => copyCode('pix', detail.payment_methods.pix_copy_paste!)}
                        >
                          {copied === 'pix'
                            ? t('myCharges.payment.pixCopied')
                            : t('myCharges.payment.copyPix')}
                        </Button>
                      </Box>
                    </Stack>
                  )}

                  {detail.payment_methods.digitable_line && (
                    <Stack direction="column" gap={1}>
                      <Typography variant="body2" color="text.secondary">
                        {t('myCharges.payment.digitableLine')}
                      </Typography>
                      <Box sx={CODE_BOX_SX}>{detail.payment_methods.digitable_line}</Box>
                      <Box>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<IconifyIcon icon="mingcute:copy-2-line" />}
                          onClick={() =>
                            // As shown, dots and spaces included: bank apps accept the formatted
                            // line, and what the guardian reads on screen is what lands in the app.
                            copyCode('digitableLine', detail.payment_methods.digitable_line!)
                          }
                        >
                          {copied === 'digitableLine'
                            ? t('myCharges.payment.digitableLineCopied')
                            : t('myCharges.payment.copyDigitableLine')}
                        </Button>
                      </Box>
                    </Stack>
                  )}

                  {!generating &&
                    !detail.payment_methods.boleto_url &&
                    !detail.payment_methods.boleto_pdf_available &&
                    !detail.payment_methods.pix_copy_paste &&
                    !detail.payment_methods.digitable_line && (
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
          <Button onClick={closeDetail} variant="contained">
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <BoletoPreviewDialog
        open={previewing !== null}
        charge={previewing ? toPreviewCharge(previewing) : null}
        onClose={() => setPreviewing(null)}
        // An Inter boleto has no public URL: the API relays the PDF behind the bearer token. A
        // hosted one (Cora) keeps going straight to the bank through `boleto_url`.
        loadBlob={
          previewing?.payment_methods.boleto_pdf_available && schoolId
            ? () => fetchMyChargeBoletoPdf(schoolId, previewing.id)
            : undefined
        }
      />
    </Stack>
  );
};

export default MyCharges;
