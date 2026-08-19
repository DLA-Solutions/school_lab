import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
import SchoolModulesSection from 'components/sections/schools/SchoolModulesSection';
import SchoolPlatformBillingSection from 'components/sections/schools/SchoolPlatformBillingSection';
import { useTranslation } from 'providers/I18nContext';
import { useAuth } from 'providers/AuthContext';
import paths from 'routes/paths';
import { ApiError } from 'services/api';
import {
  endImpersonation,
  openSchoolSpaAsImpersonatedUser,
  startImpersonation,
} from 'services/impersonationsApi';
import { listMemberships } from 'services/peopleApi';
import {
  assignSchoolToGroup,
  getSchoolGroup,
  listSchoolGroups,
  unassignSchoolFromGroup,
} from 'services/schoolGroupsApi';
import { getSchoolDetail } from 'services/schoolsApi';
import { listSubscriptions } from 'services/subscriptionsApi';
import { Membership } from 'types/auth';
import { SchoolGroup } from 'types/schoolGroup';
import { SchoolDetail as SchoolDetailData } from 'types/school';
import { PlatformSubscription } from 'types/subscription';
import { ImpersonationSession } from 'types/impersonation';
import { SCHOOL_MODULE_KEYS } from 'types/modules';
import { canManageBackofficeOps } from 'utils/platformPermissions';
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

const IMPERSONATION_TEMPLATE_KEYS = new Set(['director', 'secretary']);

const isImpersonationTarget = (membership: Membership) =>
  membership.status === 'active' &&
  membership.role === 'staff' &&
  membership.role_template?.system_key != null &&
  IMPERSONATION_TEMPLATE_KEYS.has(membership.role_template.system_key);

