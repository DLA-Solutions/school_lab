import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { fetchAnalyticsOverview } from 'services/analyticsApi';
import { AnalyticsOverview } from 'types/analytics';
import { SCHOOL_MODULE_KEYS } from 'types/modules';

const formatCurrency = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatPercent = (value: number) =>
  `${Math.round(value * 100)}%`;

/**
 * Platform analytics dashboard — aggregate KPIs with optional date range.
 */
const Analytics = () => {
  const { t } = useTranslation();

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchAnalyticsOverview({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setOverview(data);
    } catch (err) {
      setOverview(null);

      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(err instanceof ApiError ? err.message : t('backoffice.analytics.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('backoffice.analytics.title')} />
        <SectionCard>
          <EmptyState
            title={t('backoffice.analytics.noAccess.title')}
            description={t('backoffice.analytics.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('backoffice.analytics.title')}
        subtitle={t('backoffice.analytics.subtitle')}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              label={t('backoffice.analytics.dateFrom')}
              type="date"
              value={dateFrom}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDateFrom(event.target.value)}
              size="small"
              variant="filled"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 160 }}
            />
            <TextField
              label={t('backoffice.analytics.dateTo')}
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

      <SectionCard title={t('backoffice.analytics.kpiTitle')} padding={3.5}>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KpiCard
              label={t('backoffice.analytics.activeSchools')}
              value={overview?.active_schools}
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KpiCard
              label={t('backoffice.analytics.provisioningCount')}
              value={overview?.provisioning_count}
              loading={loading}
              chipVariant="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <KpiCard
              label={t('backoffice.analytics.mrr')}
              value={overview != null ? formatCurrency(overview.mrr_cents) : undefined}
              loading={loading}
              chipVariant="success"
            />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title={t('backoffice.analytics.moduleAdoptionTitle')} padding={3.5}>
        {loading ? (
          <CircularProgress size={28} aria-label={t('backoffice.analytics.loading')} />
        ) : (
          <Grid container spacing={2}>
            {SCHOOL_MODULE_KEYS.map((key) => (
              <Grid key={key} size={{ xs: 12, sm: 6, md: 3 }}>
                <Stack spacing={1} sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t(`backoffice.modules.${key}`)}
                  </Typography>
                  <Typography variant="h5" component="p">
                    {formatPercent(overview?.module_adoption[key] ?? 0)}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        )}
      </SectionCard>

      <SectionCard title={t('backoffice.analytics.funnelTitle')} padding={3.5}>
        {loading ? (
          <CircularProgress size={28} />
        ) : (
          <Grid container spacing={2.5}>
            {(
              [
                ['provisioning', 'warning'],
                ['pending_handoff', 'info'],
                ['active', 'success'],
              ] as const
            ).map(([key, variant]) => (
              <Grid key={key} size={{ xs: 12, md: 4 }}>
                <Stack spacing={1.5} sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.default' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {t(`backoffice.analytics.funnel.${key}`)}
                    </Typography>
                    <SemanticChip variant={variant} label={t(`backoffice.analytics.funnel.${key}`)} />
                  </Stack>
                  <Typography variant="h4" component="p">
                    {overview?.onboarding_funnel[key] ?? 0}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        )}
      </SectionCard>
    </Stack>
  );
};

const KpiCard = ({
  label,
  value,
  loading,
  chipVariant,
}: {
  label: string;
  value?: number | string;
  loading: boolean;
  chipVariant?: 'success' | 'warning' | 'info';
}) => (
  <Stack spacing={1.5} sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.default', height: 1 }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {chipVariant && <SemanticChip variant={chipVariant} label={label} />}
    </Stack>
    <Box minHeight={40} display="flex" alignItems="center">
      {loading ? (
        <CircularProgress size={28} />
      ) : (
        <Typography variant="h4" component="p">
          {value ?? '—'}
        </Typography>
      )}
    </Box>
  </Stack>
);

export default Analytics;
