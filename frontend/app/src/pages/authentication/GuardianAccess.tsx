import { FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner, SuccessBanner } from 'design-system';
import { requestGuardianAccess } from 'services/authApi';
import paths from 'routes/paths';
import { formatCpf, isValidCpf, normalizeCpf } from 'utils/documentNumber';

/**
 * Where a guardian asks for their own way into the system, using the CPF the school registered
 * them under.
 *
 * The confirmation is deliberately the same whatever the CPF turns out to be. Saying "this CPF is
 * not registered" would let anyone walk a list of CPFs and learn which children attend the school,
 * so the answer never varies and whatever is to be done happens in the inbox already on file.
 */
const GuardianAccess = () => {
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // The only thing checked here is that the document is well formed. Whether it belongs to
    // anybody is the server's business, and the server does not say.
    if (!isValidCpf(cpf)) {
      setError('Informe um CPF válido.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await requestGuardianAccess(normalizeCpf(cpf));
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
            'Se este CPF estiver cadastrado em uma escola, enviamos o link de acesso para o ' +
            'e-mail registrado. O link vale por 7 dias.'
          }
        />
        <Typography variant="body2" color="text.secondary">
          Não recebeu? Confira a caixa de spam, ou fale com a secretaria da escola para confirmar
          qual e-mail está no seu cadastro.
        </Typography>
        <Link component={RouterLink} to={paths.signin} variant="body2">
          Voltar para o login
        </Link>
      </Stack>
    );
  }

  return (
    <Stack component="form" onSubmit={handleSubmit} direction="column" gap={3} noValidate>
      <Stack direction="column" gap={1}>
        <Typography variant="h5">Primeiro acesso</Typography>
        <Typography variant="body2" color="text.secondary">
          Informe o CPF que você deu à escola. Enviaremos ao seu e-mail um link para criar sua
          senha.
        </Typography>
      </Stack>

      {error && <ErrorBanner message={error} />}

      <TextField
        id="access-cpf"
        name="cpf"
        label="CPF"
        placeholder="000.000.000-00"
        value={cpf}
        onChange={(e) => {
          setCpf(formatCpf(e.target.value));
          setError('');
        }}
        disabled={submitting}
        variant="filled"
        inputMode="numeric"
        fullWidth
        autoFocus
      />

      <Button
        type="submit"
        variant="contained"
        disabled={submitting}
        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
      >
        {submitting ? 'Enviando...' : 'Enviar link de acesso'}
      </Button>

      <Link component={RouterLink} to={paths.signin} variant="body2">
        Já tenho uma senha
      </Link>
    </Stack>
  );
};

export default GuardianAccess;
