import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
import { listBankCredentials, uploadBankCredentials } from 'services/bankCredentialsApi';
import { getSchool } from 'services/schoolsApi';
import { SchoolPaymentProvider } from 'types/bankCredential';
import { School } from 'types/school';
import { isBackofficeUser } from 'utils/onboarding/access';

/** What the API calls each field, in the words the form uses. */
const FIELD_LABELS: Record<string, string> = {
  client_id: 'Client ID',
  certificate: 'Certificado',
  certificate_pem: 'Certificado',
  private_key: 'Chave privada',
  private_key_pem: 'Chave privada',
};

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

/**
 * `validation_error` responses carry `details` as ActiveModel's `errors.to_hash`. The certificate
 * rules are the ones worth reading in full — an expired certificate or a key that does not match
 * it are both rejected here rather than at the bank, with a real family's charge in flight.
 */
const toMessages = (details: Record<string, unknown>) =>
  Object.entries(details).flatMap(([field, messages]) =>
    (Array.isArray(messages) ? messages : []).map(
      (message) => `${FIELD_LABELS[field] ?? field}: ${message}`,
    ),
  );

const CredentialFacts = ({ credential }: { credential: SchoolPaymentProvider }) => (
  <List dense disablePadding>
    <ListItem disableGutters>
      <ListItemText primary="Provedor" secondary={credential.provider} />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText primary="Client ID" secondary={credential.client_id} />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText
        primary="Impressão digital do certificado"
        secondary={credential.certificate_fingerprint}
        slotProps={{ secondary: { sx: { wordBreak: 'break-all' } } }}
      />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText
        primary="Certificado válido até"
        secondary={formatDate(credential.certificate_expires_at)}
      />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText primary="Enviado em" secondary={formatDate(credential.uploaded_at)} />
    </ListItem>
  </List>
);

/** Picks one file and shows which one is staged. The API takes the file, never its contents. */
const FilePicker = ({
  label,
  file,
  disabled,
  onPick,
}: {
  label: string;
  file: File | null;
  disabled: boolean;
  onPick: (file: File | null) => void;
}) => (
  <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
    <Button variant="outlined" component="label" disabled={disabled}>
      {label}
      <input
        type="file"
        accept=".pem,.cert,.crt,.key,application/x-pem-file"
        hidden
        onChange={(event: ChangeEvent<HTMLInputElement>) => onPick(event.target.files?.[0] ?? null)}
      />
    </Button>
    <Typography variant="body2" color={file ? 'text.primary' : 'text.secondary'}>
      {file ? file.name : 'Nenhum arquivo selecionado'}
    </Typography>
  </Stack>
);

/**
 * Uploads a school's Cora mTLS credentials on their own, outside the provisioning wizard.
 *
 * A certificate expires, so this is not a one-off step: sending a new pair here supersedes the
 * one in use. The PEM bodies are write-only — the API stores them encrypted and never returns
 * them, so this screen can only ever show the metadata derived from them.
 */
const BankCredentials = () => {
  const { schoolId: schoolIdParam } = useParams();
  const schoolId = Number(schoolIdParam);
  const { user } = useAuth();
  const backoffice = isBackofficeUser(user?.memberships ?? []);

  const [school, setSchool] = useState<School | null>(null);
  const [credentials, setCredentials] = useState<SchoolPaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [clientId, setClientId] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState(false);

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
        listBankCredentials(schoolId),
      ]);

      setSchool(schoolData);
      setCredentials(credentialList);
    } catch (error) {
      setSchool(null);
      setCredentials([]);
      setLoadError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível carregar as credenciais. Verifique sua conexão.',
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

  const canSubmit =
    Boolean(clientId.trim()) && Boolean(certificateFile) && Boolean(privateKeyFile) && !submitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit || !certificateFile || !privateKeyFile) {
      return;
    }

    setSubmitting(true);
    setErrors([]);
    setUploaded(false);

    try {
      await uploadBankCredentials(schoolId, {
        client_id: clientId.trim(),
        certificate: certificateFile,
        private_key: privateKeyFile,
      });

      setUploaded(true);
      setClientId('');
      setCertificateFile(null);
      setPrivateKeyFile(null);
      await load();
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = toMessages(error.details);
        setErrors(messages.length > 0 ? messages : [error.message]);
      } else {
        setErrors(['Não foi possível enviar as credenciais. Verifique sua conexão.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!backoffice) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Credenciais bancárias" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="As credenciais bancárias são administradas apenas pelo backoffice."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  if (loading) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Credenciais bancárias" />
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
        title="Credenciais bancárias"
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
            <Typography variant="subtitle1">Integração Cora (boleto)</Typography>
            {activeCredential ? (
              <Chip size="small" color="success" label="Ativa" />
            ) : (
              <Chip size="small" variant="outlined" label="Não configurada" />
            )}
          </Stack>

          {activeCredential ? (
            <CredentialFacts credential={activeCredential} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Esta escola ainda não tem credenciais Cora. Sem elas, nenhum boleto pode ser emitido.
            </Typography>
          )}
        </Stack>
      </SectionCard>

      <SectionCard>
        <Stack component="form" onSubmit={handleSubmit} direction="column" gap={2.5} noValidate>
          <Typography variant="subtitle1">
            {activeCredential ? 'Substituir credenciais' : 'Enviar credenciais'}
          </Typography>

          <InfoBanner
            message={
              'O certificado e a chave privada são enviados como arquivos .pem ou .cert, guardados ' +
              'criptografados e nunca devolvidos pela API. Um certificado vencido, ou uma chave que ' +
              'não corresponda a ele, é recusado aqui.'
            }
          />

          {uploaded && <SuccessBanner message="Credenciais enviadas e validadas com sucesso." />}

          {errors.length > 0 && (
            <Stack direction="column" gap={1}>
              {errors.map((message) => (
                <ErrorBanner key={message} message={message} />
              ))}
            </Stack>
          )}

          <TextField
            id="bank-credentials-client-id"
            label="Client ID"
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              setErrors([]);
              setUploaded(false);
            }}
            disabled={submitting}
            variant="filled"
            fullWidth
            required
          />

          <FilePicker
            label="Certificado (.pem, .cert)"
            file={certificateFile}
            disabled={submitting}
            onPick={(file) => {
              setCertificateFile(file);
              setErrors([]);
              setUploaded(false);
            }}
          />

          <FilePicker
            label="Chave privada (.pem, .key)"
            file={privateKeyFile}
            disabled={submitting}
            onPick={(file) => {
              setPrivateKeyFile(file);
              setErrors([]);
              setUploaded(false);
            }}
          />

          <Stack direction="row" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              disabled={!canSubmit}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {submitting ? 'Enviando...' : 'Enviar credenciais'}
            </Button>
          </Stack>
        </Stack>
      </SectionCard>
    </Stack>
  );
};

export default BankCredentials;
