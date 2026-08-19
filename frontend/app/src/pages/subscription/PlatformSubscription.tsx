import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  InfoBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import {
  cancelSchoolPlatformSubscription,
  changeSchoolPlatformPlan,
  createSchoolCheckoutSession,
  getSchoolPlatformSubscription,
  listSchoolPlatformInvoices,
  listSchoolPlatformPlans,
} from 'services/platformSubscriptionApi';
import {
  amountForSchoolPlan,
  BillingInterval,
  SchoolPlatformInvoice,
  SchoolPlatformPlan,
  SchoolPlatformSubscription,
} from 'types/platformSubscription';
import { formatCents } from 'utils/money';
import { membershipHasPermission } from 'utils/onboarding/access';
import type { MessageKey } from 'locales';

const PAGE_SIZE = 25;

const STATUS_VARIANT: Record<
  SchoolPlatformSubscription['status'],
  'success' | 'warning' | 'error' | 'info'
> = {
  active: 'success',
  trialing: 'warning',
  past_due: 'error',
  canceled: 'info',
  incomplete: 'warning',
};

const planOptionLabel = (plan: SchoolPlatformPlan, interval: BillingInterval) => {
  const amount = amountForSchoolPlan(plan, interval);

  return amount == null ? plan.name : `${plan.name} (${formatCents(amount)})`;
};

const intervalOptionLabel = (
  label: string,
  plan: SchoolPlatformPlan | undefined,
  interval: BillingInterval,
) => {
  const amount = amountForSchoolPlan(plan, interval);

  return amount == null ? label : `${label} (${formatCents(amount)})`;
};

const intervalLabelKey = (interval: BillingInterval): MessageKey =>
  `platformSubscription.interval.${interval}`;

const firstInterval = (plan: SchoolPlatformPlan | undefined): BillingInterval =>
  plan?.intervals[0]?.billing_interval ?? 'month';

const isOverdueInvoice = (invoice: SchoolPlatformInvoice) =>
  invoice.status === 'open' &&
  invoice.due_at != null &&
  new Date(invoice.due_at).getTime() < Date.now();

const openHostedUrl = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