const SchoolDetail = () => {
  const { t } = useTranslation();
  const { schoolId: schoolIdParam } = useParams();
  const schoolId = Number(schoolIdParam);
  const { user } = useAuth();
  const backoffice = isBackofficeUser(user?.memberships ?? []);
  const canImpersonate = canManageBackofficeOps(user);

  const [school, setSchool] = useState<SchoolDetailData | null>(null);
  const [schoolGroup, setSchoolGroup] = useState<SchoolGroup | null>(null);
  const [subscription, setSubscription] = useState<PlatformSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [impersonationOpen, setImpersonationOpen] = useState(false);
  const [impersonationTargets, setImpersonationTargets] = useState<Membership[]>([]);
  const [impersonationLoading, setImpersonationLoading] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState('');
  const [impersonationError, setImpersonationError] = useState('');
  const [impersonationStarting, setImpersonationStarting] = useState(false);
  const [activeImpersonation, setActiveImpersonation] = useState<ImpersonationSession | null>(null);
  const [impersonationEnding, setImpersonationEnding] = useState(false);

  const [groupAssignOpen, setGroupAssignOpen] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<SchoolGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupAssignLoading, setGroupAssignLoading] = useState(false);
  const [groupAssignError, setGroupAssignError] = useState('');
  const [groupAssignSaving, setGroupAssignSaving] = useState(false);

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

          const groupPromise =
            data.school_group_id != null
              ? getSchoolGroup(data.school_group_id).catch(() => null)
              : Promise.resolve(null);
          const subscriptionPromise = listSubscriptions(1, {
            school_id: String(schoolId),
          }).catch(() => null);

          const [group, subscriptionResponse] = await Promise.all([
            groupPromise,
            subscriptionPromise,
          ]);

          if (!cancelled) {
            setSchoolGroup(group);
            setSubscription(subscriptionResponse?.data[0] ?? null);
          }
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

  const openImpersonationDialog = async () => {
    if (!school) {
      return;
    }

    setImpersonationOpen(true);
    setImpersonationError('');
    setSelectedMembershipId('');
    setImpersonationLoading(true);

    try {
      const response = await listMemberships(school.id, 1);
      setImpersonationTargets(response.data.filter(isImpersonationTarget));
    } catch (error) {
      setImpersonationTargets([]);
      setImpersonationError(
        error instanceof ApiError
          ? error.message
          : t('backoffice.schoolDetail.impersonation.loadError'),
      );
    } finally {
      setImpersonationLoading(false);
    }
  };

  const handleStartImpersonation = async () => {
    if (!school || !selectedMembershipId) {
      return;
    }

    setImpersonationStarting(true);
    setImpersonationError('');

    try {
      const session = await startImpersonation({
        school_id: school.id,
        target_membership_id: Number(selectedMembershipId),
      });
      openSchoolSpaAsImpersonatedUser(session);
      setActiveImpersonation(session);
      setImpersonationOpen(false);
    } catch (error) {
      setImpersonationError(
        error instanceof ApiError
          ? error.message
          : t('backoffice.schoolDetail.impersonation.startError'),
      );
    } finally {
      setImpersonationStarting(false);
    }
  };

  const handleEndImpersonation = async () => {
    if (!activeImpersonation) {
      return;
    }

    setImpersonationEnding(true);

    try {
      await endImpersonation(activeImpersonation.id);
      setActiveImpersonation(null);
    } catch (error) {
      setImpersonationError(
        error instanceof ApiError
          ? error.message
          : t('backoffice.schoolDetail.impersonation.endError'),
      );
    } finally {
      setImpersonationEnding(false);
    }
  };

  const openGroupAssignDialog = async () => {
    setGroupAssignOpen(true);
    setGroupAssignError('');
    setSelectedGroupId('');
    setGroupAssignLoading(true);

    try {
      const response = await listSchoolGroups(1);
      setAvailableGroups(response.data);
    } catch (error) {
      setAvailableGroups([]);
      setGroupAssignError(
        error instanceof ApiError
          ? error.message
          : t('backoffice.schoolDetail.schoolGroupLoadError'),
      );
    } finally {
      setGroupAssignLoading(false);
    }
  };

  const handleAssignGroup = async () => {
    if (!school || !selectedGroupId) {
      return;
    }

    setGroupAssignSaving(true);
    setGroupAssignError('');

    try {
      await assignSchoolToGroup(Number(selectedGroupId), school.id);
      const group = await getSchoolGroup(Number(selectedGroupId));
      setSchool((current) => (current ? { ...current, school_group_id: group.id } : current));
      setSchoolGroup(group);
      setGroupAssignOpen(false);
    } catch (error) {
      setGroupAssignError(
        error instanceof ApiError
          ? error.message
          : t('backoffice.schoolDetail.schoolGroupAssignError'),
      );
    } finally {
      setGroupAssignSaving(false);
    }
  };

  const handleUnassignGroup = async () => {
    if (!school?.school_group_id) {
      return;
    }

    setGroupAssignSaving(true);
    setGroupAssignError('');

    try {
      await unassignSchoolFromGroup(school.school_group_id, school.id);
      setSchool((current) => (current ? { ...current, school_group_id: null } : current));
      setSchoolGroup(null);
    } catch (error) {
      setGroupAssignError(
        error instanceof ApiError
          ? error.message
          : t('backoffice.schoolDetail.schoolGroupUnassignError'),
      );
    } finally {
      setGroupAssignSaving(false);
    }
  };

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

  const impersonationSection = canImpersonate ? (
    <Box data-testid="impersonation-section">
      <SectionCard title={t('backoffice.schoolDetail.impersonation.title')} padding={3.5}>
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          {t('backoffice.schoolDetail.impersonation.description')}
        </Typography>
        {impersonationError && !impersonationOpen && <ErrorBanner message={impersonationError} />}
        {activeImpersonation && (
          <Stack spacing={1} data-testid="active-impersonation">
            <Typography variant="body2">
              {t('backoffice.schoolDetail.impersonation.activeSession', {
                school: activeImpersonation.school_name,
                expires: formatDate(activeImpersonation.expires_at),
              })}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
              disabled={impersonationEnding}
              onClick={handleEndImpersonation}
            >
              {t('backoffice.schoolDetail.impersonation.endSession')}
            </Button>
          </Stack>
        )}
        <Button
          variant="outlined"
          size="small"
          sx={{ alignSelf: 'flex-start' }}
          data-testid="impersonation-launch"
          onClick={openImpersonationDialog}
        >
          {t('backoffice.schoolDetail.impersonation.launch')}
        </Button>
      </Stack>
      </SectionCard>
    </Box>
  ) : null;

  return (
    <Stack direction="column" gap={3.5} py={2} data-testid="school-detail">
      <PageHeader
        title={school.name}
        subtitle={t('backoffice.schoolDetail.subtitle')}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {canImpersonate && (
              <Button
                variant="contained"
                size="small"
                data-testid="impersonation-header-action"
                onClick={openImpersonationDialog}
              >
                {t('backoffice.schoolDetail.impersonation.launch')}
              </Button>
            )}
            <Button component={RouterLink} to={paths.schools} variant="outlined" size="small">
              {t('backoffice.schoolDetail.backToSchools')}
            </Button>
          </Stack>
        }
      />

      {impersonationSection}

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
          {school.school_group_id != null && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('backoffice.schoolDetail.schoolGroup')}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <SemanticChip
                  variant="info"
                  label={schoolGroup?.name ?? `#${school.school_group_id}`}
                />
                <Button
                  size="small"
                  variant="text"
                  disabled={groupAssignSaving}
                  onClick={handleUnassignGroup}
                >
                  {t('backoffice.schoolDetail.schoolGroupUnassign')}
                </Button>
              </Stack>
            </Grid>
          )}
          {school.school_group_id == null && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('backoffice.schoolDetail.schoolGroup')}
              </Typography>
              <Button size="small" variant="outlined" onClick={openGroupAssignDialog}>
                {t('backoffice.schoolDetail.schoolGroupAssign')}
              </Button>
            </Grid>
          )}
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

      <SchoolPlatformBillingSection subscription={subscription} />

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

      <Dialog open={impersonationOpen} onClose={() => !impersonationStarting && setImpersonationOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('backoffice.schoolDetail.impersonation.dialogTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {impersonationError && <ErrorBanner message={impersonationError} />}
            {impersonationLoading ? (
              <CircularProgress size={28} />
            ) : impersonationTargets.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('backoffice.schoolDetail.impersonation.noTargets')}
              </Typography>
            ) : (
              <TextField
                label={t('backoffice.schoolDetail.impersonation.selectStaff')}
                value={selectedMembershipId}
                onChange={(event) => setSelectedMembershipId(event.target.value)}
                select
                fullWidth
                variant="filled"
              >
                {impersonationTargets.map((membership) => (
                  <MenuItem key={membership.id} value={String(membership.id)}>
                    {membership.display_title ?? membership.role_template?.name ?? membership.email} (
                    {membership.role_template?.system_key})
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImpersonationOpen(false)} disabled={impersonationStarting}>
            {t('backoffice.schoolDetail.impersonation.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={
              impersonationStarting ||
              impersonationLoading ||
              !selectedMembershipId ||
              impersonationTargets.length === 0
            }
            onClick={handleStartImpersonation}
          >
            {t('backoffice.schoolDetail.impersonation.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={groupAssignOpen}
        onClose={() => !groupAssignSaving && setGroupAssignOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('backoffice.schoolDetail.schoolGroupAssignTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {groupAssignError && <ErrorBanner message={groupAssignError} />}
            {groupAssignLoading ? (
              <CircularProgress size={28} />
            ) : availableGroups.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('backoffice.schoolDetail.schoolGroupEmpty')}
              </Typography>
            ) : (
              <TextField
                label={t('backoffice.schoolDetail.schoolGroupSelect')}
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                select
                fullWidth
                variant="filled"
              >
                {availableGroups.map((group) => (
                  <MenuItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupAssignOpen(false)} disabled={groupAssignSaving}>
            {t('backoffice.schoolDetail.impersonation.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={groupAssignSaving || groupAssignLoading || !selectedGroupId}
            onClick={handleAssignGroup}
          >
            {t('backoffice.schoolDetail.schoolGroupAssignConfirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default SchoolDetail;
