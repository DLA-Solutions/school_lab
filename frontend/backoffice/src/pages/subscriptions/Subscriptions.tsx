import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
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
import { ApiError } from 'services/api';
import {
  createCheckoutSession,
  createSubscription,
  listPlans,
  listSubscriptionInvoices,
  listSubscriptions,
  updateSubscription,
} from 'services/subscriptionsApi';
import {
  ASSIGNABLE_PROVIDERS,
  BILLING_INTERVALS,
  BillingInterval,
  PlatformInvoice,
  PlatformPlan,
  PlatformSubscription,
  SUBSCRIPTION_STATUSES,
  SubscriptionListFilters,
  SubscriptionProvider,
  SubscriptionStatus,
  amountForPlan,
} from 'types/subscription';

const PAGE_SIZE = 25;
const ALL_STATUS = 'all';

type StatusFilter = SubscriptionStatus | typeof ALL_STATUS;

type FormState = {
  school_id: string;
  platform_plan_id: string;
  billing_interval: BillingInterval;
  provider: SubscriptionProvider;
  status: SubscriptionStatus;
  trial: boolean;
};

const emptyForm = (): FormState => ({
  school_id: '',
  platform_plan_id: '',
  billing_interval: 'month',
  provider: 'manual',
  status: 'active',
  trial: false,
});

const STATUS_CHIP: Record<SubscriptionStatus, { variant: 'success' | 'warning' | 'error' | 'info' }> =
  {
    active: { variant: 'success' },
    trialing: { variant: 'warning' },
    past_due: { variant: 'error' },
    canceled: { variant: 'info' },
    incomplete: { variant: 'warning' },
  };

