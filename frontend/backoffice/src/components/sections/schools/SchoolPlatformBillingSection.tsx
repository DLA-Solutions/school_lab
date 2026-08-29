import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ErrorBanner, InfoBanner, SectionCard, SemanticChip } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { createCheckoutSession, listSubscriptionInvoices } from 'services/subscriptionsApi';
import {
  PlatformInvoice,
  PlatformSubscription,
  amountForPlan,
} from 'types/subscription';

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

const statusChipVariant = (status: PlatformSubscription['status']) => {
  if (status === 'active') {
    return 'success' as const;
  }
  if (status === 'past_due') {
    return 'error' as const;
  }
  if (status === 'canceled') {
    return 'info' as const;
  }
  return 'warning' as const;
};

type Props = {
  subscription: PlatformSubscription | null;
};

const SchoolPlatformBillingSection = ({ subscription }: Props) => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [invoicesError, setInvoicesError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!subscription) {
      setInvoices([]);
      return;
    }

    let cancelled = false;

    listSubscriptionInvoices(subscription.id, 1)
      .then((response) => {
        if (!cancelled) {
          setInvoices(response.data);
          setInvoicesError('');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setInvoices([]);
          setInvoicesError(
            error instanceof ApiError
              ? error.message
              : t('backoffice.schoolDetail.billingInvoicesLoadError'),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [subscription, t]);

  const handleCheckout = async () => {
    if (!subscription) {
      return;
    }

    setCheckingOut(true);
    setCheckoutError('');

    try {
      const session = await createCheckoutSession(subscription.id);
      if (session.checkout_url) {
        window.open(session.checkout_url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      setCheckoutError(
        error instanceof ApiError
          ? error.message
          : t('backoffice.schoolDetail.billingCheckoutError'),
      );
    } finally {
      setCheckingOut(false);
    }
  };

  const amount = subscription
    ? amountForPlan(
        subscription.platform_plan,
        subscription.billing_interval,
        subscription.provider,
      )
    : null;
  const overdueInvoice = invoices.find(isOverdueInvoice);
  const pastDue = subscription?.status === 'past_due' || Boolean(overdueInvoice);

  return (
    <SectionCard title={t('backoffice.schoolDetail.billingTitle')} padding={3.5}>
      {subscription ? (
        <Stack spacing={2.5}>
          {pastDue && (
            <InfoBanner message={t('backoffice.schoolDetail.billingPastDue')} />
          )}
          {checkoutError && <ErrorBanner message={checkoutError} />}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                {t('backoffice.schoolDetail.billingPlan')}
              </Typography>
              <Typography variant="body1">
                {subscription.platform_plan?.name ?? `#${subscription.platform_plan_id}`}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('backoffice.schoolDetail.billingStatus')}
              </Typography>
              <SemanticChip
                variant={statusChipVariant(subscription.status)}
                label={t(`backoffice.subscriptions.status.${subscription.status}`)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                {t('backoffice.schoolDetail.billingInterval')}
              </Typography>
              <Typography variant="body1">
                {subscription.billing_interval
                  ? t(`backoffice.subscriptions.interval.${subscription.billing_interval}`)
                  : '—'}
              </Typography>
            </Grid>
            {subscription.provider && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('backoffice.schoolDetail.billingProvider')}
                </Typography>
                <Typography variant="body1">
                  {t(`backoffice.subscriptions.provider.${subscription.provider}`)}
                </Typography>
              </Grid>
            )}
            {amount != null && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('backoffice.schoolDetail.billingAmount')}
                </Typography>
                <Typography variant="body1">{formatCurrency(amount)}</Typography>
              </Grid>
            )}
            {subscription.current_period_end && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('backoffice.schoolDetail.billingPeriodEnd')}
                </Typography>
                <Typography variant="body1" color={pastDue ? 'error.main' : undefined}>
                  {formatDate(subscription.current_period_end)}
                </Typography>
              </Grid>
            )}
            {overdueInvoice?.due_at && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('backoffice.schoolDetail.billingDueDate')}
                </Typography>
                <Typography variant="body1" color="error.main">
                  {formatDate(overdueInvoice.due_at)} · {t('backoffice.schoolDetail.billingOverdue')}
                </Typography>
              </Grid>
            )}
          </Grid>

          {canCheckout(subscription) && (
            <Button
              variant="contained"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
              disabled={checkingOut}
              onClick={handleCheckout}
            >
              {t('backoffice.schoolDetail.billingSendCheckout')}
            </Button>
          )}

          <Stack spacing={1}>
            <Typography variant="subtitle2">
              {t('backoffice.schoolDetail.billingInvoices')}
            </Typography>
            {invoicesError && <ErrorBanner message={invoicesError} />}
            {invoices.length === 0 && !invoicesError ? (
              <Typography variant="body2" color="text.secondary">
                {t('backoffice.schoolDetail.billingInvoicesEmpty')}
              </Typography>
            ) : (
              invoices.map((invoice) => (
                <Stack
                  key={invoice.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Typography variant="body2">
                    {formatCurrency(invoice.amount_cents)} ·{' '}
                    {t(`backoffice.subscriptions.invoiceStatus.${invoice.status}`)}
                    {isOverdueInvoice(invoice)
                      ? ` · ${t('backoffice.schoolDetail.billingOverdue')}`
                      : ''}
                    {' · '}
                    {formatDate(invoice.due_at)}
                  </Typography>
                  {invoice.hosted_invoice_url && (
                    <Button
                      component={Link}
                      href={invoice.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                    >
                      {t('backoffice.schoolDetail.billingOpenInvoice')}
                    </Button>
                  )}
                </Stack>
              ))
            )}
          </Stack>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('backoffice.schoolDetail.billingEmpty')}
        </Typography>
      )}
    </SectionCard>
  );
};

export default SchoolPlatformBillingSection;
