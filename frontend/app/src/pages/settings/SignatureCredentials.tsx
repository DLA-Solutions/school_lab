import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
  EmptyState,
  ErrorBanner,
  InfoBanner,
  PageHeader,
  SectionCard,
  SuccessBanner,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { resolveApiErrorMessage } from 'utils/api/resolveApiErrorMessage';
import { ApiError } from 'services/api';
import {
  listSignatureCredentials,
  registerSignatureCredentials,
} from 'services/signatureCredentialsApi';
import { RegisteredSignatureProvider, SchoolSignatureProvider } from 'types/signatureCredential';

/** What the API calls each field, in the words the form uses. */
const FIELD_KEYS = {
  api_token: 'signature.field.apiToken',
  provider: 'signature.field.provider',
} as const;

type FieldKey = keyof typeof FIELD_KEYS;

const isFieldKey = (field: string): field is FieldKey => field in FIELD_KEYS;

/**
 * The school's own Autentique registration.
 *
 * The token is write-only: it is stored encrypted and no view of the resource returns it, so this
 * screen can only ever show that one is registered. Re-registering replaces the token in use,
 * which is how a rotation is done — and it is why the form is offered even when a token is
 * already in place.
 *
 * Owner-only. The token creates documents in the school's name, so it sits with the person who
 * signs for the school rather than with staff at large; the route is guarded and the nav entry is
 * hidden for everyone else.
 */
const SignatureCredentials = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [credentials, setCredentials] = useState<SchoolSignatureProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [apiToken, setApiToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  // Held after a successful registration: the secret comes back once and cannot be read again.
  const [registered, setRegistered] = useState<RegisteredSignatureProvider | null>(null);

  const toMessages = useCallback(
    (details: Record<string, unknown>) =>
      Object.entries(details).flatMap(([field, messages]) =>
        (Array.isArray(messages) ? messages : []).map(
          (message) => `${isFieldKey(field) ? t(FIELD_KEYS[field]) : field}: ${message}`,
        ),
      ),
    [t],
  );

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    try {
      setCredentials(await listSignatureCredentials(schoolId));
    } catch (err) {
      setCredentials([]);
      setLoadError(resolveApiErrorMessage(err, t, 'signature.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCredential = useMemo(
    () => credentials.find((credential) => credential.active) ?? null,
    [credentials],
  );

  const canSubmit = Boolean(apiToken.trim()) && !submitting && Boolean(schoolId);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit || !schoolId) {
      return;
    }

    setSubmitting(true);
    setErrors([]);
    setRegistered(null);

    try {
      setRegistered(await registerSignatureCredentials(schoolId, apiToken.trim()));
      // Cleared at once: the token is a live credential and there is no reason to leave it
      // sitting in an input on a screen someone may walk away from.
      setApiToken('');
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        const messages = toMessages(err.details);
        setErrors(messages.length > 0 ? messages : [err.message]);
      } else {
        setErrors([t('signature.saveError')]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.signatureCredentials')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('signature.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.signatureCredentials')} />

      {loadError && (
        <ErrorBanner message={loadError} onRetry={load} retryLabel={t('common.tryAgain')} />
      )}

      <SectionCard>
        {loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        ) : (
          <Stack direction="column" gap={2}>
            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
              <Typography variant="subtitle1">{t('signature.title')}</Typography>
              {activeCredential ? (
                <Chip size="small" color="success" label={t('signature.status.active')} />
              ) : (
                <Chip size="small" variant="outlined" label={t('signature.status.missing')} />
              )}
            </Stack>

            {activeCredential ? (
              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemText
                    primary={t('signature.field.provider')}
                    secondary={activeCredential.provider}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText
                    primary={t('signature.field.webhookUrl')}
                    secondary={activeCredential.webhook_path}
                    slotProps={{ secondary: { sx: { wordBreak: 'break-all' } } }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText
                    primary={t('signature.field.webhookSecret')}
                    secondary={
                      activeCredential.webhook_secret_set
                        ? t('signature.secret.set')
                        : t('signature.secret.missing')
                    }
                  />
                </ListItem>
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('signature.empty')}
              </Typography>
            )}
          </Stack>
        )}
      </SectionCard>

      <SectionCard>
        <Stack component="form" onSubmit={handleSubmit} direction="column" gap={2.5} noValidate>
          <Typography variant="subtitle1">
            {activeCredential ? t('signature.replace') : t('signature.register')}
          </Typography>

          <InfoBanner message={t('signature.hint')} />

          {registered && (
            <Stack direction="column" gap={1}>
              <SuccessBanner message={t('signature.saved')} />
              {/* Shown once and nowhere else: the secret cannot be read back afterwards. */}
              <InfoBanner
                message={t('signature.webhookInstructions', {
                  url: registered.webhook_path,
                  secret: registered.webhook_secret,
                })}
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
            id="signature-api-token"
            label={t('signature.field.apiToken')}
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
              {submitting ? t('signature.saving') : t('signature.register')}
            </Button>
          </Stack>
        </Stack>
      </SectionCard>
    </Stack>
  );
};

export default SignatureCredentials;
