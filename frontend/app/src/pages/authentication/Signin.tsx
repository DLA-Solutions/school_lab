import { useState, ChangeEvent, FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import IconifyIcon from 'components/base/IconifyIcon';
import GoogleSignInButton from 'components/auth/GoogleSignInButton';
import { ErrorBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useAuth } from 'providers/AuthContext';
import { ApiError } from 'services/api';
import { applyPostLoginDestination, postLoginDestination } from 'utils/auth/postLogin';
import paths, { rootPaths } from 'routes/paths';

interface SigninLocationState {
  from?: string;
}

const SignIn = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const returnTo =
    params.get('return_to') ?? (location.state as SigninLocationState | null)?.from ?? rootPaths.root;

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    setError('');
  };

  const resolveAuthError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.code === 'access_denied') {
        return t('auth.signin.googleAccessDenied');
      }
      return err.message;
    }
    return t('auth.signin.connectionError');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!credentials.email || !credentials.password) {
      setError('Informe e-mail e senha para continuar.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const user = await login({ ...credentials, rememberMe });
      applyPostLoginDestination(postLoginDestination(user, returnTo), navigate);
    } catch (err) {
      setError(resolveAuthError(err));
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (idToken: string) => {
    setSubmitting(true);
    setError('');

    try {
      const user = await loginWithGoogle(idToken, rememberMe);
      applyPostLoginDestination(postLoginDestination(user, returnTo), navigate);
    } catch (err) {
      setError(resolveAuthError(err));
      setSubmitting(false);
    }
  };

  const showGoogleSignIn = Boolean(import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim());

  return (
    <>
      <Typography align="center" variant="h3" fontWeight={600}>
        Sign In
      </Typography>
      <Typography mt={1.5} align="center" variant="body2" color="text.secondary">
        Entre para acessar o dashboard
      </Typography>
      <Stack onSubmit={handleSubmit} component="form" direction="column" gap={2} mt={4}>
        <TextField
          id="email"
          name="email"
          type="email"
          value={credentials.email}
          onChange={handleInputChange}
          variant="filled"
          placeholder="Your Email"
          autoComplete="email"
          disabled={submitting}
          fullWidth
          autoFocus
          required
        />
        <TextField
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={credentials.password}
          onChange={handleInputChange}
          variant="filled"
          placeholder="Your Password"
          autoComplete="current-password"
          disabled={submitting}
          fullWidth
          required
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end" sx={{ opacity: credentials.password ? 1 : 0 }}>
                  <IconButton
                    aria-label="toggle password visibility"
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
        <Stack mt={-1.5} alignItems="center" justifyContent="space-between">
          <FormControlLabel
            control={
              <Checkbox
                id="remember_me"
                name="remember_me"
                color="primary"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={submitting}
              />
            }
            label="Remember me"
          />
        </Stack>
        {error && <ErrorBanner message={error} />}
        <Button
          type="submit"
          variant="contained"
          size="medium"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          fullWidth
        >
          {submitting ? 'Entrando...' : 'Submit'}
        </Button>

        {showGoogleSignIn && (
          <>
            <Divider>
              <Typography variant="body2" color="text.secondary">
                {t('auth.signin.orContinueWith')}
              </Typography>
            </Divider>
            <GoogleSignInButton onCredential={handleGoogleCredential} disabled={submitting} />
          </>
        )}

        {/* The two ways in for someone who cannot sign in: a family who has never set a password,
            and anybody who has forgotten theirs. */}
        <Stack direction="column" gap={0.75} alignItems="center">
          <Link component={RouterLink} to={paths.forgotPassword} variant="body2">
            Esqueci minha senha
          </Link>
          <Link component={RouterLink} to={paths.guardianAccess} variant="body2">
            Primeiro acesso de responsável
          </Link>
        </Stack>
      </Stack>
    </>
  );
};

export default SignIn;
