import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useAuth } from 'providers/AuthContext';
import paths from 'routes/paths';
import { ApiError } from 'services/api';
import { listBankCredentials, uploadBankCredentials } from 'services/bankCredentialsApi';
import {
  importProvisioningCsv,
  inviteStaffMember,
  listRoleTemplates,
  submitHandoff,
} from 'services/onboardingApi';
import { listMemberships, resendMembershipInvite } from 'services/peopleApi';
import { getSchool } from 'services/schoolsApi';
import { SchoolPaymentProvider } from 'types/bankCredential';
import {
  ProvisioningImportResult,
  ProvisioningImportSummary,
  RoleTemplateSummary,
  SchoolOnboardingStatus,
} from 'types/onboarding';
import { School } from 'types/school';
import { isBackofficeUser } from 'utils/onboarding/access';
import { handoffChecklistLabel, parseHandoffChecklist } from 'utils/onboarding/checklist';
import { formatImportErrorReport } from 'utils/onboarding/importErrors';

const STEPS = ['Boas-vindas', 'Cobrança', 'Pessoas', 'Importação CSV', 'Repasse'] as const;

const CSV_COLUMNS =
  'student_name, student_birth_date, student_rg, school_class_name, guardian_name, guardian_email, guardian_phone, guardian_relationship, guardian_zip_code, guardian_street, guardian_number, guardian_neighborhood, guardian_city, guardian_state';

const READ_ONLY_STATUSES = new Set<SchoolOnboardingStatus>(['active', 'pending_handoff']);

const STAFF_INVITE_EXCLUDED_KEYS = new Set(['teacher', 'director']);

interface PendingInvite {
  id: number;
  email: string;
  roleLabel: string;
}

const toPendingInvite = (membership: {
  id: number;
  email: string | null;
  display_title?: string | null;
  role_template?: { name: string } | null;
}): PendingInvite => ({
  id: membership.id,
  email: membership.email ?? '',
  roleLabel: membership.display_title ?? membership.role_template?.name ?? 'Membro da equipe',
});

const isStaffAssignableTemplate = (template: RoleTemplateSummary) =>
  template.system_key === null || !STAFF_INVITE_EXCLUDED_KEYS.has(template.system_key);

const CREDENTIAL_FIELD_LABELS: Record<string, string> = {
  client_id: 'Client ID',
  certificate: 'Certificado',
  private_key: 'Chave privada',
  provider: 'Provedor',
  instrument: 'Instrumento',
};

const formatCredentialValidationErrors = (details: Record<string, unknown>): string[] =>
  Object.entries(details).flatMap(([field, value]) => {
    if (!Array.isArray(value)) {
      return [];
    }

    const label = CREDENTIAL_FIELD_LABELS[field] ?? field;
    return value.map((message) => `${label}: ${String(message)}`);
  });

const formatCredentialDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const CredentialMetadata = ({ credential }: { credential: SchoolPaymentProvider }) => (
  <List dense disablePadding>
    <ListItem disableGutters>
      <ListItemText primary={`Provedor: ${credential.provider}`} />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText primary={`Client ID: ${credential.client_id}`} />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText primary={`Impressão digital: ${credential.certificate_fingerprint}`} />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText
        primary={`Certificado válido até: ${formatCredentialDate(credential.certificate_expires_at)}`}
      />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText primary={`Enviado em: ${formatCredentialDate(credential.uploaded_at)}`} />
    </ListItem>
  </List>
);

const SummaryList = ({ summary }: { summary: ProvisioningImportSummary }) => (
  <List dense disablePadding>
    <ListItem disableGutters>
      <ListItemText primary={`Linhas válidas: ${summary.valid_rows}`} />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText primary={`Alunos a criar: ${summary.students_to_create}`} />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText primary={`Responsáveis a criar: ${summary.guardians_to_create}`} />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText primary={`Vínculos a criar: ${summary.links_to_create}`} />
    </ListItem>
  </List>
);

