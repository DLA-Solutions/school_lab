import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import paths from 'routes/paths';
import { ApiError } from 'services/api';
import { listBankCredentials } from 'services/bankCredentialsApi';
import { getSchoolModules } from 'services/modulesApi';
import { fetchOperationalSummary } from 'services/operationalSummaryApi';
import {
  fetchOnboardingStatusCounts,
  listSchools,
  OnboardingStatusCounts,
} from 'services/schoolsApi';
import { SchoolModulesMap, SchoolModuleKey } from 'types/modules';
import { SchoolOnboardingStatus } from 'types/onboarding';
import { buildDisabledModuleAlerts, DisabledModuleAlert } from 'utils/ops/disabledModules';
import { buildExpiringCredentialAlerts, ExpiringCredentialAlert } from 'utils/ops/expiringCredentials';

const PROVISIONING_BACKLOG_DAYS = 14;

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
  const [composedExpiringAlerts, setComposedExpiringAlerts] = useState<ExpiringCredentialAlert[]>([]);
  const [composedDisabledAlerts, setComposedDisabledAlerts] = useState<DisabledModuleAlert[]>([]);
  const [composedBacklogCount, setComposedBacklogCount] = useState(0);
  const [summaryExpiring, setSummaryExpiring] = useState<
    Awaited<ReturnType<typeof fetchOperationalSummary>>['credentials_expiring'] | null
  >(null);
  const [summaryDisabled, setSummaryDisabled] = useState<
    Awaited<ReturnType<typeof fetchOperationalSummary>>['schools_with_disabled_modules'] | null
  >(null);
  const [summaryBacklogCount, setSummaryBacklogCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [nextCounts, schoolsResponse] = await Promise.all([
        fetchOnboardingStatusCounts(),
        listSchools(1),
      ]);

      const fleet = schoolsResponse.data;
      setCounts(nextCounts);

      const [credentialEntries, moduleEntries] = await Promise.all([
        Promise.all(
          fleet.map(async (school) => {
            try {
              const credentials = await listBankCredentials(school.id);
              return [school.id, credentials] as const;
            } catch {
              return [school.id, []] as const;
            }
          }),
        ),
        Promise.all(
          fleet.map(async (school) => {
            try {
              const modules = await getSchoolModules(school.id);
              return [school.id, modules] as const;
            } catch {
              return null;
            }
          }),
        ),
      ]);

      const credentialMap = Object.fromEntries(credentialEntries);
      const moduleMap = Object.fromEntries(
        moduleEntries.filter((entry): entry is readonly [number, SchoolModulesMap] => entry !== null),
      );

      setComposedExpiringAlerts(buildExpiringCredentialAlerts(fleet, credentialMap));
      setComposedDisabledAlerts(buildDisabledModuleAlerts(fleet, moduleMap));

      const threshold = Date.now() - PROVISIONING_BACKLOG_DAYS * 24 * 60 * 60 * 1000;
      setComposedBacklogCount(
        fleet.filter(
          (school) =>
            school.onboarding_status === 'provisioning' &&
            school.created_at &&
            new Date(school.created_at).getTime() < threshold,
        ).length,
      );

      try {
        const summary = await fetchOperationalSummary();
        setSummaryExpiring(summary.credentials_expiring);
        setSummaryDisabled(summary.schools_with_disabled_modules);
        setSummaryBacklogCount(summary.provisioning_backlog_count);
      } catch {
        setSummaryExpiring(null);
        setSummaryDisabled(null);
        setSummaryBacklogCount(null);
      }
    } catch (err) {
      setCounts(emptyCounts());
      setComposedExpiringAlerts([]);
      setComposedDisabledAlerts([]);
      setComposedBacklogCount(0);

      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(err instanceof ApiError ? err.message : t('backoffice.dashboard.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const expiringAlerts = useMemo(() => {
    if (summaryExpiring) {
      return summaryExpiring.map((row) => ({
        schoolId: row.school_id,
        schoolName: row.school_name,
        daysRemaining: row.days_remaining,
      }));
    }

    return composedExpiringAlerts.map((alert) => ({
      schoolId: alert.schoolId,
      schoolName: alert.schoolName,
      daysRemaining: alert.daysRemaining,
    }));
  }, [composedExpiringAlerts, summaryExpiring]);

  const disabledModuleAlerts = useMemo(() => {
    if (summaryDisabled) {
      return summaryDisabled.map((row) => ({
        schoolId: row.school_id,
        schoolName: row.school_name,
        disabledModules: row.disabled_modules as SchoolModuleKey[],
      }));
    }

    return composedDisabledAlerts;
  }, [composedDisabledAlerts, summaryDisabled]);

  const provisioningBacklogCount = summaryBacklogCount ?? composedBacklogCount;

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

      <SectionCard title={t('backoffice.dashboard.ops.title')} padding={3.5}>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={1.5} sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default', height: 1 }}>
              <Typography variant="subtitle2">{t('backoffice.dashboard.ops.expiringCredentials')}</Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : expiringAlerts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('backoffice.dashboard.ops.expiringCredentialsEmpty')}
                </Typography>
              ) : (
                <List dense disablePadding>
                  {expiringAlerts.map((alert) => (
                    <ListItem
                      key={alert.schoolId}
                      disableGutters
                      secondaryAction={
                        <Button
                          component={RouterLink}
                          to={paths.bankCredentials(alert.schoolId)}
                          size="small"
                          variant="outlined"
                        >
                          {t('backoffice.dashboard.ops.viewCredentials')}
                        </Button>
                      }
                    >
                      <ListItemText
                        primary={alert.schoolName}
                        secondary={t('backoffice.dashboard.ops.daysRemaining', {
                          days: alert.daysRemaining,
                        })}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={1.5} sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default', height: 1 }}>
              <Typography variant="subtitle2">{t('backoffice.dashboard.ops.disabledModules')}</Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : disabledModuleAlerts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('backoffice.dashboard.ops.disabledModulesEmpty')}
                </Typography>
              ) : (
                <List dense disablePadding>
                  {disabledModuleAlerts.map((alert) => (
                    <ListItem
                      key={alert.schoolId}
                      disableGutters
                      secondaryAction={
                        <Button
                          component={RouterLink}
                          to={paths.schoolDetail(alert.schoolId)}
                          size="small"
                          variant="outlined"
                        >
                          {t('backoffice.dashboard.ops.viewDetail')}
                        </Button>
                      }
                    >
                      <ListItemText
                        primary={alert.schoolName}
                        secondary={alert.disabledModules
                          .map((key) => t(`backoffice.modules.${key}`))
                          .join(', ')}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={1.5} sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default', height: 1 }}>
              <Typography variant="subtitle2">{t('backoffice.dashboard.ops.provisioningBacklog')}</Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : provisioningBacklogCount === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('backoffice.dashboard.ops.provisioningBacklogEmpty')}
                </Typography>
              ) : (
                <>
                  <Typography variant="h4" component="p">
                    {provisioningBacklogCount}
                  </Typography>
                  <Button
                    component={RouterLink}
                    to={paths.schoolsWithOnboardingStatus('provisioning')}
                    variant="outlined"
                    size="small"
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {t('backoffice.dashboard.link.provisioning')}
                  </Button>
                </>
              )}
            </Stack>
          </Grid>
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
