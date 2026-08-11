import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import paths from 'routes/paths';
import { ApiError } from 'services/api';
import {
  fetchOnboardingStatusCounts,
  OnboardingStatusCounts,
} from 'services/schoolsApi';
import { SchoolOnboardingStatus } from 'types/onboarding';

type StatusCardConfig = {
  status: SchoolOnboardingStatus;
  labelKey: 'backoffice.dashboard.status.provisioning' | 'backoffice.dashboard.status.pendingHandoff' | 'backoffice.dashboard.status.active';
  chipVariant: 'warning' | 'info' | 'success';
  linkKey: 'backoffice.dashboard.link.provisioning' | 'backoffice.dashboard.link.pendingHandoff';
  showLink: boolean;
};

const STATUS_CARDS: StatusCardConfig[] = [
  {
    status: 'provisioning',
    labelKey: 'backoffice.dashboard.status.provisioning',
    chipVariant: 'warning',
    linkKey: 'backoffice.dashboard.link.provisioning',
    showLink: true,
  },
  {
    status: 'pending_handoff',
    labelKey: 'backoffice.dashboard.status.pendingHandoff',
    chipVariant: 'info',
    linkKey: 'backoffice.dashboard.link.pendingHandoff',
    showLink: true,
  },
  {
    status: 'active',
    labelKey: 'backoffice.dashboard.status.active',
    chipVariant: 'success',
    linkKey: 'backoffice.dashboard.link.provisioning',
    showLink: false,
  },
];

const emptyCounts = (): OnboardingStatusCounts => ({
  provisioning: 0,
  pending_handoff: 0,
  active: 0,
});

/**
 * Platform overview for backoffice operators — onboarding health across the fleet.
 */
const Dashboard = () => {
  const { t } = useTranslation();
  const [counts, setCounts] = useState<OnboardingStatusCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const nextCounts = await fetchOnboardingStatusCounts();
      setCounts(nextCounts);
    } catch (err) {
      setCounts(emptyCounts());

      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(
          err instanceof ApiError ? err.message : t('backoffice.dashboard.loadError'),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('backoffice.dashboard.title')} />
        <SectionCard>
          <EmptyState
            title={t('backoffice.dashboard.noAccess.title')}
            description={t('backoffice.dashboard.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('backoffice.dashboard.title')}
        subtitle={t('backoffice.dashboard.subtitle')}
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard title={t('backoffice.dashboard.onboarding.title')} padding={3.5}>
        <Grid container spacing={2.5}>
          {STATUS_CARDS.map((card) => {
            const count = counts?.[card.status] ?? 0;

            return (
              <Grid key={card.status} size={{ xs: 12, md: 4 }}>
                <Stack
                  spacing={2}
                  sx={{
                    p: 2.5,
                    height: 1,
                    borderRadius: 2,
                    bgcolor: 'background.default',
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {t(card.labelKey)}
                    </Typography>
                    <SemanticChip variant={card.chipVariant} label={t(card.labelKey)} />
                  </Stack>

                  <Box minHeight={40} display="flex" alignItems="center">
                    {loading ? (
                      <CircularProgress size={28} aria-label={t('backoffice.dashboard.loading')} />
                    ) : (
                      <Typography
                        variant="h4"
                        component="p"
                        aria-label={`${t(card.labelKey)}: ${count}`}
                      >
                        {count}
                      </Typography>
                    )}
                  </Box>

                  {card.showLink && (
                    <Button
                      component={RouterLink}
                      to={paths.schoolsWithOnboardingStatus(card.status)}
                      variant="outlined"
                      size="small"
                      disabled={loading || count === 0}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      {t(card.linkKey)}
                    </Button>
                  )}
                </Stack>
              </Grid>
            );
          })}
        </Grid>
      </SectionCard>

      <SectionCard padding={3.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
          <Button component={RouterLink} to={paths.schools} variant="contained" size="small">
            {t('backoffice.dashboard.viewSchools')}
          </Button>
        </Stack>
      </SectionCard>
    </Stack>
  );
};

export default Dashboard;
