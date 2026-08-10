import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
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
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { ErrorBanner, SectionCard } from 'design-system';
import { useAuth } from 'providers/AuthContext';
import paths, { rootPaths } from 'routes/paths';
import { ApiError } from 'services/api';
import { inviteStaffMember, listRoleTemplates, submitHandoff } from 'services/onboardingApi';
import { RoleTemplateSummary } from 'types/onboarding';
import {
  findPendingHandoffOwnerMembership,
  membershipHasPermission,
} from 'utils/onboarding/access';
import { handoffChecklistLabel, parseHandoffChecklist } from 'utils/onboarding/checklist';

const STEPS = ['Boas-vindas', 'Cobrança', 'Segmentos', 'Equipe', 'Ativação'] as const;

const OwnerOnboarding = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const membership = useMemo(() => findPendingHandoffOwnerMembership(user), [user]);

  const [activeStep, setActiveStep] = useState(0);
  const [billingWaived, setBillingWaived] = useState(false);
  const [segmentsSkipped, setSegmentsSkipped] = useState(false);
  const [secretaryEmail, setSecretaryEmail] = useState('');
  const [teamInvited, setTeamInvited] = useState(false);
  const [secretaryTemplate, setSecretaryTemplate] = useState<RoleTemplateSummary | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [checklistErrors, setChecklistErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const schoolId = membership?.school_id ?? null;
  const canManagePeople =
    membership !== undefined && membershipHasPermission(membership, 'manage_people');

  useEffect(() => {
    if (!schoolId || !canManagePeople) {
      return;
    }

    let cancelled = false;

    const loadTemplates = async () => {
      setLoadingTemplates(true);

      try {
        const response = await listRoleTemplates(schoolId);
        if (cancelled) {
          return;
        }

        const secretary =
          response.data.find((template) => template.system_key === 'secretary') ?? null;
        setSecretaryTemplate(secretary);
      } catch {
        if (!cancelled) {
          setSecretaryTemplate(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingTemplates(false);
        }
      }
    };

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [schoolId, canManagePeople]);

  const handoffReady = billingWaived;

  const localChecklist = useMemo(
    () => [
      { key: 'owner_active', complete: true },
      { key: 'billing', complete: billingWaived },
    ],
    [billingWaived],
  );

  const goNext = () => {
    setBannerError('');
    setActiveStep((step) => Math.min(step + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setBannerError('');
    setActiveStep((step) => Math.max(step - 1, 0));
  };

  const handleInviteTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBannerError('');

    if (!schoolId || !secretaryTemplate) {
      goNext();
      return;
    }

    const email = secretaryEmail.trim();
    if (!email) {
      goNext();
      return;
    }

    setSubmitting(true);

    try {
      await inviteStaffMember(schoolId, {
        membership: {
          email,
          role: 'staff',
          role_template_id: secretaryTemplate.id,
          display_title: 'Secretária',
        },
      });
      setTeamInvited(true);
      goNext();
    } catch (error) {
      setBannerError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível enviar o convite. Tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmHandoff = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setBannerError('');
    setChecklistErrors([]);
    setSubmitting(true);

    try {
      await submitHandoff(schoolId, {
        handoff: billingWaived ? { billing_waived: true } : undefined,
      });
      await refreshUser();
      navigate(rootPaths.root, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'validation_error') {
        const missing = parseHandoffChecklist(error.details);
        if (missing.length > 0) {
          setChecklistErrors(missing);
        }
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
  }, [billingWaived, navigate, refreshUser, schoolId]);

  if (user && !membership) {
    return <Navigate to={paths.dashboard} replace state={{ forbidden: true }} />;
  }

  if (!membership) {
    return null;
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack gap={2}>
            <Typography variant="body1" color="text.secondary">
              Bem-vindo ao School Lab. Vamos concluir a configuração inicial de{' '}
              <strong>{membership.school_name ?? 'sua escola'}</strong> para liberar o acesso
              completo ao sistema.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              O assistente leva poucos minutos: cobrança, segmentos opcionais, convites da equipe e
              confirmação final de ativação.
            </Typography>
          </Stack>
        );

      case 1:
        return (
          <Stack gap={2}>
            <Typography variant="body1" color="text.secondary">
              Para emitir boletos, a escola precisa conectar um provedor de pagamento. Você pode
              adiar essa etapa e configurar a cobrança depois, nas configurações do sistema.
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={billingWaived}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setBillingWaived(event.target.checked);
                    setChecklistErrors([]);
                  }}
                />
              }
              label="Adiar configuração de cobrança por enquanto"
            />
            {!billingWaived && (
              <Typography variant="body2" color="text.secondary">
                Sem adiar a cobrança, será necessário configurar um provedor de pagamento antes da
                ativação. Entre em contato com o suporte se precisar de ajuda com a integração
                bancária.
              </Typography>
            )}
          </Stack>
        );

      case 2:
        return (
          <Stack gap={2}>
            <Typography variant="body1" color="text.secondary">
              Os segmentos organizam a escola por etapa de ensino (Infantil, Fundamental I, etc.).
              Essa configuração é opcional no início — você pode definir segmentos depois, no
              cadastro acadêmico.
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={segmentsSkipped}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setSegmentsSkipped(event.target.checked)
                  }
                />
              }
              label="Configurar segmentos depois"
            />
          </Stack>
        );

      case 3:
        return (
          <Stack gap={2} component="form" onSubmit={handleInviteTeam}>
            <Typography variant="body1" color="text.secondary">
              Convide a secretária ou outro membro da equipe administrativa. Esta etapa é opcional —
              você pode pular e convidar pessoas depois.
            </Typography>
            {canManagePeople ? (
              <TextField
                label="E-mail da secretária"
                type="email"
                value={secretaryEmail}
                onChange={(event) => setSecretaryEmail(event.target.value)}
                disabled={submitting || loadingTemplates || !secretaryTemplate}
                helperText={
                  teamInvited
                    ? 'Convite enviado com sucesso.'
                    : secretaryTemplate
                      ? 'Deixe em branco para pular.'
                      : 'Modelo de secretária indisponível — pule esta etapa.'
                }
                fullWidth
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sua conta não possui permissão para convidar equipe. Pule esta etapa e peça ajuda
                ao suporte, se necessário.
              </Typography>
            )}
            {bannerError && <ErrorBanner message={bannerError} />}
            <Stack direction="row" gap={1.5} justifyContent="flex-end">
              <Button type="button" variant="outlined" onClick={goNext} disabled={submitting}>
                Pular
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || !secretaryEmail.trim()}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              >
                Enviar convite
              </Button>
            </Stack>
          </Stack>
        );

      case 4:
        return (
          <Stack gap={2}>
            <Typography variant="body1" color="text.secondary">
              Revise os itens abaixo antes de ativar a escola. Após a confirmação, você terá acesso
              completo ao sistema.
            </Typography>
            <List dense disablePadding>
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
              {segmentsSkipped && (
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <IconifyIcon icon="mdi:check-circle" color="success.main" />
                  </ListItemIcon>
                  <ListItemText primary="Segmentos adiados (opcional)" />
                </ListItem>
              )}
              {teamInvited && (
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <IconifyIcon icon="mdi:check-circle" color="success.main" />
                  </ListItemIcon>
                  <ListItemText primary="Convite da equipe enviado (opcional)" />
                </ListItem>
              )}
            </List>
            {checklistErrors.length > 0 && (
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
            )}
            {bannerError && <ErrorBanner message={bannerError} />}
            <Button
              variant="contained"
              onClick={handleConfirmHandoff}
              disabled={submitting || !handoffReady}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              fullWidth
            >
              {submitting ? 'Ativando...' : 'Confirmar e ativar escola'}
            </Button>
            {!handoffReady && (
              <Typography variant="body2" color="text.secondary" align="center">
                Adie a cobrança na etapa anterior ou configure um provedor de pagamento para
                continuar.
              </Typography>
            )}
          </Stack>
        );

      default:
        return null;
    }
  };

  const isTeamStep = activeStep === 3;
  const isHandoffStep = activeStep === 4;

  return (
    <Stack gap={3.5} py={2}>
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Configuração da escola
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Complete as etapas para ativar {membership.school_name ?? 'sua escola'}.
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} alternativeLabel>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <SectionCard>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {STEPS[activeStep]}
        </Typography>
        {renderStepContent()}
      </SectionCard>

      {!isTeamStep && !isHandoffStep && (
        <Stack direction="row" gap={1.5} justifyContent="space-between">
          <Button variant="outlined" onClick={goBack} disabled={activeStep === 0 || submitting}>
            Voltar
          </Button>
          <Button variant="contained" onClick={goNext} disabled={submitting}>
            {activeStep === STEPS.length - 2 ? 'Revisar ativação' : 'Continuar'}
          </Button>
        </Stack>
      )}

      {isHandoffStep && (
        <Button variant="outlined" onClick={goBack} disabled={submitting} sx={{ alignSelf: 'flex-start' }}>
          Voltar
        </Button>
      )}
    </Stack>
  );
};

export default OwnerOnboarding;
