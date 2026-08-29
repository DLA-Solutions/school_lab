import { FormEvent, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner, PageHeader, SectionCard, SemanticChip, SuccessBanner } from 'design-system';
import { useAuth } from 'providers/AuthContext';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { changePassword } from 'services/authApi';

const MIN_PASSWORD_LENGTH = 8;

const emptyForm = () => ({
  currentPassword: '',
  password: '',
  passwordConfirmation: '',
});

/**
 * The operator's own account: the registration data GET /me already returns, and a form to
 * change their password without going through the e-mail reset flow.
 *
 * Changing the password revokes every refresh token server-side, so this screen cannot keep the
 * session alive afterwards — it reports success and signs the operator out deliberately, rather
 * than letting the next request fail with an unexplained 401.
 */
const Profile = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const backofficeMembership = user?.memberships.find(
    (membership) => membership.role === 'backoffice' && membership.status === 'active',
  );
  const roleLabel =
    backofficeMembership?.role_template?.name ?? backofficeMembership?.role ?? 'backoffice';

  const setField = (field: keyof ReturnType<typeof emptyForm>) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(t('backoffice.profile.password.tooShort', { min: MIN_PASSWORD_LENGTH }));
      return;
    }

    if (form.password !== form.passwordConfirmation) {
      setError(t('backoffice.profile.password.mismatch'));
      return;
    }

    setSaving(true);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        password: form.password,
        passwordConfirmation: form.passwordConfirmation,
      });

      setForm(emptyForm());
      setDone(true);
      // The tokens are already dead server-side; drop the local session so the app returns to
      // the login screen with the new password instead of half-authenticated.
      await logout();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_credentials') {
        setError(t('backoffice.profile.password.wrongCurrent'));
      } else {
        setError(err instanceof ApiError ? err.message : t('backoffice.profile.password.error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('backoffice.profile.title')}
        subtitle={t('backoffice.profile.subtitle')}
      />

      <SectionCard title={t('backoffice.profile.details.title')}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow label={t('backoffice.profile.details.email')} value={user?.email ?? '—'} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                {t('backoffice.profile.details.status')}
              </Typography>
              <Box>
                <SemanticChip
                  label={user?.status ?? '—'}
                  variant={user?.status === 'active' ? 'success' : 'info'}
                />
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow label={t('backoffice.profile.details.role')} value={roleLabel} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow
              label={t('backoffice.profile.details.userId')}
              value={user ? String(user.id) : '—'}
            />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title={t('backoffice.profile.password.title')}>
        <Stack spacing={2} component="form" onSubmit={handleSubmit} noValidate>
          <Typography variant="body2" color="text.secondary">
            {t('backoffice.profile.password.description')}
          </Typography>

          {error && <ErrorBanner message={error} />}
          {done && <SuccessBanner message={t('backoffice.profile.password.success')} />}

          <Divider />

          <TextField
            label={t('backoffice.profile.password.current')}
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(event) => setField('currentPassword')(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label={t('backoffice.profile.password.new')}
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setField('password')(event.target.value)}
            helperText={t('backoffice.profile.password.tooShort', { min: MIN_PASSWORD_LENGTH })}
            required
            fullWidth
          />
          <TextField
            label={t('backoffice.profile.password.confirm')}
            type="password"
            autoComplete="new-password"
            value={form.passwordConfirmation}
            onChange={(event) => setField('passwordConfirmation')(event.target.value)}
            required
            fullWidth
          />

          <Stack direction="row" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              disabled={
                saving ||
                !form.currentPassword ||
                !form.password ||
                !form.passwordConfirmation
              }
            >
              {saving
                ? t('backoffice.profile.password.saving')
                : t('backoffice.profile.password.submit')}
            </Button>
          </Stack>
        </Stack>
      </SectionCard>
    </Stack>
  );
};

export default Profile;
