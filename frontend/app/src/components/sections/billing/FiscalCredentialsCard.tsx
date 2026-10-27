import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner, InfoBanner, SectionCard, SuccessBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { listFiscalCredentials, registerFiscalApiKey } from 'services/fiscalCredentialsApi';
import { DEFAULT_SPEDY_BASE_URL, FiscalCredential } from 'types/fiscalCredential';

export interface FiscalCredentialsCardProps {
  schoolId: number;
}

type FieldErrors = Partial<Record<'api_key' | 'base_url', string>>;

const FIELD_KEYS = ['api_key', 'base_url'] as const;

const firstMessage = (value: unknown): string | undefined =>
  Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;

/** Splits API validation details into per-field messages and banner messages for the rest. */
const splitErrors = (error: ApiError): { fields: FieldErrors; banners: string[] } => {
  const providerMessage = error.details.message;

  if (error.code === 'provider_error' && typeof providerMessage === 'string' && providerMessage) {
    return { fields: {}, banners: [providerMessage] };
  }

  const fields: FieldErrors = {};
  FIELD_KEYS.forEach((key) => {
    const message = firstMessage(error.details[key]);
    if (message) {
      fields[key] = message;
    }
  });

  const banners = Object.entries(error.details)
    .filter(([key]) => !(FIELD_KEYS as readonly string[]).includes(key))
    .flatMap(([field, messages]) =>
      (Array.isArray(messages) ? messages : []).map((message) => `${field}: ${message}`),
    );

  if (Object.keys(fields).length === 0 && banners.length === 0) {
    banners.push(error.message);
  }

  return { fields, banners };
};

/**
 * Spedy credentials for NFS-e: write-only API key plus the Spedy base URL.
 *
 * Nested inside billing settings, not a `<form>`; the API stores the api_key encrypted and never
 * returns it.
 */
const FiscalCredentialsCard = ({ schoolId }: FiscalCredentialsCardProps) => {
  const { t } = useTranslation();

  const [credentials, setCredentials] = useState<FiscalCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const list = await listFiscalCredentials(schoolId);
      setCredentials(list);
      setBaseUrl(list.find((credential) => credential.active)?.base_url ?? '');
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
  const canSave = Boolean(apiKey.trim());

  const clearFeedback = () => {
    setErrors([]);
    setFieldErrors({});
    setNotice('');
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    setSaving(true);
    clearFeedback();

    try {
      const trimmedBaseUrl = baseUrl.trim();

      await registerFiscalApiKey(schoolId, {
        api_key: apiKey.trim(),
        ...(trimmedBaseUrl ? { base_url: trimmedBaseUrl } : {}),
      });

      setNotice(t('fiscalCredentials.saved'));
      setApiKey('');
      await load();
    } catch (error) {
      if (error instanceof ApiError) {
        const { fields, banners } = splitErrors(error);
        setFieldErrors(fields);
        setErrors(banners);
      } else {
        setErrors([t('fiscalCredentials.connectionError')]);
      }
    } finally {
      setSaving(false);
    }
  };

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

        {!loading && !active ? (
          <Typography variant="body2" color="text.secondary">
            {t('fiscalCredentials.none')}
          </Typography>
        ) : null}

        <InfoBanner message={t('fiscalCredentials.help')} />

        {notice ? <SuccessBanner message={notice} /> : null}

        {errors.map((message) => (
          <ErrorBanner key={message} message={message} />
        ))}

        <TextField
          id="fiscal-credentials-api-key"
          label={t('fiscalCredentials.apiKey')}
          helperText={
            fieldErrors.api_key ||
            (active ? t('fiscalCredentials.apiKeyReplace') : t('fiscalCredentials.apiKeyHelp'))
          }
          error={Boolean(fieldErrors.api_key)}
          type="password"
          value={apiKey}
          onChange={(event) => {
            setApiKey(event.target.value);
            clearFeedback();
          }}
          disabled={saving}
          slotProps={{ htmlInput: { autoComplete: 'new-password' } }}
          variant="filled"
          fullWidth
        />

        <TextField
          id="fiscal-credentials-base-url"
          label={t('fiscalCredentials.baseUrl')}
          helperText={fieldErrors.base_url || t('fiscalCredentials.baseUrlHelp')}
          error={Boolean(fieldErrors.base_url)}
          placeholder={DEFAULT_SPEDY_BASE_URL}
          value={baseUrl}
          onChange={(event) => {
            setBaseUrl(event.target.value);
            clearFeedback();
          }}
          disabled={saving}
          slotProps={{ htmlInput: { autoComplete: 'off' } }}
          variant="filled"
          fullWidth
        />

        <Stack direction="row" justifyContent="flex-end">
          <Button
            type="button"
            variant="contained"
            onClick={handleSave}
            disabled={!canSave || saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? t('fiscalCredentials.saving') : t('fiscalCredentials.save')}
          </Button>
        </Stack>
      </Stack>
    </SectionCard>
  );
};

export default FiscalCredentialsCard;
