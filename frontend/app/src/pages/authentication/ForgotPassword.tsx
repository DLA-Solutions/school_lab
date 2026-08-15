import { FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner, SuccessBanner } from 'design-system';
import { requestPasswordReset } from 'services/authApi';
import paths from 'routes/paths';

/**
 * "I forgot my password", for anybody with an account — a guardian, a teacher, the secretary.
 *
 * Like the CPF screen, the confirmation does not vary: an address that is registered and one that
 * is not produce the same message, so this cannot be used to find out who has an account here.
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setError('Informe seu e-mail.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      setError('Não foi possível concluir. Verifique sua conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <Stack direction="column" gap={3}>
        <Typography variant="h5">Verifique seu e-mail</Typography>
        <SuccessBanner
          message={
            'Se este e-mail estiver cadastrado, enviamos um link para você criar uma nova senha. ' +
            'O link vale por 6 horas e só pode ser usado uma vez.'
          }
        />
        <Link component={RouterLink} to={paths.signin} variant="body2">
          Voltar para o login
        </Link>
      </Stack>
    );
  }

  return (
    <Stack component="form" onSubmit={handleSubmit} direction="column" gap={3} noValidate>
      <Stack direction="column" gap={1}>
        <Typography variant="h5">Esqueci minha senha</Typography>
        <Typography variant="body2" color="text.secondary">
          Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
        </Typography>
      </Stack>

      {error && <ErrorBanner message={error} />}

      <TextField
        id="forgot-email"
        name="email"
        label="E-mail"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError('');
        }}
        disabled={submitting}
        variant="filled"
        fullWidth
        autoFocus
        autoComplete="email"
      />

      <Button
        type="submit"
        variant="contained"
        disabled={submitting}
        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
      >
        {submitting ? 'Enviando...' : 'Enviar link'}
      </Button>

      <Link component={RouterLink} to={paths.signin} variant="body2">
        Voltar para o login
      </Link>
    </Stack>
  );
};

export default ForgotPassword;
