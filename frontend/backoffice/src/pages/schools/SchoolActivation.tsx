import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { EmptyState, ErrorBanner, InfoBanner, PageHeader, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useAuth } from 'providers/AuthContext';
import paths from 'routes/paths';
import { ApiError } from 'services/api';
import { listBankCredentials } from 'services/bankCredentialsApi';
import { submitHandoff } from 'services/onboardingApi';
import { listMemberships } from 'services/peopleApi';
import { getSchool } from 'services/schoolsApi';
import { Membership } from 'types/auth';
import { HandoffChecklistItem } from 'types/onboarding';
import { School } from 'types/school';
import { isBackofficeUser } from 'utils/onboarding/access';
import { handoffChecklistLabel, parseHandoffChecklist } from 'utils/onboarding/checklist';

const ACTIVATION_CHECKLIST: HandoffChecklistItem[] = ['owner_active', 'billing'];

const SchoolActivation = () => {
  const { t } = useTranslation();
  const { schoolId: schoolIdParam } = useParams();
  const schoolId = Number(schoolIdParam);
  const { user } = useAuth();
  const navigate = useNavigate();
  const backoffice = isBackofficeUser(user?.memberships ?? []);

  const [school, setSchool] = useState<School | null>(null);
  const [ownerMembership, setOwnerMembership] = useState<Membership | null>(null);
  const [hasActiveCredentials, setHasActiveCredentials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [billingWaived, setBillingWaived] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [checklistErrors, setChecklistErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
        const [schoolData, membershipsResponse, credentials] = await Promise.all([
          getSchool(schoolId),
          listMemberships(schoolId),
          listBankCredentials(schoolId),
        ]);

        if (cancelled) {
          return;
        }

        setSchool(schoolData);
        setOwnerMembership(membershipsResponse.data.find((membership) => membership.is_owner === true) ?? null);
        setHasActiveCredentials(credentials.some((credential) => credential.active));
        setBillingWaived(Boolean(schoolData.billing_waived_at));
      } catch (error) {
        if (!cancelled) {
          setSchool(null);
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'Não foi possível carregar os dados da escola.',
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
  }, [backoffice, schoolId]);

  const billingReady =
    Boolean(school?.billing_waived_at) || hasActiveCredentials || billingWaived;
  const ownerActive = ownerMembership?.status === 'active';
  const operatorCanActivate = school?.onboarding_mode === 'white_glove';
  const activationReady = ownerActive && billingReady;

  const localChecklist = useMemo(
    () =>
      ACTIVATION_CHECKLIST.map((key) => ({
        key,
        complete: key === 'owner_active' ? ownerActive : billingReady,
      })),
    [billingReady, ownerActive],
  );

  const handleConfirmActivation = useCallback(async () => {
    if (!school || !operatorCanActivate) {
      return;
    }

    setBannerError('');
    setChecklistErrors([]);
    setSubmitting(true);

    try {
      await submitHandoff(schoolId, {
        handoff: billingWaived && !school.billing_waived_at ? { billing_waived: true } : undefined,
      });
      navigate(paths.schools, {
        replace: true,
        state: { activationComplete: school.name },
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'validation_error') {
        const missing = parseHandoffChecklist(error.details);
        if (missing.length > 0) {
          setChecklistErrors(missing);
        }
        setBannerError(error.message);
      } else if (error instanceof ApiError && error.code === 'forbidden') {
        setBannerError(error.message);
      } else {
        setBannerError(
          error instanceof ApiError
            ? error.message
            : 'Não foi possível ativar a escola. Tente novamente.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [billingWaived, navigate, operatorCanActivate, school, schoolId]);

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
        <PageHeader title={t('backoffice.schoolActivation.title')} />
        <SectionCard>
          <EmptyState
            title="Escola não encontrada"
            description={loadError || 'Não foi possível localizar a escola solicitada.'}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  if (school.onboarding_status === 'active') {
    return (
      <Stack direction="column" gap={3.5} py={2}>
        <PageHeader title={t('backoffice.schoolActivation.title')} subtitle={school.name} />
        <SectionCard>
          <EmptyState
            title="Escola já ativa"
            description="Esta escola já está ativa. Não há pendências de ativação."
            headingLevel={2}
          />
        </SectionCard>
        <Button component={RouterLink} to={paths.schools} variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          Voltar às escolas
        </Button>
      </Stack>
    );
  }

  if (school.onboarding_status !== 'pending_handoff') {
    return (
      <Stack direction="column" gap={3.5} py={2}>
        <PageHeader title={t('backoffice.schoolActivation.title')} subtitle={school.name} />
        <SectionCard>
          <EmptyState
            title="Ativação indisponível"
            description="A ativação só está disponível para escolas aguardando repasse ao responsável."
            headingLevel={2}
          />
        </SectionCard>
        <Button component={RouterLink} to={paths.schools} variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          Voltar às escolas
        </Button>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5} py={2}>
      <PageHeader
        title="Ativação da escola"
        subtitle={`Confirme a ativação de ${school.name} após o responsável aceitar o convite.`}
        actions={
          <Button component={RouterLink} to={paths.schools} variant="outlined" size="small">
            Voltar às escolas
          </Button>
        }
      />

      {school.onboarding_mode === 'self_serve' && (
        <InfoBanner variant="outlined">
          Escolas em autoatendimento são ativadas pelo responsável no portal da escola após aceitar o
          convite e concluir a configuração inicial. Use esta página para monitorar o status do
          checklist.
        </InfoBanner>
      )}

      <SectionCard>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Checklist de ativação
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Todos os itens abaixo precisam estar satisfeitos antes da ativação.
        </Typography>

        <List dense disablePadding sx={{ mt: 2 }}>
          {localChecklist.map((item) => (
            <ListItem key={item.key} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <IconifyIcon
                  icon={item.complete ? 'mdi:check-circle' : 'mdi:alert-circle-outline'}
                  color={item.complete ? 'success.main' : 'warning.main'}
                />
              </ListItemIcon>
              <ListItemText primary={handoffChecklistLabel(item.key)} />
            </ListItem>
          ))}
        </List>

        {!billingReady && operatorCanActivate && (
          <FormControlLabel
            sx={{ mt: 2 }}
            control={
              <Checkbox
                checked={billingWaived}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setBillingWaived(event.target.checked);
                  setChecklistErrors([]);
                }}
                disabled={Boolean(school.billing_waived_at)}
              />
            }
            label="Adiar configuração de cobrança por enquanto"
          />
        )}

        {ownerMembership && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Responsável: {ownerMembership.email ?? '—'} (
            {ownerMembership.status === 'active' ? 'acesso ativo' : 'convite pendente'})
          </Typography>
        )}

        {checklistErrors.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <SectionCard>
              <Typography variant="subtitle2" gutterBottom>
                Itens pendentes
              </Typography>
              <List dense disablePadding>
                {checklistErrors.map((item) => (
                  <ListItem key={item} disableGutters>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <IconifyIcon icon="mdi:close-circle" color="error.main" />
                    </ListItemIcon>
                    <ListItemText primary={handoffChecklistLabel(item)} />
                  </ListItem>
                ))}
              </List>
            </SectionCard>
          </Box>
        )}

        {bannerError && (
          <Box mt={2}>
            <ErrorBanner message={bannerError} />
          </Box>
        )}

        {operatorCanActivate && (
          <Button
            variant="contained"
            onClick={handleConfirmActivation}
            disabled={submitting || !activationReady}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            fullWidth
            sx={{ mt: 2 }}
          >
            {submitting ? 'Ativando...' : 'Confirmar e ativar escola'}
          </Button>
        )}

        {operatorCanActivate && !activationReady && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Aguarde o responsável aceitar o convite e satisfaça os requisitos de cobrança para
            continuar.
          </Typography>
        )}
      </SectionCard>
    </Stack>
  );
};

export default SchoolActivation;