const formatDate = (iso: string | null | undefined, locale: string) => {
  if (!iso) {
    return '—';
  }

  return new Date(iso).toLocaleDateString(locale === 'en-US' ? 'en-US' : 'pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * DLA → school platform subscription. Isolated from tuition `/boletos` and `/planos`.
 */
const PlatformSubscriptionPage = () => {
  const { t, locale } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  const canManage = school != null && membershipHasPermission(school, 'manage_school_settings');

  const [subscription, setSubscription] = useState<SchoolPlatformSubscription | null>(null);
  const [plans, setPlans] = useState<SchoolPlatformPlan[]>([]);
  const [invoices, setInvoices] = useState<SchoolPlatformInvoice[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoicePage, setInvoicePage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [error, setError] = useState('');
  const [plansError, setPlansError] = useState('');
  const [actionError, setActionError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [planKey, setPlanKey] = useState('');
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [trial, setTrial] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [changePlanKey, setChangePlanKey] = useState('');
  const [changeInterval, setChangeInterval] = useState<BillingInterval>('month');
  const [changingPlan, setChangingPlan] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);

  const loadSubscription = useCallback(async () => {
    if (!schoolId || !canManage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const current = await getSchoolPlatformSubscription(schoolId);
      setSubscription(current);
      if (current) {
        setChangePlanKey(current.plan_key);
        setChangeInterval(current.billing_interval);
      }
    } catch (err) {
      setSubscription(null);
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(err instanceof ApiError ? err.message : t('platformSubscription.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [canManage, schoolId, t]);

  const loadPlans = useCallback(async () => {
    if (!schoolId || !canManage) {
      setPlansLoading(false);
      return;
    }

    setPlansLoading(true);
    setPlansError('');

    try {
      const catalog = await listSchoolPlatformPlans(schoolId);
      setPlans(catalog);
      setPlanKey((current) =>
        catalog.some((plan) => plan.key === current) ? current : (catalog[0]?.key ?? ''),
      );
    } catch (err) {
      setPlans([]);
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setPlansError(
          err instanceof ApiError ? err.message : t('platformSubscription.plansLoadError'),
        );
      }
    } finally {
      setPlansLoading(false);
    }
  }, [canManage, schoolId, t]);

  const loadInvoices = useCallback(async () => {
    if (!schoolId || !canManage || !subscription) {
      setInvoices([]);
      setInvoiceTotal(0);
      return;
    }

    setInvoicesLoading(true);

    try {
      const response = await listSchoolPlatformInvoices(schoolId, invoicePage + 1);
      setInvoices(response.data);
      setInvoiceTotal(response.meta.total);
    } catch (err) {
      setInvoices([]);
      setInvoiceTotal(0);
      setActionError(
        err instanceof ApiError ? err.message : t('platformSubscription.invoicesLoadError'),
      );
    } finally {
      setInvoicesLoading(false);
    }
  }, [canManage, invoicePage, schoolId, subscription, t]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const selectedCheckoutPlan = useMemo(
    () => plans.find((plan) => plan.key === planKey),
    [planKey, plans],
  );
  const selectedChangePlan = useMemo(
    () => plans.find((plan) => plan.key === changePlanKey),
    [changePlanKey, plans],
  );

  useEffect(() => {
    if (!selectedCheckoutPlan) {
      return;
    }
    if (!selectedCheckoutPlan.intervals.some((row) => row.billing_interval === interval)) {
      setInterval(firstInterval(selectedCheckoutPlan));
    }
  }, [interval, selectedCheckoutPlan]);

  useEffect(() => {
    if (!selectedChangePlan) {
      return;
    }
    if (!selectedChangePlan.intervals.some((row) => row.billing_interval === changeInterval)) {
      setChangeInterval(firstInterval(selectedChangePlan));
    }
  }, [changeInterval, selectedChangePlan]);

  const handleCheckout = async (event: FormEvent) => {
    event.preventDefault();
    if (!schoolId || !planKey) {
      return;
    }

    setCheckingOut(true);
    setActionError('');

    try {
      const session = await createSchoolCheckoutSession(schoolId, {
        plan_key: planKey,
        billing_interval: interval,
        trial,
      });
      if (session.checkout_url) {
        openHostedUrl(session.checkout_url);
      }
      await loadSubscription();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : t('platformSubscription.checkoutError'),
      );
    } finally {
      setCheckingOut(false);
    }
  };

  const handlePay = (url: string | null) => {
    if (url) {
      openHostedUrl(url);
    }
  };

  const handleChangePlan = async () => {
    if (!schoolId || !changePlanKey) {
      return;
    }

    setChangingPlan(true);
    setActionError('');

    try {
      const updated = await changeSchoolPlatformPlan(schoolId, {
        plan_key: changePlanKey,
        billing_interval: changeInterval,
      });
      setSubscription(updated);
      setChangePlanOpen(false);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : t('platformSubscription.changePlanError'),
      );
    } finally {
      setChangingPlan(false);
    }
  };

  const handleCancel = async () => {
    if (!schoolId) {
      return;
    }

    setActionError('');

    try {
      const updated = await cancelSchoolPlatformSubscription(schoolId, true);
      setSubscription(updated);
      setCancelOpen(false);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : t('platformSubscription.cancelError'),
      );
    }
  };

  const invoiceColumns: GridColDef<SchoolPlatformInvoice>[] = useMemo(
    () => [
      {
        field: 'status',
        headerName: t('common.status'),
        width: 140,
        renderCell: ({ row }: GridRenderCellParams<SchoolPlatformInvoice>) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <SemanticChip
              variant={
                row.status === 'paid'
                  ? 'success'
                  : isOverdueInvoice(row)
                    ? 'error'
                    : row.status === 'open'
                      ? 'warning'
                      : 'info'
              }
              label={t(`platformSubscription.invoiceStatus.${row.status}`)}
            />
            {isOverdueInvoice(row) && (
              <Typography variant="caption" color="error.main">
                {t('platformSubscription.overdue')}
              </Typography>
            )}
          </Stack>
        ),
      },
      {
        field: 'amount_cents',
        headerName: t('platformSubscription.amount'),
        width: 130,
        renderCell: ({ row }: GridRenderCellParams<SchoolPlatformInvoice>) => (
          <Typography variant="body2">{formatCents(row.amount_cents)}</Typography>
        ),
      },
      {
        field: 'due_at',
        headerName: t('platformSubscription.invoiceDue'),
        width: 140,
        renderCell: ({ row }: GridRenderCellParams<SchoolPlatformInvoice>) => (
          <Typography variant="body2">{formatDate(row.due_at, locale)}</Typography>
        ),
      },
      {
        field: 'paid_at',
        headerName: t('platformSubscription.invoicePaidAt'),
        width: 140,
        renderCell: ({ row }: GridRenderCellParams<SchoolPlatformInvoice>) => (
          <Typography variant="body2">{formatDate(row.paid_at, locale)}</Typography>
        ),
      },
      {
        field: 'payment_method',
        headerName: t('platformSubscription.paymentMethod'),
        flex: 1,
        minWidth: 120,
        renderCell: ({ row }: GridRenderCellParams<SchoolPlatformInvoice>) => (
          <Typography variant="body2">
            {row.payment_method
              ? t(`platformSubscription.paymentMethod.${row.payment_method}`)
              : '—'}
          </Typography>
        ),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 140,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<SchoolPlatformInvoice>) =>
          row.status === 'open' && row.hosted_invoice_url ? (
            <Button size="small" onClick={() => handlePay(row.hosted_invoice_url)}>
              {t('platformSubscription.payInvoice')}
            </Button>
          ) : row.hosted_invoice_url ? (
            <Button
              component={Link}
              href={row.hosted_invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
            >
              {t('platformSubscription.openInvoice')}
            </Button>
          ) : null,
      },
    ],
    [locale, t],
  );

  if (!school || !canManage || forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('platformSubscription.title')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('platformSubscription.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  if (loading || (!subscription && plansLoading)) {
    return (
      <Stack direction="column" alignItems="center" justifyContent="center" py={8}>
        <CircularProgress aria-label={t('platformSubscription.title')} />
      </Stack>
    );
  }

  const isManual = subscription?.collection_method === 'manual';
  const canMutate =
    Boolean(subscription) &&
    !isManual &&
    subscription!.status !== 'canceled';
  const payUrl =
    subscription?.open_invoice?.hosted_invoice_url ?? null;

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('platformSubscription.title')}
        subtitle={t('platformSubscription.subtitle')}
      />

      {error && <ErrorBanner message={error} />}
      {plansError && <ErrorBanner message={plansError} />}
      {actionError && <ErrorBanner message={actionError} />}

      {subscription?.status === 'past_due' && (
        <InfoBanner message={t('platformSubscription.pastDueBanner')} />
      )}

      {subscription ? (
        <SectionCard title={t('platformSubscription.title')} padding={3.5}>
          <Stack spacing={2.5}>
            {isManual && <InfoBanner message={t('platformSubscription.manualNotice')} />}
            {subscription.cancel_at_period_end && (
              <InfoBanner message={t('platformSubscription.cancelScheduled')} />
            )}
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('platformSubscription.plan')}
                </Typography>
                <Typography variant="body1">
                  {subscription.plan_name || subscription.plan_key}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('platformSubscription.interval')}
                </Typography>
                <Typography variant="body1">
                  {t(intervalLabelKey(subscription.billing_interval))}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('platformSubscription.status')}
                </Typography>
                <SemanticChip
                  variant={STATUS_VARIANT[subscription.status]}
                  label={t(`platformSubscription.status.${subscription.status}`)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('platformSubscription.amount')}
                </Typography>
                <Typography variant="body1">{formatCents(subscription.amount_cents)}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('platformSubscription.period')}
                </Typography>
                <Typography variant="body1">
                  {formatDate(subscription.current_period_start, locale)} —{' '}
                  {formatDate(subscription.current_period_end, locale)}
                </Typography>
              </Grid>
              {subscription.trial_ends_at && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('platformSubscription.trialEnds')}
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(subscription.trial_ends_at, locale)}
                  </Typography>
                </Grid>
              )}
            </Grid>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {payUrl && (
                <Button variant="contained" size="small" onClick={() => handlePay(payUrl)}>
                  {t('platformSubscription.payInvoice')}
                </Button>
              )}
              {canMutate && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const currentKey = subscription.plan_key;
                    const nextPlan =
                      plans.find((plan) => plan.key === currentKey) ?? plans[0];
                    if (nextPlan) {
                      setChangePlanKey(nextPlan.key);
                      setChangeInterval(
                        nextPlan.intervals.some(
                          (row) => row.billing_interval === subscription.billing_interval,
                        )
                          ? subscription.billing_interval
                          : firstInterval(nextPlan),
                      );
                    }
                    setChangePlanOpen(true);
                  }}
                >
                  {t('platformSubscription.changePlan')}
                </Button>
              )}
              {canMutate && !subscription.cancel_at_period_end && (
                <Button color="error" variant="outlined" size="small" onClick={() => setCancelOpen(true)}>
                  {t('platformSubscription.cancelAtPeriodEnd')}
                </Button>
              )}
            </Stack>
          </Stack>
        </SectionCard>
      ) : (
        <SectionCard title={t('platformSubscription.empty.title')} padding={3.5}>
          {plansError ? (
            <Typography variant="body2" color="text.secondary">
              {t('platformSubscription.empty.description')}
            </Typography>
          ) : plans.length === 0 ? (
            <EmptyState
              title={t('platformSubscription.plansEmpty.title')}
              description={t('platformSubscription.plansEmpty.description')}
              headingLevel={2}
            />
          ) : (
            <form onSubmit={handleCheckout}>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {t('platformSubscription.empty.description')}
                </Typography>
                <TextField
                  label={t('platformSubscription.plan')}
                  value={selectedCheckoutPlan?.key ?? ''}
                  onChange={(event) => setPlanKey(event.target.value)}
                  select
                  fullWidth
                  variant="filled"
                >
                  {plans.map((plan) => (
                    <MenuItem key={plan.key} value={plan.key}>
                      {planOptionLabel(plan, interval)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t('platformSubscription.interval')}
                  value={interval}
                  onChange={(event) => setInterval(event.target.value as BillingInterval)}
                  select
                  fullWidth
                  variant="filled"
                  disabled={!selectedCheckoutPlan}
                >
                  {(selectedCheckoutPlan?.intervals ?? []).map((row) => (
                    <MenuItem key={row.billing_interval} value={row.billing_interval}>
                      {intervalOptionLabel(
                        t(intervalLabelKey(row.billing_interval)),
                        selectedCheckoutPlan,
                        row.billing_interval,
                      )}
                    </MenuItem>
                  ))}
                </TextField>
                <FormControlLabel
                  control={
                    <Checkbox checked={trial} onChange={(event) => setTrial(event.target.checked)} />
                  }
                  label={t('platformSubscription.trial')}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={checkingOut || !selectedCheckoutPlan}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {t('platformSubscription.checkout')}
                </Button>
              </Stack>
            </form>
          )}
        </SectionCard>
      )}

      {subscription && (
        <SectionCard title={t('platformSubscription.invoices')} padding={0}>
          {invoices.length === 0 && !invoicesLoading ? (
            <EmptyState
              title={t('platformSubscription.invoicesEmpty')}
              description={t('platformSubscription.subtitle')}
            />
          ) : (
            <Box px={3.5} py={3.5} sx={{ height: 420, width: 1 }}>
              <DataTable
                rows={invoices}
                columns={invoiceColumns}
                loading={invoicesLoading}
                disableRowSelectionOnClick
                paginationMode="server"
                rowCount={invoiceTotal}
                pageSizeOptions={[PAGE_SIZE]}
                paginationModel={{ page: invoicePage, pageSize: PAGE_SIZE }}
                onPaginationModelChange={(model) => setInvoicePage(model.page)}
                rangeLabel={({ from, to, count }) => t('common.range', { from, to, count })}
              />
            </Box>
          )}
        </SectionCard>
      )}

      <Dialog
        open={changePlanOpen}
        onClose={() => !changingPlan && setChangePlanOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('platformSubscription.changePlanTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {plansError ? (
              <ErrorBanner message={plansError} />
            ) : plans.length === 0 ? (
              <EmptyState
                title={t('platformSubscription.plansEmpty.title')}
                description={t('platformSubscription.plansEmpty.description')}
                headingLevel={2}
              />
            ) : (
              <>
                <TextField
                  label={t('platformSubscription.plan')}
                  value={selectedChangePlan?.key ?? ''}
                  onChange={(event) => setChangePlanKey(event.target.value)}
                  select
                  fullWidth
                  variant="filled"
                >
                  {plans.map((plan) => (
                    <MenuItem key={plan.key} value={plan.key}>
                      {planOptionLabel(plan, changeInterval)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t('platformSubscription.interval')}
                  value={changeInterval}
                  onChange={(event) => setChangeInterval(event.target.value as BillingInterval)}
                  select
                  fullWidth
                  variant="filled"
                  disabled={!selectedChangePlan}
                >
                  {(selectedChangePlan?.intervals ?? []).map((row) => (
                    <MenuItem key={row.billing_interval} value={row.billing_interval}>
                      {intervalOptionLabel(
                        t(intervalLabelKey(row.billing_interval)),
                        selectedChangePlan,
                        row.billing_interval,
                      )}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePlanOpen(false)} disabled={changingPlan}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={changingPlan || !selectedChangePlan}
            onClick={handleChangePlan}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={cancelOpen}
        title={t('platformSubscription.cancelTitle')}
        message={t('platformSubscription.cancelMessage')}
        confirmLabel={t('platformSubscription.cancelConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </Stack>
  );
};

export default PlatformSubscriptionPage;
