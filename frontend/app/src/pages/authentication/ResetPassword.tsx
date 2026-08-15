import { FormEvent, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ErrorBanner, SuccessBanner } from 'design-system';
import PasswordStrengthField from 'components/sections/authentication/PasswordStrengthField';
import { isStrongPassword } from 'utils/passwordStrength';
import { ApiError } from 'services/api';
import { resetPassword } from 'services/authApi';
import paths from 'routes/paths';

/**
 * Where the link from the reset e-mail lands: the token is exchanged for a new password.
 *
 * The token is the only credential anybody has here — whoever is on this screen cannot sign in,
 * which is the whole point — so it is single-use and expires. An expired or spent one is refused
 * with the same message as one that never existed.
 */
const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isStrongPassword(password)) {
      setFieldError('A senha ainda não atende a todos os requisitos abaixo.');
      return;
    }

    if (password !== confirmation) {
      setFieldError('As senhas não conferem.');
      return;
    }

    setFieldError('');
    setError('');
    setSubmitting(true);

    try {
      await resetPassword({
        token,
        password,
        password_confirmation: confirmation,
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details.password;
        // The API reports the policy rule by rule; show them rather than one flat verdict.
        setError(
          Array.isArray(details) && typeof details[0] === 'string'
            ? `A senha ${details.join(', ')}.`
            : err.message,
        );
      } else {
        setError('Não foi possível concluir. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Stack direction="column" gap={3}>
        <Typography variant="h5">Link inválido</Typography>
        <ErrorBanner message="Este endereço não traz um token de redefinição. Peça um novo link." />
        <Link component={RouterLink} to={paths.forgotPassword} variant="body2">
          Pedir um novo link
        </Link>
      </Stack>
    );
  }

  if (done) {
    return (
      <Stack direction="column" gap={3}>
        <Typography variant="h5">Senha criada</Typography>
        <SuccessBanner message="Sua senha foi definida. Você já pode entrar com ela." />
        <Button variant="contained" onClick={() => navigate(paths.signin)}>
          Ir para o login
        </Button>
      </Stack>
    );
  }

  return (
    <Stack component="form" onSubmit={handleSubmit} direction="column" gap={3} noValidate>
      <Stack direction="column" gap={1}>
        <Typography variant="h5">Crie sua senha</Typography>
        <Typography variant="body2" color="text.secondary">
          Escolha uma senha que você não use em outro lugar.
        </Typography>
      </Stack>

      {error && <ErrorBanner message={error} />}

      <PasswordStrengthField
        id="reset-password"
        label="Nova senha"
        value={password}
        onChange={(value) => {
          setPassword(value);
          setFieldError('');
          setError('');
        }}
        disabled={submitting}
        error={fieldError}
      />

      <PasswordStrengthField
        id="reset-password-confirmation"
        label="Repita a senha"
        value={confirmation}
        onChange={(value) => {
          setConfirmation(value);
          setFieldError('');
        }}
        disabled={submitting}
        showRules={false}
      />

      <Button
        type="submit"
        variant="contained"
        disabled={submitting}
        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
      >
        {submitting ? 'Salvando...' : 'Salvar senha'}
      </Button>
    </Stack>
  );
};

export default ResetPassword;
