import { ChangeEvent, FormEvent, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { ErrorBanner } from 'design-system';
import { createTeacher, updateTeacher } from 'services/academicsApi';
import { ApiError } from 'services/api';
import { Teacher, TeacherPayload } from 'types/academics';
import { formatCpf, isValidCpf, normalizeCpf } from 'utils/documentNumber';

export interface TeacherFormDialogProps {
  open: boolean;
  schoolId: number;
  teacher?: Teacher | null;
  onClose: () => void;
  onSaved: (teacher: Teacher) => void;
}

type FormField = 'name' | 'cpf' | 'email' | 'phone';

type FormState = Record<FormField, string>;

type FieldErrors = Partial<Record<FormField, string>>;

const emptyForm: FormState = { name: '', cpf: '', email: '', phone: '' };

const toFormState = (teacher?: Teacher | null): FormState =>
  teacher
    ? {
        name: teacher.name ?? '',
        cpf: formatCpf(teacher.cpf),
        email: teacher.email ?? '',
        phone: teacher.phone ?? '',
      }
    : emptyForm;

const toPayload = (form: FormState): TeacherPayload => ({
  name: form.name.trim(),
  cpf: normalizeCpf(form.cpf),
  email: form.email.trim(),
  phone: form.phone.trim() || null,
});

const toFieldErrors = (details: Record<string, unknown>): FieldErrors =>
  Object.entries(details).reduce<FieldErrors>((acc, [key, value]) => {
    if (key in emptyForm && Array.isArray(value) && typeof value[0] === 'string') {
      acc[key as FormField] = value[0];
    }
    return acc;
  }, {});

const validate = (form: FormState): FieldErrors => {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Informe o nome do professor.';
  }

  if (!normalizeCpf(form.cpf)) {
    errors.cpf = 'Informe o CPF.';
  } else if (!isValidCpf(form.cpf)) {
    errors.cpf = 'CPF inválido — confira os dígitos.';
  }

  if (!form.email.trim()) {
    errors.email = 'Informe o e-mail.';
  }

  return errors;
};

const TeacherFormDialog = ({
  open,
  schoolId,
  teacher,
  onClose,
  onSaved,
}: TeacherFormDialogProps) => {
  // Seeded once per mount; the caller remounts on open (see the `key` at the call site).
  const [form, setForm] = useState<FormState>(() => toFormState(teacher));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as FormField;

    setForm((current) => ({ ...current, [field]: field === 'cpf' ? formatCpf(value) : value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const localErrors = validate(form);
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = toPayload(form);
      const saved = teacher
        ? await updateTeacher(schoolId, teacher.id, payload)
        : await createTeacher(schoolId, payload);

      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = toFieldErrors(err.details);
        setFieldErrors(fields);
        if (Object.keys(fields).length === 0) {
          setError(err.message);
        }
      } else {
        setError('Não foi possível salvar. Verifique sua conexão e tente novamente.');
      }
      setSubmitting(false);
    }
  };

  const fieldProps = (field: FormField) => ({
    id: `teacher-${field}`,
    name: field,
    value: form[field],
    onChange: handleChange,
    error: Boolean(fieldErrors[field]),
    helperText: fieldErrors[field],
    disabled: submitting,
    variant: 'filled' as const,
    fullWidth: true,
  });

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{teacher ? 'Editar professor' : 'Novo professor'}</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
        <DialogContent>
          <Grid container spacing={2.5} pt={0.5}>
            <Grid size={12}>
              <TextField {...fieldProps('name')} label="Nome completo" autoFocus required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...fieldProps('cpf')}
                label="CPF"
                required
                inputMode="numeric"
                placeholder="000.000.000-00"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField {...fieldProps('email')} label="E-mail" type="email" required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField {...fieldProps('phone')} label="Telefone" />
            </Grid>
            {error && (
              <Grid size={12}>
                <ErrorBanner message={error} />
              </Grid>
            )}
          </Grid>
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

export default TeacherFormDialog;