const ProvisioningWizard = () => {
  const { schoolId: schoolIdParam } = useParams();
  const schoolId = Number(schoolIdParam);
  const { user } = useAuth();
  const navigate = useNavigate();
  const backoffice = isBackofficeUser(user?.memberships ?? []);

  const [school, setSchool] = useState<School | null>(null);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [activeStep, setActiveStep] = useState(0);
  const [billingWaived, setBillingWaived] = useState(false);
  const [bankCredentials, setBankCredentials] = useState<SchoolPaymentProvider[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [clientId, setClientId] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [credentialErrors, setCredentialErrors] = useState<string[]>([]);
  const [credentialUploadSuccess, setCredentialUploadSuccess] = useState(false);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplateSummary[]>([]);
  const [loadingRoleTemplates, setLoadingRoleTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDisplayTitle, setInviteDisplayTitle] = useState('');
  const [ownerInvite, setOwnerInvite] = useState<PendingInvite | null>(null);
  const [sentInvites, setSentInvites] = useState<PendingInvite[]>([]);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);
  const [resentInviteIds, setResentInviteIds] = useState<Set<number>>(() => new Set());
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<ProvisioningImportResult | null>(null);
  const [commitResult, setCommitResult] = useState<ProvisioningImportResult | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [bannerError, setBannerError] = useState('');
  const [checklistErrors, setChecklistErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const readOnly = school?.onboarding_status !== undefined && READ_ONLY_STATUSES.has(school.onboarding_status);

  useEffect(() => {
    if (!backoffice || !Number.isFinite(schoolId)) {
      setLoadingSchool(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoadingSchool(true);
      setLoadError('');

      try {
        const data = await getSchool(schoolId);
        if (!cancelled) {
          setSchool(data);
        }
      } catch (error) {
        if (!cancelled) {
          setSchool(null);
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'Não foi possível carregar a escola. Verifique sua conexão.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSchool(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [backoffice, schoolId]);

  useEffect(() => {
    if (!backoffice || !Number.isFinite(schoolId) || !school) {
      return;
    }

    let cancelled = false;

    const loadCredentials = async () => {
      setLoadingCredentials(true);

      try {
        const data = await listBankCredentials(schoolId);
        if (!cancelled) {
          setBankCredentials(data);
        }
      } catch {
        if (!cancelled) {
          setBankCredentials([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCredentials(false);
        }
      }
    };

    loadCredentials();

    return () => {
      cancelled = true;
    };
  }, [backoffice, school, schoolId]);

  const staffAssignableTemplates = useMemo(
    () => roleTemplates.filter(isStaffAssignableTemplate),
    [roleTemplates],
  );

  useEffect(() => {
    if (!backoffice || !Number.isFinite(schoolId) || !school || activeStep !== 2) {
      return;
    }

    let cancelled = false;

    const loadPeopleStep = async () => {
      setLoadingRoleTemplates(true);

      try {
        const [templatesResponse, membershipsResponse] = await Promise.all([
          listRoleTemplates(schoolId),
          listMemberships(schoolId),
        ]);

        if (cancelled) {
          return;
        }

        const assignable = templatesResponse.data.filter(isStaffAssignableTemplate);
        setRoleTemplates(templatesResponse.data);
        setSelectedTemplateId((current) => {
          if (current !== '') {
            return current;
          }

          return assignable[0]?.id ?? '';
        });

        const pendingInvites = membershipsResponse.data.filter(
          (membership) => membership.status === 'invited',
        );
        const owner = pendingInvites.find((membership) => membership.is_owner === true);
        const staffInvites = pendingInvites.filter(
          (membership) => membership.role === 'staff' && membership.is_owner !== true,
        );

        setOwnerInvite(owner ? toPendingInvite(owner) : null);
        setSentInvites(staffInvites.map(toPendingInvite));
      } catch {
        if (!cancelled) {
          setRoleTemplates([]);
          setSelectedTemplateId('');
        }
      } finally {
        if (!cancelled) {
          setLoadingRoleTemplates(false);
        }
      }
    };

    loadPeopleStep();

    return () => {
      cancelled = true;
    };
  }, [activeStep, backoffice, school, schoolId]);

  const activeCredential = useMemo(
    () => bankCredentials.find((credential) => credential.active) ?? null,
    [bankCredentials],
  );
  const hasActiveCredentials = activeCredential !== null;
  const billingReady = billingWaived || hasActiveCredentials;
  const handoffReady = billingReady;

  const localChecklist = useMemo(
    () => [
      { key: 'billing', complete: billingReady },
      { key: 'owner_invite', complete: true },
    ],
    [billingReady],
  );

  const goNext = () => {
    setBannerError('');
    setActiveStep((step) => Math.min(step + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setBannerError('');
    setActiveStep((step) => Math.max(step - 1, 0));
  };

  const handleCertificateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCertificateFile(event.target.files?.[0] ?? null);
    setCredentialErrors([]);
    setCredentialUploadSuccess(false);
    setBannerError('');
  };

  const handlePrivateKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPrivateKeyFile(event.target.files?.[0] ?? null);
    setCredentialErrors([]);
    setCredentialUploadSuccess(false);
    setBannerError('');
  };

  const handleResendInvite = async (membershipId: number) => {
    if (readOnly) {
      return;
    }

    setBannerError('');
    setResendingInviteId(membershipId);

    try {
      const updated = await resendMembershipInvite(schoolId, membershipId);
      const refreshed = toPendingInvite(updated);

      if (updated.is_owner === true) {
        setOwnerInvite(refreshed);
      } else {
        setSentInvites((current) =>
          current.map((invite) => (invite.id === membershipId ? refreshed : invite)),
        );
      }

      setResentInviteIds((current) => new Set(current).add(membershipId));
    } catch (error) {
      setBannerError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível reenviar o convite. Tente novamente.',
      );
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleSendTeamInvite = async () => {
    const email = inviteEmail.trim();
    const templateId = selectedTemplateId;

    if (!email || templateId === '' || readOnly) {
      return;
    }

    setBannerError('');
    setInviteSuccess(false);
    setSubmitting(true);

    try {
      const created = await inviteStaffMember(schoolId, {
        membership: {
          email,
          role: 'staff',
          role_template_id: templateId,
          display_title: inviteDisplayTitle.trim() || undefined,
        },
      });

      const template = staffAssignableTemplates.find((entry) => entry.id === templateId);
      setSentInvites((current) => [
        ...current,
        {
          id: created.id,
          email,
          roleLabel: created.display_title ?? template?.name ?? 'Membro da equipe',
        },
      ]);
      setInviteEmail('');
      setInviteDisplayTitle('');
      setInviteSuccess(true);
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

  const handleUploadCredentials = async () => {
    if (!clientId.trim() || !certificateFile || !privateKeyFile || readOnly || billingWaived) {
      return;
    }

    setBannerError('');
    setCredentialErrors([]);
    setCredentialUploadSuccess(false);
    setSubmitting(true);

    try {
      const uploaded = await uploadBankCredentials(schoolId, {
        client_id: clientId.trim(),
        certificate: certificateFile,
        private_key: privateKeyFile,
      });
      setBankCredentials((current) => [
        ...current.map((credential) =>
          credential.active && credential.instrument === uploaded.instrument
            ? { ...credential, active: false }
            : credential,
        ),
        uploaded,
      ]);
      setCredentialUploadSuccess(true);
      setChecklistErrors([]);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'validation_error') {
        const fieldErrors = formatCredentialValidationErrors(error.details);
        if (fieldErrors.length > 0) {
          setCredentialErrors(fieldErrors);
        }
        setBannerError(error.message);
      } else {
        setBannerError(
          error instanceof ApiError
            ? error.message
            : 'Não foi possível enviar as credenciais. Tente novamente.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCsvFile(file);
    setPreviewResult(null);
    setCommitResult(null);
    setImportErrors([]);
    setBannerError('');
  };

  const handlePreviewImport = async () => {
    if (!csvFile || readOnly) {
      return;
    }

    setBannerError('');
    setImportErrors([]);
    setPreviewResult(null);
    setCommitResult(null);
    setSubmitting(true);

    try {
      const result = await importProvisioningCsv(schoolId, csvFile, true);
      setPreviewResult(result);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'import_validation_failed') {
        const report = error.details.error_report as
          | { file?: string[]; rows?: { row: number; errors: Record<string, string[]> }[] }
          | undefined;
        setImportErrors(formatImportErrorReport(report));
        setBannerError(error.message);
      } else {
        setBannerError(
          error instanceof ApiError
            ? error.message
            : 'Não foi possível validar o CSV. Tente novamente.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommitImport = async () => {
    if (!csvFile || !previewResult || readOnly) {
      return;
    }

    setBannerError('');
    setImportErrors([]);
    setSubmitting(true);

    try {
      const result = await importProvisioningCsv(schoolId, csvFile, false);
      setCommitResult(result);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'import_validation_failed') {
        const report = error.details.error_report as
          | { file?: string[]; rows?: { row: number; errors: Record<string, string[]> }[] }
          | undefined;
        setImportErrors(formatImportErrorReport(report));
        setBannerError(error.message);
      } else {
        setBannerError(
          error instanceof ApiError
            ? error.message
            : 'Não foi possível importar o CSV. Tente novamente.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmHandoff = useCallback(async () => {
    if (!school || readOnly) {
      return;
    }

    setBannerError('');
    setChecklistErrors([]);
    setSubmitting(true);

    try {
      await submitHandoff(schoolId, {
        handoff: billingWaived ? { billing_waived: true } : undefined,
      });
      navigate(paths.schools, {
        replace: true,
        state: { provisioningHandoffComplete: school.name },
      });
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
            : 'Não foi possível concluir o repasse. Tente novamente.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [billingWaived, navigate, readOnly, school, schoolId]);

  if (!backoffice) {
    window.location.assign('/app/');
    return null;
  }

  if (loadingSchool) {
    return (
      <Stack direction="column" alignItems="center" justifyContent="center" py={8}>
        <CircularProgress />
      </Stack>
    );
  }

  if (loadError || !school) {
    return (
      <Stack direction="column" gap={3.5} py={2}>
        <ProvisioningPageHeader schoolName={null} />
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

  if (readOnly) {
    const isPendingHandoff = school.onboarding_status === 'pending_handoff';

    return (
      <Stack direction="column" gap={3.5} py={2}>
        <ProvisioningPageHeader schoolName={school.name} />
        <SectionCard>
          <EmptyState
            title={isPendingHandoff ? 'Provisionamento concluído' : 'Provisionamento encerrado'}
            description={
              school.onboarding_status === 'active'
                ? 'Esta escola já está ativa. O assistente de provisionamento não está mais disponível.'
                : 'O repasse ao responsável foi concluído. Use a página de ativação para confirmar quando o diretor aceitar o convite.'
            }
            headingLevel={2}
            action={
              isPendingHandoff ? (
                <Button
                  component={RouterLink}
                  to={paths.schoolActivation(school.id)}
                  variant="contained"
                  size="small"
                >
                  Ir para ativação
                </Button>
              ) : undefined
            }
          />
        </SectionCard>
      </Stack>
    );
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack direction="column" gap={2}>
            <Typography variant="body1" color="text.secondary">
              Provisionamento premium de <strong>{school.name}</strong>. Configure cobrança, cadastre
              famílias e conclua o repasse ao responsável quando tudo estiver pronto.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Durante o provisionamento, o backoffice pode configurar billing, importar pessoas via CSV
              e finalizar o repasse para que o diretor aceite o convite e ative a escola.
            </Typography>
          </Stack>
        );

      case 1:
        return (
          <Stack direction="column" gap={2}>
            <Typography variant="body1" color="text.secondary">
              Configure um provedor de pagamento ou adie a cobrança para concluir o repasse. A escola
              poderá conectar a integração bancária depois, com o responsável.
            </Typography>

            {loadingCredentials ? (
              <Stack direction="column" alignItems="center" py={2}>
                <CircularProgress size={24} />
              </Stack>
            ) : (
              <>
                {hasActiveCredentials && activeCredential && (
                  <Alert severity="success" variant="outlined">
                    {credentialUploadSuccess
                      ? 'Credenciais enviadas com sucesso.'
                      : 'Credenciais Cora ativas configuradas.'}
                    <CredentialMetadata credential={activeCredential} />
                  </Alert>
                )}

                {!billingWaived && !hasActiveCredentials && (
                  <Stack direction="column" gap={2}>
                    <Typography variant="subtitle2">Integração Cora (boleto)</Typography>
                    <TextField
                      label="Client ID"
                      value={clientId}
                      onChange={(event) => {
                        setClientId(event.target.value);
                        setCredentialErrors([]);
                        setCredentialUploadSuccess(false);
                      }}
                      disabled={submitting}
                      fullWidth
                    />
                    <Box>
                      <Button variant="outlined" component="label" disabled={submitting}>
                        Certificado (.pem)
                        <input
                          type="file"
                          accept=".pem,application/x-pem-file"
                          hidden
                          onChange={handleCertificateChange}
                        />
                      </Button>
                      {certificateFile && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Arquivo: {certificateFile.name}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Button variant="outlined" component="label" disabled={submitting}>
                        Chave privada (.pem)
                        <input
                          type="file"
                          accept=".pem,application/x-pem-file"
                          hidden
                          onChange={handlePrivateKeyChange}
                        />
                      </Button>
                      {privateKeyFile && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Arquivo: {privateKeyFile.name}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      onClick={handleUploadCredentials}
                      disabled={
                        submitting || !clientId.trim() || !certificateFile || !privateKeyFile
                      }
                      startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                      Enviar credenciais
                    </Button>
                  </Stack>
                )}

                {credentialErrors.length > 0 && (
                  <SectionCard>
                    <Typography variant="subtitle2" gutterBottom>
                      Erros de validação
                    </Typography>
                    <List dense disablePadding>
                      {credentialErrors.map((message) => (
                        <ListItem key={message} disableGutters>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <IconifyIcon icon="mdi:close-circle" color="error.main" />
                          </ListItemIcon>
                          <ListItemText primary={message} />
                        </ListItem>
                      ))}
                    </List>
                  </SectionCard>
                )}

                {bannerError && <ErrorBanner message={bannerError} />}
              </>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={billingWaived}
                  disabled={hasActiveCredentials}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setBillingWaived(event.target.checked);
                    setChecklistErrors([]);
                  }}
                />
              }
              label="Adiar configuração de cobrança por enquanto"
            />
          </Stack>
        );

      case 2:
        return (
          <Stack direction="column" gap={2}>
            <Typography variant="body1" color="text.secondary">
              Convide membros da equipe administrativa. Esta etapa é opcional — você pode pular e
              importar famílias na próxima etapa.
            </Typography>

            {ownerInvite && (
              <SectionCard>
                <Typography variant="subtitle2" gutterBottom>
                  Convite ao responsável
                </Typography>
                <List dense disablePadding>
                  <ListItem
                    disableGutters
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleResendInvite(ownerInvite.id)}
                        disabled={submitting || resendingInviteId === ownerInvite.id}
                        startIcon={
                          resendingInviteId === ownerInvite.id ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : null
                        }
                      >
                        Reenviar convite
                      </Button>
                    }
                  >
                    <ListItemText primary={ownerInvite.email} secondary={ownerInvite.roleLabel} />
                  </ListItem>
                </List>
                {resentInviteIds.has(ownerInvite.id) && (
                  <Alert severity="success" variant="outlined" sx={{ mt: 1 }}>
                    Convite reenviado com sucesso.
                  </Alert>
                )}
              </SectionCard>
            )}

            {loadingRoleTemplates ? (
              <Stack direction="column" alignItems="center" py={2}>
                <CircularProgress size={24} />
              </Stack>
            ) : staffAssignableTemplates.length > 0 ? (
              <Stack direction="column" gap={2}>
                <TextField
                  label="E-mail"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => {
                    setInviteEmail(event.target.value);
                    setInviteSuccess(false);
                    setBannerError('');
                  }}
                  disabled={submitting || readOnly}
                  helperText="Deixe em branco e continue para pular."
                  fullWidth
                />
                <TextField
                  label="Função"
                  select
                  value={selectedTemplateId}
                  onChange={(event) => {
                    setSelectedTemplateId(Number(event.target.value));
                    setInviteSuccess(false);
                    setBannerError('');
                  }}
                  disabled={submitting || readOnly}
                  fullWidth
                >
                  {staffAssignableTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Título de exibição (opcional)"
                  value={inviteDisplayTitle}
                  onChange={(event) => {
                    setInviteDisplayTitle(event.target.value);
                    setInviteSuccess(false);
                    setBannerError('');
                  }}
                  disabled={submitting || readOnly}
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={handleSendTeamInvite}
                  disabled={submitting || !inviteEmail.trim() || selectedTemplateId === ''}
                  startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  Enviar convite
                </Button>
              </Stack>
            ) : (
              <Alert severity="info" variant="outlined">
                Nenhum modelo de função disponível para convite — pule esta etapa e convide a equipe
                depois.
              </Alert>
            )}

            {inviteSuccess && (
              <Alert severity="success" variant="outlined">
                Convite enviado com sucesso.
              </Alert>
            )}

            {sentInvites.length > 0 && (
              <SectionCard>
                <Typography variant="subtitle2" gutterBottom>
                  Convites enviados
                </Typography>
                <List dense disablePadding>
                  {sentInvites.map((invite) => (
                    <ListItem
                      key={invite.id}
                      disableGutters
                      secondaryAction={
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleResendInvite(invite.id)}
                          disabled={submitting || resendingInviteId === invite.id}
                          startIcon={
                            resendingInviteId === invite.id ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : null
                          }
                        >
                          Reenviar convite
                        </Button>
                      }
                    >
                      <ListItemText primary={invite.email} secondary={invite.roleLabel} />
                    </ListItem>
                  ))}
                </List>
                {sentInvites.some((invite) => resentInviteIds.has(invite.id)) && (
                  <Alert severity="success" variant="outlined" sx={{ mt: 1 }}>
                    Convite reenviado com sucesso.
                  </Alert>
                )}
              </SectionCard>
            )}

            {bannerError && <ErrorBanner message={bannerError} />}
          </Stack>
        );

      case 3:
        return (
          <Stack direction="column" gap={2}>
            <Typography variant="body1" color="text.secondary">
              Envie um arquivo CSV com as colunas obrigatórias. Valide com a pré-visualização antes de
              confirmar a importação.
            </Typography>
            <Typography variant="caption" color="text.secondary" component="p">
              Colunas: {CSV_COLUMNS}
            </Typography>
            <Box>
              <Button variant="outlined" component="label" disabled={submitting}>
                Selecionar arquivo CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              {csvFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Arquivo: {csvFile.name}
                </Typography>
              )}
            </Box>
            <Stack direction="row" gap={1.5}>
              <Button
                variant="outlined"
                onClick={handlePreviewImport}
                disabled={submitting || !csvFile}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              >
                Pré-visualizar
              </Button>
              <Button
                variant="contained"
                onClick={handleCommitImport}
                disabled={submitting || !previewResult}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              >
                Confirmar importação
              </Button>
            </Stack>
            {previewResult && !commitResult && (
              <Alert severity="success" variant="outlined">
                Pré-visualização concluída — nenhum dado foi gravado.
                <SummaryList summary={previewResult.summary} />
              </Alert>
            )}
            {commitResult && (
              <Alert severity="success">
                Importação concluída com sucesso.
                <SummaryList summary={commitResult.summary} />
              </Alert>
            )}
            {importErrors.length > 0 && (
              <SectionCard>
                <Typography variant="subtitle2" gutterBottom>
                  Erros de validação
                </Typography>
                <List dense disablePadding>
                  {importErrors.map((message) => (
                    <ListItem key={message} disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <IconifyIcon icon="mdi:close-circle" color="error.main" />
                      </ListItemIcon>
                      <ListItemText primary={message} />
                    </ListItem>
                  ))}
                </List>
              </SectionCard>
            )}
            {bannerError && <ErrorBanner message={bannerError} />}
          </Stack>
        );

      case 4:
        return (
          <Stack direction="column" gap={2}>
            <Typography variant="body1" color="text.secondary">
              Revise os itens abaixo antes de repassar a escola ao responsável. Após a confirmação, o
              status passará para &quot;Aguardando repasse&quot; e o diretor poderá aceitar o convite.
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
              {commitResult && (
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <IconifyIcon icon="mdi:check-circle" color="success.main" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Importação CSV concluída (${commitResult.summary.valid_rows} linhas)`}
                  />
                </ListItem>
              )}
              {sentInvites.length > 0 && (
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
              {submitting ? 'Concluindo repasse...' : 'Confirmar repasse ao responsável'}
            </Button>
            {!handoffReady && (
              <Typography variant="body2" color="text.secondary" align="center">
                Configure as credenciais Cora ou adie a cobrança na etapa de cobrança para continuar.
              </Typography>
            )}
          </Stack>
        );

      default:
        return null;
    }
  };

  const isCsvStep = activeStep === 3;
  const isHandoffStep = activeStep === 4;

  return (
    <Stack direction="column" gap={3.5} py={2}>
      <ProvisioningPageHeader schoolName={school.name} />

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

      {!isCsvStep && !isHandoffStep && (
        <Stack direction="row" gap={1.5} justifyContent="space-between">
          <Button variant="outlined" onClick={goBack} disabled={activeStep === 0 || submitting}>
            Voltar
          </Button>
          <Button variant="contained" onClick={goNext} disabled={submitting}>
            {activeStep === STEPS.length - 2 ? 'Revisar repasse' : 'Continuar'}
          </Button>
        </Stack>
      )}

      {isCsvStep && (
        <Stack direction="row" gap={1.5} justifyContent="space-between">
          <Button variant="outlined" onClick={goBack} disabled={submitting}>
            Voltar
          </Button>
          <Button variant="contained" onClick={goNext} disabled={submitting}>
            Continuar
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

const ProvisioningPageHeader = ({ schoolName }: { schoolName: string | null }) => (
  <PageHeader
    title="Provisionamento da escola"
    subtitle={
      schoolName
        ? `Configure ${schoolName} antes do repasse ao responsável.`
        : 'Assistente de provisionamento premium.'
    }
  />
);

export default ProvisioningWizard;
