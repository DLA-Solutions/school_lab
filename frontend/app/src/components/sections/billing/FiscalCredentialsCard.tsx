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
import {
  listFiscalCredentials,
  provisionFiscalCredentials,
  uploadFiscalCertificate,
} from 'services/fiscalCredentialsApi';
import { FiscalCredential } from 'types/fiscalCredential';

export interface FiscalCredentialsCardProps {
  schoolId: number;
}

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
    (Array.isArray(messages) ? messages : []).map((message) => `${field}: ${message}`),
  );

/**
 * Spedy credentials and A1 certificate upload for NFS-e.
 *
 * Mirrors `BankCredentialsCard`: nested inside billing settings, not a `<form>`, and write-only
 * secrets — the API stores the api_key encrypted and never returns it.
 */
const FiscalCredentialsCard = ({ schoolId }: FiscalCredentialsCardProps) => {
  const { t } = useTranslation();

  const [credentials, setCredentials] = useState<FiscalCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setCredentials(await listFiscalCredentials(schoolId));
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const active = credentials.find((credential) => credential.active) ?? null;
  const canUpload = Boolean(certificate) && Boolean(password.trim());

  const handleProvision = async () => {
    setProvisioning(true);
    setErrors([]);
    setNotice('');

    try {
      await provisionFiscalCredentials(schoolId);
      setNotice(t('fiscalCredentials.provisioned'));
      await load();
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = toMessages(error.details);
        setErrors(messages.length > 0 ? messages : [error.message]);
      } else {
        setErrors([t('fiscalCredentials.connectionError')]);
      }
    } finally {
      setProvisioning(false);
    }
  };

  const handleUpload = async () => {
    if (!canUpload || !certificate) {
      return;
    }

    setSubmitting(true);
    setErrors([]);
    setNotice('');

    try {
      await uploadFiscalCertificate(schoolId, {
        certificate,
        password: password.trim(),
      });

      setNotice(t('fiscalCredentials.uploaded'));
      setCertificate(null);
      setPassword('');
      await load();
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = toMessages(error.details);
        setErrors(messages.length > 0 ? messages : [error.message]);
      } else {
        setErrors([t('fiscalCredentials.connectionError')]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filePicker = (
    <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
      <Button variant="outlined" component="label" disabled={submitting || !active}>
        {t('fiscalCredentials.certificate')}
        <input
          type="file"
          accept=".pfx,application/x-pkcs12"
          hidden
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setCertificate(event.target.files?.[0] ?? null);
            setErrors([]);
            setNotice('');
          }}
        />
      </Button>
      <Typography variant="body2" color={certificate ? 'text.primary' : 'text.secondary'}>
        {certificate ? certificate.name : t('fiscalCredentials.noFile')}
      </Typography>
    </Stack>
  );

  return (
    <SectionCard title={t('fiscalCredentials.title')}>
      <Stack direction="column" gap={2.5}>
        <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle2">{t('fiscalCredentials.spedy')}</Typography>
          {loading ? (
            <CircularProgress size={16} />
          ) : active ? (
            <Chip size="small" color="success" label={t('fiscalCredentials.active')} />
          ) : (
            <Chip size="small" variant="outlined" label={t('fiscalCredentials.notConfigured')} />
          )}
        </Stack>

        {!loading &&
          (active ? (
            <List dense disablePadding>
              <ListItem disableGutters>
                <ListItemText
                  primary={t('fiscalCredentials.provider')}
                  secondary={active.provider}
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText
                  primary={t('fiscalCredentials.registeredAt')}
                  secondary={formatDate(active.uploaded_at)}
                />
              </ListItem>
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('fiscalCredentials.none')}
            </Typography>
          ))}

        <InfoBanner message={t('fiscalCredentials.help')} />

        {notice ? <SuccessBanner message={notice} /> : null}

        {errors.map((message) => (
          <ErrorBanner key={message} message={message} />
        ))}

        {!active ? (
          <Stack direction="row" justifyContent="flex-end">
            <Button
              type="button"
              variant="outlined"
              onClick={handleProvision}
              disabled={provisioning}
              startIcon={provisioning ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {provisioning ? t('fiscalCredentials.provisioning') : t('fiscalCredentials.provision')}
            </Button>
          </Stack>
        ) : null}

        {filePicker}

        <TextField
          id="fiscal-credentials-password"
          label={t('fiscalCredentials.password')}
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrors([]);
            setNotice('');
          }}
          disabled={submitting || !active}
          variant="filled"
          fullWidth
        />

        <Stack direction="row" justifyContent="flex-end">
          <Button
            type="button"
            variant="contained"
            onClick={handleUpload}
            disabled={!canUpload || submitting || !active}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {submitting ? t('fiscalCredentials.sending') : t('fiscalCredentials.send')}
          </Button>
        </Stack>
      </Stack>
    </SectionCard>
  );
};

export default FiscalCredentialsCard;
