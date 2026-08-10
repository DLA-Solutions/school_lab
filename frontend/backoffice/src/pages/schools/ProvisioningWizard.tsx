import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Alert from '@mui/material/Alert';
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
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useAuth } from 'providers/AuthContext';
import paths from 'routes/paths';
import { ApiError } from 'services/api';
import { importProvisioningCsv, submitHandoff } from 'services/onboardingApi';
import { getSchool } from 'services/schoolsApi';
import {
  ProvisioningImportResult,
  ProvisioningImportSummary,
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

  const handoffReady = billingWaived;

  const localChecklist = useMemo(
    () => [
      { key: 'billing', complete: billingWaived },
      { key: 'owner_invite', complete: true },
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
      <Stack alignItems="center" justifyContent="center" py={8}>
        <CircularProgress />
      </Stack>
    );
  }

  if (loadError || !school) {
    return (
      <Stack gap={3.5} py={2}>
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
    return (
      <Stack gap={3.5} py={2}>
        <ProvisioningPageHeader schoolName={school.name} />
        <SectionCard>
          <EmptyState
            title="Provisionamento encerrado"
            description={
              school.onboarding_status === 'active'
                ? 'Esta escola já está ativa. O assistente de provisionamento não está mais disponível.'
                : 'Esta escola aguarda repasse ao responsável. O assistente de provisionamento não está mais disponível.'
            }
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack gap={2}>
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
          <Stack gap={2}>
            <Typography variant="body1" color="text.secondary">
              Configure um provedor de pagamento ou adie a cobrança para concluir o repasse. A escola
              poderá conectar a integração bancária depois, com o responsável.
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
          </Stack>
        );

      case 2:
        return (
          <Stack gap={2}>
            <Typography variant="body1" color="text.secondary">
              Famílias e alunos podem ser cadastrados manualmente via API durante o provisionamento ou
              importados em lote na próxima etapa. O convite ao responsável já foi enviado na criação
              da escola.
            </Typography>
            <Alert severity="info" variant="outlined">
              Use a importação CSV para cadastrar várias famílias de uma vez. Certifique-se de que as
              turmas existam na escola antes de importar.
            </Alert>
          </Stack>
        );

      case 3:
        return (
          <Stack gap={2}>
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
          <Stack gap={2}>
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
                Adie a cobrança na etapa de cobrança para continuar.
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
    <Stack gap={3.5} py={2}>
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
