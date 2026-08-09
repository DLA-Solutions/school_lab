import { ChangeEvent, FormEvent, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { ErrorBanner } from 'design-system';
import { ApiError } from 'services/api';
import { createGuardian, updateGuardian } from 'services/guardiansApi';
import { Guardian, GuardianPayload } from 'types/guardian';

export interface GuardianFormDialogProps {
  open: boolean;
  schoolId: number;
  /** Absent for a new guardian; present to edit an existing one. */
  guardian?: Guardian | null;
  onClose: () => void;
  onSaved: (guardian: Guardian) => void;
}

type FormState = { name: string; cpf: string; email: string; phone: string };

const emptyForm: FormState = { name: '', cpf: '', email: '', phone: '' };

const toFormState = (guardian?: Guardian | null): FormState =>
  guardian
    ? {
        name: guardian.name ?? '',
        cpf: guardian.cpf ?? '',
        email: guardian.email ?? '',
        phone: guardian.phone ?? '',
      }
    : emptyForm;

// The API stores optional fields as NULL rather than "", so an emptied field is sent as null
// instead of a blank string — otherwise editing a guardian to clear the CPF would leave "".
const toPayload = (form: FormState): GuardianPayload => ({
  name: form.name.trim(),
  cpf: form.cpf.trim() || null,
  email: form.email.trim() || null,
  phone: form.phone.trim() || null,
});

/**
 * `validation_error` responses carry `details` as ActiveModel's `errors.to_hash`, i.e.
 * `{ name: ["can't be blank"] }`. Anything not shaped like that is left to the banner.
 */
const toFieldErrors = (details: Record<string, unknown>): Partial<Record<keyof FormState, string>> =>
  Object.entries(details).reduce<Partial<Record<keyof FormState, string>>>((acc, [key, value]) => {
    if (key in emptyForm && Array.isArray(value) && typeof value[0] === 'string') {
      acc[key as keyof FormState] = value[0];
    }
    return acc;
  }, {});

const GuardianFormDialog = ({
  open,
  schoolId,
  guardian,
  onClose,
  onSaved,
}: GuardianFormDialogProps) => {
  // Seeded once per mount. The caller remounts the dialog on open (see the `key` at the call
  // site), which is what resets the form — so a cancelled edit never leaks into the next one.
  const [form, setForm] = useState<FormState>(() => toFormState(guardian));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(guardian);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setFieldErrors({ name: 'Informe o nome do responsável.' });
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = toPayload(form);
      const saved = guardian
        ? await updateGuardian(schoolId, guardian.id, payload)
        : await createGuardian(schoolId, payload);

      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = toFieldErrors(err.details);
        setFieldErrors(fields);
        // A validation error already shows itself under each field; the banner is for the rest
        // (403 from a non-staff membership, 404 on a stale record, network failures).
        if (Object.keys(fields).length === 0) {
          setError(err.message);
        }
      } else {
        setError('Não foi possível salvar. Verifique sua conexão e tente novamente.');
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar responsável' : 'Novo responsável'}</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit} direction="column">
        <DialogContent>
          <Stack direction="column" gap={2.5} pt={0.5}>
            <TextField
              id="guardian-name"
              name="name"
              label="Nome completo"
              value={form.name}
              onChange={handleChange}
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name}
              disabled={submitting}
              variant="filled"
              fullWidth
              autoFocus
              required
            />
            <TextField
              id="guardian-cpf"
              name="cpf"
              label="CPF"
              value={form.cpf}
              onChange={handleChange}
              error={Boolean(fieldErrors.cpf)}
              helperText={fieldErrors.cpf}
              disabled={submitting}
              variant="filled"
              fullWidth
            />
            <TextField
              id="guardian-email"
              name="email"
              type="email"
              label="E-mail"
              value={form.email}
              onChange={handleChange}
              error={Boolean(fieldErrors.email)}
              helperText={fieldErrors.email}
              disabled={submitting}
              variant="filled"
              fullWidth
            />
            <TextField
              id="guardian-phone"
              name="phone"
              label="Telefone"
              value={form.phone}
              onChange={handleChange}
              error={Boolean(fieldErrors.phone)}
              helperText={fieldErrors.phone}
              disabled={submitting}
              variant="filled"
              fullWidth
            />
            {error && <ErrorBanner message={error} />}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
};

export default GuardianFormDialog;
