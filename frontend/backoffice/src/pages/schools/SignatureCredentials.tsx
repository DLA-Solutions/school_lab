import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import {
  EmptyState,
  ErrorBanner,
  InfoBanner,
  PageHeader,
  SectionCard,
  SuccessBanner,
} from 'design-system';
import { useAuth } from 'providers/AuthContext';
import paths from 'routes/paths';
import { ApiError } from 'services/api';
import {
  listSignatureCredentials,
  registerSignatureCredentials,
} from 'services/signatureCredentialsApi';
import { getSchool } from 'services/schoolsApi';
import { RegisteredSignatureProvider, SchoolSignatureProvider } from 'types/signatureCredential';
import { School } from 'types/school';
import { isBackofficeUser } from 'utils/onboarding/access';

/** What the API calls each field, in the words the form uses. */
const FIELD_LABELS: Record<string, string> = {
  api_token: 'Token da API',
  provider: 'Provedor',
};

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

const toMessages = (details: Record<string, unknown>) =>
  Object.entries(details).flatMap(([field, messages]) =>
    (Array.isArray(messages) ? messages : []).map(
      (message) => `${FIELD_LABELS[field] ?? field}: ${message}`,
    ),
  );

const RegistrationFacts = ({ credential }: { credential: SchoolSignatureProvider }) => (
  <List dense disablePadding>
    <ListItem disableGutters>
      <ListItemText primary="Provedor" secondary={credential.provider} />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText
        primary="URL do webhook"
        secondary={credential.webhook_path}
        slotProps={{ secondary: { sx: { wordBreak: 'break-all' } } }}
      />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText
        primary="Segredo do webhook"
        secondary={
          credential.webhook_secret_set
            ? 'Configurado'
            : 'Ausente — os callbacks da Autentique serão recusados com 401'
        }
      />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText primary="Registrado em" secondary={formatDate(credential.uploaded_at)} />
    </ListItem>
  </List>
);

/**
 * Registers a school's Autentique API token, which until now could only be done from a terminal
 * with `bin/rails signature:register`.
 *
 * The token is write-only: it is stored encrypted and no view of the resource returns it, so this
 * screen can only ever show that one is registered. Re-registering replaces the token in use,
 * which is how a rotation is done — and it is why the form is offered even when a token is
 * already in place.
 */
const SignatureCredentials = () => {
  const { schoolId: schoolIdParam } = useParams();
  const schoolId = Number(schoolIdParam);
  const { user } = useAuth();
  const backoffice = isBackofficeUser(user?.memberships ?? []);

  const [school, setSchool] = useState<School | null>(null);
  const [credentials, setCredentials] = useState<SchoolSignatureProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [apiToken, setApiToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  // Held after a successful registration: the secret comes back once and cannot be read again.
  const [registered, setRegistered] = useState<RegisteredSignatureProvider | null>(null);

  const load = useCallback(async () => {
    if (!backoffice || !Number.isFinite(schoolId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    try {
      const [schoolData, credentialList] = await Promise.all([
        getSchool(schoolId),
        listSignatureCredentials(schoolId),
      ]);

      setSchool(schoolData);
      setCredentials(credentialList);
    } catch (error) {
      setSchool(null);
      setCredentials([]);
      setLoadError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível carregar a configuração de assinatura. Verifique sua conexão.',
      );
    } finally {
      setLoading(false);
    }
  }, [backoffice, schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCredential = useMemo(
    () => credentials.find((credential) => credential.active) ?? null,
    [credentials],
  );

  const canSubmit = Boolean(apiToken.trim()) && !submitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setErrors([]);
    setRegistered(null);

    try {
      const result = await registerSignatureCredentials(schoolId, apiToken.trim());

      setRegistered(result);
      // Cleared at once: the token is a live credential and there is no reason to leave it
      // sitting in an input on a screen someone may walk away from.
      setApiToken('');
      await load();
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = toMessages(error.details);
        setErrors(messages.length > 0 ? messages : [error.message]);
      } else {
        setErrors(['Não foi possível registrar o token. Verifique sua conexão.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!backoffice) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Assinatura eletrônica" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="O token da Autentique é administrado apenas pelo backoffice."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  if (loading) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Assinatura eletrônica" />
        <SectionCard>
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title="Assinatura eletrônica"
        subtitle={school ? school.name : undefined}
        actions={
          <Button
            component={RouterLink}
            to={paths.schools}
            size="small"
            color="inherit"
            startIcon={<IconifyIcon icon="mingcute:arrow-left-line" />}
          >
            Escolas
          </Button>
        }
      />

      {loadError && <ErrorBanner message={loadError} onRetry={load} retryLabel="Tentar de novo" />}

      <SectionCard>
        <Stack direction="column" gap={2}>
          <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle1">Integração Autentique (contratos)</Typography>
            {activeCredential ? (
              <Chip size="small" color="success" label="Ativa" />
            ) : (
              <Chip size="small" variant="outlined" label="Não configurada" />
            )}
          </Stack>

          {activeCredential ? (
            <RegistrationFacts credential={activeCredential} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Esta escola ainda não tem token da Autentique. Sem ele, nenhum contrato pode ser
              enviado para assinatura.
            </Typography>
          )}
        </Stack>
      </SectionCard>

      <SectionCard>
        <Stack component="form" onSubmit={handleSubmit} direction="column" gap={2.5} noValidate>
          <Typography variant="subtitle1">
            {activeCredential ? 'Substituir token' : 'Registrar token'}
          </Typography>

          <InfoBanner
            message={
              'O token é guardado criptografado e nunca devolvido pela API — nem para o backoffice. ' +
              'Registrar de novo substitui o token em uso, que é como se faz a rotação.'
            }
          />

          {registered && (
            <Stack direction="column" gap={1}>
              <SuccessBanner message="Token registrado com sucesso." />
              {/* Shown once and nowhere else: the secret cannot be read back afterwards. */}
              <InfoBanner
                message={
                  `Cadastre na Autentique (Configurações → Webhooks), formato JSON — ` +
                  `URL: ${registered.webhook_path} · Segredo: ${registered.webhook_secret}. ` +
                  'Anote agora: este segredo não é exibido de novo.'
                }
              />
            </Stack>
          )}

          {errors.length > 0 && (
            <Stack direction="column" gap={1}>
              {errors.map((message) => (
                <ErrorBanner key={message} message={message} />
              ))}
            </Stack>
          )}

          <TextField
            id="signature-credentials-api-token"
            label="Token da API da Autentique"
            // A live credential that can create documents in the school's name, so it is masked
            // like a password rather than left readable over someone's shoulder.
            type="password"
            value={apiToken}
            onChange={(event) => {
              setApiToken(event.target.value);
              setErrors([]);
              setRegistered(null);
            }}
            disabled={submitting}
            variant="filled"
            fullWidth
            required
          />

          <Stack direction="row" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              disabled={!canSubmit}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {submitting ? 'Registrando...' : 'Registrar token'}
            </Button>
          </Stack>
        </Stack>
      </SectionCard>
    </Stack>
  );
};

export default SignatureCredentials;
