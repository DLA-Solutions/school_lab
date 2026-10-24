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
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  InfoBanner,
  PageHeader,
  SectionCard,
  SuccessBanner,
} from 'design-system';
import type { MessageKey } from 'locales';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { listBankCredentials, uploadBankCredentials } from 'services/bankCredentialsApi';
import { SchoolPaymentProvider } from 'types/bankCredential';

/** What the API calls each field, as the i18n key of the word the form uses. */
const FIELD_KEYS: Record<string, MessageKey> = {
  client_id: 'interCredentials.field.clientId',
  client_secret: 'interCredentials.field.clientSecret',
  certificate: 'interCredentials.field.certificate',
  certificate_pem: 'interCredentials.field.certificate',
  private_key: 'interCredentials.field.privateKey',
  private_key_pem: 'interCredentials.field.privateKey',
};

/** Brand names, not translated. Anything unknown is shown as the API sent it. */
const PROVIDER_LABELS: Record<string, string> = {
  cora: 'Cora',
  inter: 'Banco Inter',
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
 * Banco Inter API credentials (cobrança BolePix) for the school's `bank_slip` instrument.
 *
 * Owner and direção only — the credentials charge in the school's name, so the route is guarded
 * and the menu entry hidden for the rest of the staff. Client secret, certificate and private key
 * are write-only: the API stores them encrypted and never returns them, so this page can only show
 * the metadata derived from them (client ID, fingerprint, validity).
 *
 * The server keeps one active `bank_slip` configuration per school, so uploading here replaces
 * whatever is active — Cora included. When another provider holds the slot the page says so and
 * asks for a confirmation before sending.
 */
const InterCredentials = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [credentials, setCredentials] = useState<SchoolPaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [certificate, setCertificate] = useState<File | null>(null);
  const [privateKey, setPrivateKey] = useState<File | null>(null);
  // Bumped after a successful upload so the hidden file inputs forget the chosen files.
  const [pickerKey, setPickerKey] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      setCredentials(await listBankCredentials(schoolId));
    } catch {
      // A school with nothing configured has nothing to list, and the upload below is exactly what
      // fixes that — so an unreadable listing is shown as "not configured" rather than as a fault.
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCredential = credentials.find((credential) => credential.active) ?? null;
  const interActive = activeCredential?.provider === 'inter' ? activeCredential : null;
  // Another provider's active configuration is what an upload here would replace.
  const replacedProvider =
    activeCredential && activeCredential.provider !== 'inter' ? activeCredential.provider : null;
  const replacedLabel = replacedProvider
    ? (PROVIDER_LABELS[replacedProvider] ?? replacedProvider)
    : '';

  const canSubmit =
    Boolean(clientId.trim()) &&
    Boolean(clientSecret.trim()) &&
    Boolean(certificate) &&
    Boolean(privateKey) &&
    !submitting;

  const toMessages = (details: Record<string, unknown>) =>
    Object.entries(details).flatMap(([field, messages]) =>
      (Array.isArray(messages) ? messages : []).map(
        (message) => {
          const key = FIELD_KEYS[field];

          return `${key ? t(key) : field}: ${message}`;
        },
      ),
    );

  const upload = async () => {
    if (!schoolId || !certificate || !privateKey) {
      return;
    }

    setSubmitting(true);
    setErrors([]);
    setUploaded(false);

    try {
      await uploadBankCredentials(schoolId, {
        provider: 'inter',
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        certificate,
        private_key: privateKey,
      });

      setUploaded(true);
      // Cleared at once: the secret is a live credential and has no business sitting in an input
      // on a screen someone may walk away from.
      setClientId('');
      setClientSecret('');
      setCertificate(null);
      setPrivateKey(null);
      setPickerKey((key) => key + 1);
      await load();
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = toMessages(error.details);
        setErrors(messages.length > 0 ? messages : [error.message]);
      } else {
        setErrors([t('interCredentials.connectionError')]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    if (replacedProvider) {
      setConfirming(true);
      return;
    }

    upload();
  };

  const handleConfirm = () => {
    setConfirming(false);
    upload();
  };

  const touched = () => {
    setErrors([]);
    setUploaded(false);
  };

  const filePicker = (
    label: string,
    inputId: string,
    file: File | null,
    onPick: (picked: File | null) => void,
  ) => (
    <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
      <Button variant="outlined" component="label" disabled={submitting}>
        {label}
        <input
          key={`${inputId}-${pickerKey}`}
          id={inputId}
          type="file"
          accept=".pem,.cert,.crt,.key,application/x-pem-file"
          hidden
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            onPick(event.target.files?.[0] ?? null);
            touched();
          }}
        />
      </Button>
      <Typography variant="body2" color={file ? 'text.primary' : 'text.secondary'}>
        {file ? file.name : t('interCredentials.noFile')}
      </Typography>
    </Stack>
  );

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.interCredentials')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('interCredentials.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.interCredentials')} />

      <SectionCard title={t('interCredentials.title')}>
        <Stack direction="column" gap={2.5}>
          <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle2">{t('interCredentials.integration')}</Typography>
            {loading ? (
              <CircularProgress size={16} />
            ) : interActive ? (
              <Chip size="small" color="success" label={t('interCredentials.active')} />
            ) : (
              <Chip
                size="small"
                variant="outlined"
                label={t('interCredentials.notConfigured')}
              />
            )}
          </Stack>

          {!loading &&
            (interActive ? (
              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemText
                    primary={t('interCredentials.field.clientId')}
                    secondary={interActive.client_id}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText
                    primary={t('interCredentials.fingerprint')}
                    secondary={interActive.certificate_fingerprint}
                    slotProps={{ secondary: { sx: { wordBreak: 'break-all' } } }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText
                    primary={t('interCredentials.validUntil')}
                    secondary={formatDate(interActive.certificate_expires_at)}
                  />
                </ListItem>
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('interCredentials.none')}
              </Typography>
            ))}

          <InfoBanner>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              {t('interCredentials.help.title')}
            </Typography>
            <Stack component="ol" gap={0.5} sx={{ m: 0, pl: 2.5 }}>
              <li>{t('interCredentials.help.step1')}</li>
              <li>{t('interCredentials.help.step2')}</li>
              <li>{t('interCredentials.help.step3')}</li>
              <li>{t('interCredentials.help.step4')}</li>
            </Stack>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t('interCredentials.help.storage')}
            </Typography>
          </InfoBanner>

          {replacedProvider && (
            <InfoBanner message={t('interCredentials.replaceWarning', { provider: replacedLabel })} />
          )}

          {uploaded && <SuccessBanner message={t('interCredentials.uploaded')} />}

          {errors.map((message) => (
            <ErrorBanner key={message} message={message} />
          ))}

          <TextField
            id="inter-credentials-client-id"
            label={t('interCredentials.field.clientId')}
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              touched();
            }}
            disabled={submitting}
            variant="filled"
            autoComplete="off"
            fullWidth
          />

          <TextField
            id="inter-credentials-client-secret"
            label={t('interCredentials.field.clientSecret')}
            type="password"
            value={clientSecret}
            onChange={(event) => {
              setClientSecret(event.target.value);
              touched();
            }}
            disabled={submitting}
            variant="filled"
            autoComplete="new-password"
            fullWidth
          />

          {filePicker(
            t('interCredentials.certificate'),
            'inter-credentials-certificate',
            certificate,
            setCertificate,
          )}
          {filePicker(
            t('interCredentials.privateKey'),
            'inter-credentials-private-key',
            privateKey,
            setPrivateKey,
          )}

          <Stack direction="row" justifyContent="flex-end">
            <Button
              type="button"
              variant="contained"
              onClick={handleSubmit}
              disabled={!canSubmit}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {submitting ? t('interCredentials.sending') : t('interCredentials.send')}
            </Button>
          </Stack>
        </Stack>
      </SectionCard>

      <ConfirmDialog
        open={confirming}
        title={t('interCredentials.confirm.title')}
        message={t('interCredentials.confirm.message', { provider: replacedLabel })}
        confirmLabel={t('interCredentials.confirm.action')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </Stack>
  );
};

export default InterCredentials;