const formatCurrency = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (iso: string | null | undefined) => {
  if (!iso) {
    return '—';
  }

  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const isManualSubscription = (subscription: PlatformSubscription) =>
  subscription.provider == null || subscription.provider === 'manual';

const canCheckout = (subscription: PlatformSubscription) =>
  !isManualSubscription(subscription) && subscription.status !== 'canceled';

const isOverdueInvoice = (invoice: PlatformInvoice) =>
  invoice.status === 'open' &&
  invoice.due_at != null &&
  new Date(invoice.due_at).getTime() < Date.now();

const openHostedUrl = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Platform SaaS subscriptions — assign and manage billing plans per school.
 */
const Subscriptions = () => {
  const { t } = useTranslation();

  const [subscriptions, setSubscriptions] = useState<PlatformSubscription[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUS);
  const [schoolIdFilter, setSchoolIdFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformSubscription | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkingOutId, setCheckingOutId] = useState<number | null>(null);

  const [invoicesFor, setInvoicesFor] = useState<PlatformSubscription | null>(null);
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState('');

  const listFilters = useMemo<SubscriptionListFilters>(
    () => ({
      status: statusFilter === ALL_STATUS ? '' : statusFilter,
      school_id: schoolIdFilter.trim(),
    }),
    [schoolIdFilter, statusFilter],
  );

  useEffect(() => {
    listPlans()
      .then(setPlans)
      .catch(() => {
        /* plans optional for list view */
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listSubscriptions(page + 1, listFilters);
      setSubscriptions(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setSubscriptions([]);
      setTotal(0);

      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(
          err instanceof ApiError ? err.message : t('backoffice.subscriptions.loadError'),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [listFilters, page, t]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, schoolIdFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (subscription: PlatformSubscription) => {
    setEditing(subscription);
    setForm({
      school_id: String(subscription.school_id),
      platform_plan_id: String(subscription.platform_plan_id),
      billing_interval: subscription.billing_interval ?? 'month',
      provider: subscription.provider ?? 'manual',
      status: subscription.status,
      trial: false,
    });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (!saving) {
      setFormOpen(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      if (editing) {
        await updateSubscription(editing.id, {
          status: form.status,
        });
      } else {
        await createSubscription({
          school_id: Number(form.school_id),
          platform_plan_id: Number(form.platform_plan_id),
          billing_interval: form.billing_interval,
          provider: form.provider,
          trial: form.trial,
          status: form.provider === 'manual' ? form.status : undefined,
        });
        setPage(0);
      }

      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : t('backoffice.subscriptions.saveError'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (subscription: PlatformSubscription) => {
    setCheckingOutId(subscription.id);
    setCheckoutError('');

    try {
      const session = await createCheckoutSession(subscription.id);
      setCheckoutUrl(session.checkout_url);
      if (session.checkout_url) {
        openHostedUrl(session.checkout_url);
      }
    } catch (err) {
      setCheckoutError(
        err instanceof ApiError ? err.message : t('backoffice.subscriptions.checkoutError'),
      );
    } finally {
      setCheckingOutId(null);
    }
  };

  const openInvoices = async (subscription: PlatformSubscription) => {
    setInvoicesFor(subscription);
    setInvoices([]);
    setInvoicesError('');
    setInvoicesLoading(true);

    try {
      const response = await listSubscriptionInvoices(subscription.id, 1);
      setInvoices(response.data);
    } catch (err) {
      setInvoicesError(
        err instanceof ApiError ? err.message : t('backoffice.subscriptions.invoicesLoadError'),
      );
    } finally {
      setInvoicesLoading(false);
    }
  };

  const selectedPlan = plans.find((plan) => String(plan.id) === form.platform_plan_id);
  const selectedAmount = amountForPlan(selectedPlan, form.billing_interval, form.provider);

  const columns: GridColDef<PlatformSubscription>[] = [
    {
      field: 'school_id',
      headerName: t('backoffice.subscriptions.schoolId'),
      width: 100,
    },
    {
      field: 'school_name',
      headerName: t('backoffice.subscriptions.schoolName'),
      flex: 1,
      minWidth: 160,
      valueGetter: (_value, row) => row.school?.name ?? null,
      renderCell: renderOptionalText,
    },
    {
      field: 'plan_name',
      headerName: t('backoffice.subscriptions.plan'),
      flex: 1,
      minWidth: 120,
      valueGetter: (_value, row) => row.platform_plan?.name ?? null,
      renderCell: renderOptionalText,
    },
    {
      field: 'billing_interval',
      headerName: t('backoffice.subscriptions.interval'),
      width: 110,
      renderCell: ({ row }: GridRenderCellParams<PlatformSubscription>) => (
        <Typography variant="body2">
          {row.billing_interval
            ? t(`backoffice.subscriptions.interval.${row.billing_interval}`)
            : '—'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: t('backoffice.subscriptions.status'),
      width: 140,
      renderCell: ({ row }: GridRenderCellParams<PlatformSubscription>) => {
        const meta = STATUS_CHIP[row.status];
        return (
          <SemanticChip
            variant={meta.variant}
            label={t(`backoffice.subscriptions.status.${row.status}`)}
          />
        );
      },
    },
    {
      field: 'monthly_amount',
      headerName: t('backoffice.subscriptions.monthlyAmount'),
      width: 130,
      sortable: false,
      valueGetter: (_value, row) =>
        amountForPlan(row.platform_plan, row.billing_interval, row.provider),
      renderCell: ({ value }: GridRenderCellParams<PlatformSubscription, number | null>) =>
        value != null ? (
          <Typography variant="body2">{formatCurrency(value)}</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      field: 'provider',
      headerName: t('backoffice.subscriptions.provider'),
      width: 110,
      renderCell: ({ row }: GridRenderCellParams<PlatformSubscription>) => (
        <Typography variant="body2">
          {row.provider
            ? t(`backoffice.subscriptions.provider.${row.provider}`)
            : t('backoffice.subscriptions.provider.manual')}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: t('backoffice.subscriptions.actions'),
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<PlatformSubscription>) => (
        <Stack direction="row" spacing={0.5}>
          {isManualSubscription(row) && (
            <Tooltip title={t('backoffice.subscriptions.edit')}>
              <IconButton
                size="small"
                aria-label={t('backoffice.subscriptions.edit')}
                onClick={() => openEdit(row)}
              >
                <IconifyIcon icon="mingcute:edit-2-line" />
              </IconButton>
            </Tooltip>
          )}
          {canCheckout(row) && (
            <Tooltip title={t('backoffice.subscriptions.sendCheckout')}>
              <IconButton
                size="small"
                aria-label={t('backoffice.subscriptions.sendCheckout')}
                disabled={checkingOutId === row.id}
                onClick={() => handleCheckout(row)}
              >
                <IconifyIcon icon="mingcute:send-line" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('backoffice.subscriptions.viewInvoices')}>
            <IconButton
              size="small"
              aria-label={t('backoffice.subscriptions.viewInvoices')}
              onClick={() => openInvoices(row)}
            >
              <IconifyIcon icon="mingcute:bill-line" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  if (forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('backoffice.subscriptions.title')} />
        <SectionCard>
          <EmptyState
            title={t('backoffice.subscriptions.noAccess.title')}
            description={t('backoffice.subscriptions.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('backoffice.subscriptions.title')}
        subtitle={t('backoffice.subscriptions.subtitle')}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              label={t('backoffice.subscriptions.filterSchoolId')}
              value={schoolIdFilter}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSchoolIdFilter(event.target.value)}
              size="small"
              variant="filled"
              sx={{ width: 130 }}
            />
            <TextField
              label={t('backoffice.subscriptions.filterStatus')}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              select
              size="small"
              variant="filled"
              sx={{ width: 160 }}
            >
              <MenuItem value={ALL_STATUS}>{t('backoffice.subscriptions.statusAll')}</MenuItem>
              {SUBSCRIPTION_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {t(`backoffice.subscriptions.status.${status}`)}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" size="small" onClick={openCreate}>
              {t('backoffice.subscriptions.create')}
            </Button>
          </Stack>
        }
      />

      {error && <ErrorBanner message={error} />}
      {checkoutError && <ErrorBanner message={checkoutError} />}

      <SectionCard padding={0}>
        {!loading && subscriptions.length === 0 && !error ? (
          <EmptyState
            title={t('backoffice.subscriptions.empty')}
            description={t('backoffice.subscriptions.subtitle')}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={subscriptions}
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

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editing
              ? t('backoffice.subscriptions.editTitle')
              : t('backoffice.subscriptions.createTitle')}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              {formError && <ErrorBanner message={formError} />}
              {editing && (
                <Typography variant="body2" color="text.secondary">
                  {t('backoffice.subscriptions.manualOnlyHint')}
                </Typography>
              )}
              <TextField
                label={t('backoffice.subscriptions.schoolId')}
                value={form.school_id}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({ ...current, school_id: event.target.value }))
                }
                required
                disabled={Boolean(editing)}
                fullWidth
                variant="filled"
                type="number"
              />
              {!editing && (
                <>
                  <TextField
                    label={t('backoffice.subscriptions.plan')}
                    value={form.platform_plan_id}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setForm((current) => ({ ...current, platform_plan_id: event.target.value }))
                    }
                    required
                    select
                    fullWidth
                    variant="filled"
                  >
                    {plans.map((plan) => (
                      <MenuItem key={plan.id} value={String(plan.id)}>
                        {plan.name}
                        {amountForPlan(plan, form.billing_interval, form.provider) != null
                          ? ` (${formatCurrency(amountForPlan(plan, form.billing_interval, form.provider)!)})`
                          : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label={t('backoffice.subscriptions.interval')}
                    value={form.billing_interval}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setForm((current) => ({
                        ...current,
                        billing_interval: event.target.value as BillingInterval,
                      }))
                    }
                    select
                    fullWidth
                    variant="filled"
                  >
                    {BILLING_INTERVALS.map((interval) => (
                      <MenuItem key={interval} value={interval}>
                        {t(`backoffice.subscriptions.interval.${interval}`)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label={t('backoffice.subscriptions.provider')}
                    value={form.provider}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setForm((current) => ({
                        ...current,
                        provider: event.target.value as SubscriptionProvider,
                      }))
                    }
                    select
                    fullWidth
                    variant="filled"
                  >
                    {ASSIGNABLE_PROVIDERS.map((provider) => (
                      <MenuItem key={provider} value={provider}>
                        {t(`backoffice.subscriptions.provider.${provider}`)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.trial}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, trial: event.target.checked }))
                        }
                      />
                    }
                    label={t('backoffice.subscriptions.trial')}
                  />
                </>
              )}
              {(editing || form.provider === 'manual') && (
                <TextField
                  label={t('backoffice.subscriptions.status')}
                  value={form.status}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as SubscriptionStatus,
                    }))
                  }
                  select
                  fullWidth
                  variant="filled"
                >
                  {SUBSCRIPTION_STATUSES.filter((status) => status !== 'canceled').map((status) => (
                    <MenuItem key={status} value={status}>
                      {t(`backoffice.subscriptions.status.${status}`)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {selectedAmount != null && !editing && (
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(selectedAmount)}
                </Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeForm} disabled={saving}>
              {t('backoffice.subscriptions.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                saving ||
                (!editing && (!form.platform_plan_id || !form.school_id.trim()))
              }
            >
              {t('backoffice.subscriptions.save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={Boolean(checkoutUrl)} onClose={() => setCheckoutUrl('')} fullWidth maxWidth="sm">
        <DialogTitle>{t('backoffice.subscriptions.checkoutTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
              {t('backoffice.subscriptions.checkoutHelp')}
            </Typography>
            <TextField
              label={t('backoffice.subscriptions.checkoutUrl')}
              value={checkoutUrl}
              fullWidth
              variant="filled"
              slotProps={{ input: { readOnly: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutUrl('')}>{t('backoffice.subscriptions.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => {
              openHostedUrl(checkoutUrl);
            }}
          >
            {t('backoffice.subscriptions.openCheckout')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(invoicesFor)}
        onClose={() => setInvoicesFor(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{t('backoffice.subscriptions.invoicesTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {invoicesError && <ErrorBanner message={invoicesError} />}
            {!invoicesLoading && invoices.length === 0 && !invoicesError ? (
              <Typography variant="body2" color="text.secondary">
                {t('backoffice.subscriptions.invoicesEmpty')}
              </Typography>
            ) : (
              invoices.map((invoice) => (
                <Stack
                  key={invoice.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack spacing={0.25}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <SemanticChip
                        variant={
                          invoice.status === 'paid'
                            ? 'success'
                            : isOverdueInvoice(invoice)
                              ? 'error'
                              : invoice.status === 'open'
                                ? 'warning'
                                : 'info'
                        }
                        label={t(`backoffice.subscriptions.invoiceStatus.${invoice.status}`)}
                      />
                      {isOverdueInvoice(invoice) && (
                        <Typography variant="caption" color="error.main">
                          {t('backoffice.subscriptions.overdue')}
                        </Typography>
                      )}
                    </Stack>
                    <Typography variant="body2">
                      {formatCurrency(invoice.amount_cents)} · {t('backoffice.subscriptions.invoiceDue')}{' '}
                      {formatDate(invoice.due_at)}
                      {invoice.payment_method
                        ? ` · ${t(`backoffice.subscriptions.paymentMethod.${invoice.payment_method}`)}`
                        : ''}
                    </Typography>
                  </Stack>
                  {invoice.hosted_invoice_url && (
                    <Button
                      component={Link}
                      href={invoice.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                    >
                      {t('backoffice.subscriptions.openInvoice')}
                    </Button>
                  )}
                </Stack>
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoicesFor(null)}>{t('backoffice.subscriptions.cancel')}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

const renderOptionalText = ({ value }: GridRenderCellParams<PlatformSubscription, string | null>) =>
  value ? (
    <Typography variant="body2">{value}</Typography>
  ) : (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );

export default Subscriptions;
