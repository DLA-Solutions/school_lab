import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner, InfoBanner, SectionCard, SuccessBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { listBankCredentials, uploadBankCredentials } from 'services/bankCredentialsApi';
import { SchoolPaymentProvider } from 'types/bankCredential';

export interface BankCredentialsCardProps {
  schoolId: number;
}

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
 * rules are the ones worth reading in full — an expired certificate, or a key that does not match
 * it, is refused here rather than at the bank with a family's charge already in flight.
 */
const toMessages = (details: Record<string, unknown>) =>
  Object.entries(details).flatMap(([field, messages]) =>
    (Array.isArray(messages) ? messages : []).map(
      (message) => `${FIELD_LABELS[field] ?? field}: ${message}`,
    ),
  );

/**
 * The school's own Cora credentials, on the screen its billing staff already use.
 *
 * The same upload exists in the backoffice, for the platform's operators. It is offered here too
 * because the certificate belongs to the school — the bank issued it to them — and it expires:
 * waiting on the platform to replace it would stop their billing. The PEM bodies are write-only;
 * the API stores them encrypted and never returns them, so this can only ever show the metadata
 * derived from them.
 *
 * Not a `<form>`: this sits inside the billing settings form, and a nested one is invalid.
 */
const BankCredentialsCard = ({ schoolId }: BankCredentialsCardProps) => {
  const { t } = useTranslation();

  const [credentials, setCredentials] = useState<SchoolPaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState('');
  const [certificate, setCertificate] = useState<File | null>(null);
  const [privateKey, setPrivateKey] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setCredentials(await listBankCredentials(schoolId));
    } catch {
      // A school whose billing is not set up yet has nothing to show, and the upload below is
      // exactly what fixes that — so this stays quiet rather than reporting an absence as a fault.
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const active = credentials.find((credential) => credential.active) ?? null;
  const canSubmit = Boolean(clientId.trim()) && Boolean(certificate) && Boolean(privateKey);

  const handleUpload = async () => {
    if (!canSubmit || !certificate || !privateKey) {
      return;
    }

    setSubmitting(true);
    setErrors([]);
    setUploaded(false);

    try {
      await uploadBankCredentials(schoolId, {
        client_id: clientId.trim(),
        certificate,
        private_key: privateKey,
      });

      setUploaded(true);
      setClientId('');
      setCertificate(null);
      setPrivateKey(null);
      await load();
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = toMessages(error.details);
        setErrors(messages.length > 0 ? messages : [error.message]);
      } else {
        setErrors([t('bankCredentials.connectionError')]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filePicker = (
    label: string,
    file: File | null,
    onPick: (picked: File | null) => void,
  ) => (
    <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
      <Button variant="outlined" component="label" disabled={submitting}>
        {label}
        <input
          type="file"
          accept=".pem,.cert,.crt,.key,application/x-pem-file"
          hidden
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            onPick(event.target.files?.[0] ?? null);
            setErrors([]);
            setUploaded(false);
          }}
        />
      </Button>
      <Typography variant="body2" color={file ? 'text.primary' : 'text.secondary'}>
        {file ? file.name : t('bankCredentials.noFile')}
      </Typography>
    </Stack>
  );

  return (
    <SectionCard title={t('bankCredentials.title')}>
      <Stack direction="column" gap={2.5}>
        <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle2">{t('bankCredentials.cora')}</Typography>
          {loading ? (
            <CircularProgress size={16} />
          ) : active ? (
            <Chip size="small" color="success" label={t('bankCredentials.active')} />
          ) : (
            <Chip size="small" variant="outlined" label={t('bankCredentials.notConfigured')} />
          )}
        </Stack>

        {!loading &&
          (active ? (
            <List dense disablePadding>
              <ListItem disableGutters>
                <ListItemText primary="Client ID" secondary={active.client_id} />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText
                  primary={t('bankCredentials.fingerprint')}
                  secondary={active.certificate_fingerprint}
                  slotProps={{ secondary: { sx: { wordBreak: 'break-all' } } }}
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText
                  primary={t('bankCredentials.validUntil')}
                  secondary={formatDate(active.certificate_expires_at)}
                />
              </ListItem>
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('bankCredentials.none')}
            </Typography>
          ))}

        <InfoBanner message={t('bankCredentials.help')} />

        {uploaded && <SuccessBanner message={t('bankCredentials.uploaded')} />}

        {errors.map((message) => (
          <ErrorBanner key={message} message={message} />
        ))}

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
        />

        {filePicker(t('bankCredentials.certificate'), certificate, setCertificate)}
        {filePicker(t('bankCredentials.privateKey'), privateKey, setPrivateKey)}

        <Stack direction="row" justifyContent="flex-end">
          {/* `type="button"`: the billing settings form wraps this, and a bare button inside it
              would submit that form instead. */}
          <Button
            type="button"
            variant="contained"
            onClick={handleUpload}
            disabled={!canSubmit || submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {submitting ? t('bankCredentials.sending') : t('bankCredentials.send')}
          </Button>
        </Stack>
      </Stack>
    </SectionCard>
  );
};

export default BankCredentialsCard;
