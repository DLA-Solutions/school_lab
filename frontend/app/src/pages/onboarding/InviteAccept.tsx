import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import IconifyIcon from 'components/base/IconifyIcon';
import { ErrorBanner } from 'design-system';
import { useAuth } from 'providers/AuthContext';
import { ApiError } from 'services/api';
import { acceptInvite, acceptMembership } from 'services/onboardingApi';
import { findInvitedMembership } from 'utils/onboarding/access';
import paths, { rootPaths } from 'routes/paths';

const MIN_PASSWORD_LENGTH = 8;

interface FieldErrors {
  email?: string;
  name?: string;
  password?: string;
}

const mapInviteError = (error: ApiError): string => {
  if (error.code === 'invalid_invite_token') {
    return 'Este convite é inválido ou expirou. Peça um novo convite à escola ou entre em contato com o suporte.';
  }

  return error.message;
};

const InviteAccept = () => {
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token') ?? '';
  const emailFromQuery = searchParams.get('email') ?? '';

  const { status, user, login, refreshUser } = useAuth();
  const navigate = useNavigate();

  const invitedMembership = useMemo(() => findInvitedMembership(user), [user]);
  const tokenOnlyFlow = Boolean(tokenFromQuery);
  const membershipOnlyFlow = !tokenFromQuery && status === 'authenticated' && Boolean(invitedMembership);

  const [form, setForm] = useState({
    email: emailFromQuery,
    name: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [bannerError, setBannerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [event.target.name]: undefined }));
    setBannerError('');
  };

  const validateTokenFlow = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!form.email.trim()) {
      errors.email = 'Informe o e-mail usado no convite.';
    }

    if (!form.password || form.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }

    return errors;
  };

  const redirectAfterAccept = async () => {
    const profile = await refreshUser();
    const ownerPending = profile.memberships.some(
      (membership) =>
        membership.is_owner === true && membership.school_onboarding_status === 'pending_handoff',
    );

    navigate(ownerPending ? paths.ownerOnboarding : rootPaths.root, { replace: true });
  };

  const handleMembershipAccept = async (membershipId: number, email: string, password: string) => {
    if (status !== 'authenticated') {
      await login({ email, password });
    }

    await acceptMembership(membershipId);
    await redirectAfterAccept();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBannerError('');

    if (membershipOnlyFlow && invitedMembership) {
      setSubmitting(true);

      try {
        await acceptMembership(invitedMembership.id);
        await redirectAfterAccept();
      } catch (error) {
        setBannerError(
          error instanceof ApiError
            ? error.message
            : 'Não foi possível concluir o convite. Tente novamente.',
        );
        setSubmitting(false);
      }

      return;
    }

    if (!tokenFromQuery) {
      setBannerError('Link de convite incompleto. Abra o link enviado por e-mail ou faça login.');
      return;
    }

    const localErrors = validateTokenFlow();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);

    try {
      const inviteResult = await acceptInvite({
        token: tokenFromQuery,
        password: form.password,
        name: form.name.trim() || undefined,
      });

      await handleMembershipAccept(
        inviteResult.data.membership_id,
        form.email.trim(),
        form.password,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'validation_error' && error.details) {
          const nextErrors: FieldErrors = {};
          if (Array.isArray(error.details.name)) {
            nextErrors.name = 'Informe seu nome completo.';
          }
          if (Array.isArray(error.details.password)) {
            nextErrors.password = String(error.details.password[0]);
          }
          if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
          }
          setBannerError(error.message);
        } else {
          setBannerError(mapInviteError(error));
        }
      } else {
        setBannerError('Não foi possível conectar à API. Verifique se o servidor está no ar.');
      }

      setSubmitting(false);
    }
  };

  if (!tokenOnlyFlow && !membershipOnlyFlow) {
    return (
      <Stack gap={2}>
        <Typography align="center" variant="h3" fontWeight={600}>
          Aceitar convite
        </Typography>
        <Typography align="center" variant="body2" color="text.secondary">
          Abra o link enviado por e-mail ou faça login para concluir seu convite.
        </Typography>
        {bannerError && <ErrorBanner message={bannerError} />}
        <Button component={RouterLink} to={paths.signin} variant="contained" fullWidth>
          Ir para login
        </Button>
      </Stack>
    );
  }

  return (
    <>
      <Typography align="center" variant="h3" fontWeight={600}>
        Aceitar convite
      </Typography>
      <Typography mt={1.5} align="center" variant="body2" color="text.secondary">
        {membershipOnlyFlow
          ? 'Confirme para ativar seu acesso à escola.'
          : 'Defina sua senha para concluir o convite.'}
      </Typography>
      <Stack onSubmit={handleSubmit} component="form" direction="column" gap={2} mt={4}>
        {tokenOnlyFlow && (
          <>
            <TextField
              id="email"
              name="email"
              type="email"
              label="E-mail"
              value={form.email}
              onChange={handleChange}
              variant="filled"
              autoComplete="email"
              disabled={submitting || Boolean(emailFromQuery)}
              error={Boolean(fieldErrors.email)}
              helperText={fieldErrors.email}
              fullWidth
              required
            />
            <TextField
              id="name"
              name="name"
              label="Nome completo"
              value={form.name}
              onChange={handleChange}
              variant="filled"
              autoComplete="name"
              disabled={submitting}
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name ?? 'Obrigatório se esta é sua primeira vez na plataforma.'}
              fullWidth
            />
            <TextField
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              label="Senha"
              value={form.password}
              onChange={handleChange}
              variant="filled"
              autoComplete="new-password"
              disabled={submitting}
              error={Boolean(fieldErrors.password)}
              helperText={fieldErrors.password}
              fullWidth
              required
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end" sx={{ opacity: form.password ? 1 : 0 }}>
                      <IconButton
                        aria-label="mostrar senha"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        <IconifyIcon icon={showPassword ? 'ion:eye' : 'ion:eye-off'} />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </>
        )}
        {bannerError && <ErrorBanner message={bannerError} />}
        <Button
          type="submit"
          variant="contained"
          size="medium"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          fullWidth
        >
          {submitting ? 'Processando...' : membershipOnlyFlow ? 'Ativar acesso' : 'Concluir convite'}
        </Button>
        {!membershipOnlyFlow && (
          <Typography variant="body2" align="center" color="text.secondary">
            Problemas com o convite?{' '}
            <Link component={RouterLink} to={paths.signin}>
              Entre em contato pelo login
            </Link>{' '}
            ou fale com a escola.
          </Typography>
        )}
      </Stack>
    </>
  );
};

export default InviteAccept;
