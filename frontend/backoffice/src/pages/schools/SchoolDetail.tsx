import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EmptyState, PageHeader, SectionCard, SemanticChip } from 'design-system';
import SchoolModulesSection from 'components/sections/schools/SchoolModulesSection';
import { useTranslation } from 'providers/I18nContext';
import { useAuth } from 'providers/AuthContext';
import paths from 'routes/paths';
import { ApiError } from 'services/api';
import { getSchoolDetail } from 'services/schoolsApi';
import { SchoolDetail as SchoolDetailData } from 'types/school';
import { SCHOOL_MODULE_KEYS } from 'types/modules';
import { isBackofficeUser } from 'utils/onboarding/access';

const ONBOARDING_STATUS_CHIP: Record<
  NonNullable<SchoolDetailData['onboarding_status']>,
  {
    variant: 'info' | 'warning' | 'success';
    labelKey:
      | 'backoffice.schoolDetail.status.provisioning'
      | 'backoffice.schoolDetail.status.pendingHandoff'
      | 'backoffice.schoolDetail.status.active';
  }
> = {
  provisioning: {
    variant: 'warning',
    labelKey: 'backoffice.schoolDetail.status.provisioning',
  },
  pending_handoff: {
    variant: 'info',
    labelKey: 'backoffice.schoolDetail.status.pendingHandoff',
  },
  active: {
    variant: 'success',
    labelKey: 'backoffice.schoolDetail.status.active',
  },
};

const ONBOARDING_MODE_LABEL: Record<
  NonNullable<SchoolDetailData['onboarding_mode']>,
  'backoffice.schoolDetail.mode.selfServe' | 'backoffice.schoolDetail.mode.whiteGlove'
> = {
  self_serve: 'backoffice.schoolDetail.mode.selfServe',
  white_glove: 'backoffice.schoolDetail.mode.whiteGlove',
};

const formatDate = (iso: string | undefined) => {
  if (!iso) {
    return '—';
  }

  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const SchoolDetail = () => {
  const { t } = useTranslation();
  const { schoolId: schoolIdParam } = useParams();
  const schoolId = Number(schoolIdParam);
  const { user } = useAuth();
  const backoffice = isBackofficeUser(user?.memberships ?? []);

  const [school, setSchool] = useState<SchoolDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!backoffice || !Number.isFinite(schoolId)) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const data = await getSchoolDetail(schoolId);
        if (!cancelled) {
          setSchool(data);
        }
      } catch (error) {
        if (!cancelled) {
          setSchool(null);
          setLoadError(
            error instanceof ApiError
              ? error.message
              : t('backoffice.schoolDetail.loadError'),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [backoffice, schoolId, t]);

  const moduleChips = useMemo(() => {
    if (!school?.modules) {
      return null;
    }

    return SCHOOL_MODULE_KEYS.map((key) => (
      <SemanticChip
        key={key}
        variant={school.modules![key] ? 'success' : 'warning'}
        label={`${t(`backoffice.modules.${key}`)}: ${school.modules![key] ? t('backoffice.modules.enabled') : t('backoffice.modules.disabled')}`}
      />
    ));
  }, [school?.modules, t]);

  if (!backoffice) {
    window.location.assign('/app/');
    return null;
  }

  if (loading) {
    return (
      <Stack direction="column" alignItems="center" justifyContent="center" py={8}>
        <CircularProgress />
      </Stack>
    );
  }

  if (loadError || !school) {
    return (
      <Stack direction="column" gap={3.5} py={2}>
        <PageHeader title={t('backoffice.schoolDetail.title')} />
        <SectionCard>
          <EmptyState
            title={t('backoffice.schoolDetail.notFoundTitle')}
            description={loadError || t('backoffice.schoolDetail.notFoundDescription')}
            headingLevel={2}
          />
        </SectionCard>
        <Button component={RouterLink} to={paths.schools} variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          {t('backoffice.schoolDetail.backToSchools')}
        </Button>
      </Stack>
    );
  }

  const status = school.onboarding_status;
  const statusMeta = status ? ONBOARDING_STATUS_CHIP[status] : null;
  const showProvisioningLinks = status === 'provisioning' || status === 'pending_handoff';

  return (
    <Stack direction="column" gap={3.5} py={2} data-testid="school-detail">
      <PageHeader
        title={school.name}
        subtitle={t('backoffice.schoolDetail.subtitle')}
        actions={
          <Button component={RouterLink} to={paths.schools} variant="outlined" size="small">
            {t('backoffice.schoolDetail.backToSchools')}
          </Button>
        }
      />

      <SectionCard title={t('backoffice.schoolDetail.profileTitle')} padding={3.5}>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">
              {t('backoffice.schoolDetail.cnpj')}
            </Typography>
            <Typography variant="body1">{school.cnpj ?? '—'}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">
              {t('backoffice.schoolDetail.plan')}
            </Typography>
            <Typography variant="body1">{school.saas_plan ?? '—'}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">
              {t('backoffice.schoolDetail.createdAt')}
            </Typography>
            <Typography variant="body1">{formatDate(school.created_at)}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('backoffice.schoolDetail.onboardingStatus')}
            </Typography>
            {statusMeta ? (
              <SemanticChip variant={statusMeta.variant} label={t(statusMeta.labelKey)} />
            ) : (
              <Typography variant="body1">—</Typography>
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">
              {t('backoffice.schoolDetail.onboardingMode')}
            </Typography>
            <Typography variant="body1">
              {school.onboarding_mode
                ? t(ONBOARDING_MODE_LABEL[school.onboarding_mode])
                : '—'}
            </Typography>
          </Grid>
          {school.aggregate_counts && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('backoffice.schoolDetail.studentsCount')}
                </Typography>
                <Typography variant="body1">{school.aggregate_counts.students_count}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('backoffice.schoolDetail.staffCount')}
                </Typography>
                <Typography variant="body1">{school.aggregate_counts.staff_count}</Typography>
              </Grid>
            </>
          )}
        </Grid>

        {moduleChips && (
          <Stack direction="row" flexWrap="wrap" gap={1} mt={2.5}>
            {moduleChips}
          </Stack>
        )}
      </SectionCard>

      {school.active_school_year && (
        <SectionCard title={t('backoffice.schoolDetail.activeYearTitle')} padding={3.5}>
          <Typography variant="body1" fontWeight={600}>
            {school.active_school_year.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {formatDate(school.active_school_year.starts_on)} —{' '}
            {formatDate(school.active_school_year.ends_on)}
          </Typography>
          <Box mt={1}>
            <SemanticChip variant="success" label={t('backoffice.schoolDetail.yearActive')} />
          </Box>
        </SectionCard>
      )}

      <SectionCard title={t('backoffice.modules.title')} padding={3.5}>
        <SchoolModulesSection
          schoolId={school.id}
          initialModules={school.modules}
          onModulesChange={(modules) => setSchool((current) => (current ? { ...current, modules } : current))}
        />
      </SectionCard>

      {showProvisioningLinks && (
        <SectionCard title={t('backoffice.schoolDetail.quickLinksTitle')} padding={3.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
            {status === 'provisioning' && (
              <Button
                component={RouterLink}
                to={paths.provisioningWizard(school.id)}
                variant="contained"
                size="small"
              >
                {t('backoffice.schoolDetail.link.provisioning')}
              </Button>
            )}
            {status === 'pending_handoff' && (
              <Button
                component={RouterLink}
                to={paths.schoolActivation(school.id)}
                variant="contained"
                size="small"
              >
                {t('backoffice.schoolDetail.link.activation')}
              </Button>
            )}
            <Button
              component={RouterLink}
              to={paths.bankCredentials(school.id)}
              variant="outlined"
              size="small"
            >
              {t('backoffice.schoolDetail.link.bankCredentials')}
            </Button>
          </Stack>
        </SectionCard>
      )}
    </Stack>
  );
};

export default SchoolDetail;
