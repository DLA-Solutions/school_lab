import { ChangeEvent, FormEvent, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner } from 'design-system';
import { ApiError } from 'services/api';
import { createGuardian, updateGuardian } from 'services/guardiansApi';
import { Guardian, GuardianPayload } from 'types/guardian';
import {
  BRAZILIAN_STATES,
  formatCpf,
  formatZipCode,
  isValidCpf,
  normalizeCpf,
  normalizeZipCode,
} from 'utils/documentNumber';

export interface GuardianFormDialogProps {
  open: boolean;
  schoolId: number;
  /** Absent for a new guardian; present to edit an existing one. */
  guardian?: Guardian | null;
  onClose: () => void;
  onSaved: (guardian: Guardian) => void;
}

type FormField =
  | 'name'
  | 'cpf'
  | 'email'
  | 'phone'
  | 'zip_code'
  | 'street'
  | 'number'
  | 'complement'
  | 'neighborhood'
  | 'city'
  | 'state';

type FormState = Record<FormField, string>;

type FieldErrors = Partial<Record<FormField, string>>;

const emptyForm: FormState = {
  name: '',
  cpf: '',
  email: '',
  phone: '',
  zip_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

// The API requires the address in full. `complement` stays optional — plenty of addresses have
// no apartment or block.
const REQUIRED_ADDRESS_FIELDS: FormField[] = [
  'zip_code',
  'street',
  'number',
  'neighborhood',
  'city',
  'state',
];

const toFormState = (guardian?: Guardian | null): FormState =>
  guardian
    ? {
        name: guardian.name ?? '',
        // Stored as bare digits; shown masked.
        cpf: formatCpf(guardian.cpf),
        email: guardian.email ?? '',
        phone: guardian.phone ?? '',
        zip_code: formatZipCode(guardian.zip_code),
        street: guardian.street ?? '',
        number: guardian.number ?? '',
        complement: guardian.complement ?? '',
        neighborhood: guardian.neighborhood ?? '',
        city: guardian.city ?? '',
        state: guardian.state ?? '',
      }
    : emptyForm;

const toPayload = (form: FormState): GuardianPayload => ({
  name: form.name.trim(),
  cpf: normalizeCpf(form.cpf),
  email: form.email.trim(),
  phone: form.phone.trim(),
  zip_code: normalizeZipCode(form.zip_code) || null,
  street: form.street.trim() || null,
  number: form.number.trim() || null,
  complement: form.complement.trim() || null,
  neighborhood: form.neighborhood.trim() || null,
  city: form.city.trim() || null,
  state: form.state.trim().toUpperCase() || null,
});

/**
 * `validation_error` responses carry `details` as ActiveModel's `errors.to_hash`, i.e.
 * `{ cpf: ["já cadastrado para outro responsável nesta escola"] }`.
 */
const toFieldErrors = (details: Record<string, unknown>): FieldErrors =>
  Object.entries(details).reduce<FieldErrors>((acc, [key, value]) => {
    if (key in emptyForm && Array.isArray(value) && typeof value[0] === 'string') {
      acc[key as FormField] = value[0];
    }
    return acc;
  }, {});

/**
 * Catches what the API would reject anyway, before the round trip. The API stays the authority:
 * CPF uniqueness is only knowable there, and its answer is merged into the same field errors.
 */
const validate = (form: FormState): FieldErrors => {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Informe o nome do responsável.';
  }

  if (!normalizeCpf(form.cpf)) {
    errors.cpf = 'Informe o CPF.';
  } else if (!isValidCpf(form.cpf)) {
    errors.cpf = 'CPF inválido — confira os dígitos.';
  }

  if (!form.email.trim()) {
    errors.email = 'Informe o e-mail.';
  }

  if (!form.phone.trim()) {
    errors.phone = 'Informe o telefone.';
  }

  REQUIRED_ADDRESS_FIELDS.filter((field) => !form[field].trim()).forEach((field) => {
    errors[field] = 'Campo obrigatório.';
  });

  const zip = normalizeZipCode(form.zip_code);
  if (zip && zip.length !== 8) {
    errors.zip_code = 'O CEP deve ter 8 dígitos.';
  }

  return errors;
};

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(guardian);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as FormField;

    // The masked fields reformat as they are typed; everything else is stored verbatim.
    const nextValue =
      field === 'cpf' ? formatCpf(value) : field === 'zip_code' ? formatZipCode(value) : value;

    setForm((current) => ({ ...current, [field]: nextValue }));
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

  const fieldProps = (field: FormField) => ({
    id: `guardian-${field}`,
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
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Editar responsável' : 'Novo responsável'}</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
        <DialogContent>
          <Grid container spacing={2.5} pt={0.5}>
            <Grid size={12}>
              <TextField {...fieldProps('name')} label="Nome completo" autoFocus required />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                {...fieldProps('cpf')}
                label="CPF"
                required
                inputMode="numeric"
                placeholder="000.000.000-00"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField {...fieldProps('email')} label="E-mail" type="email" required />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField {...fieldProps('phone')} label="Telefone" required />
            </Grid>

            <Grid size={12}>
              <Divider sx={{ mt: 1 }} />
              <Typography variant="body2" color="text.secondary" mt={2}>
                Endereço
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                {...fieldProps('zip_code')}
                label="CEP"
                inputMode="numeric"
                placeholder="00000-000"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField {...fieldProps('street')} label="Logradouro" required />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <TextField {...fieldProps('number')} label="Número" required />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField {...fieldProps('complement')} label="Complemento" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField {...fieldProps('neighborhood')} label="Bairro" required />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <TextField {...fieldProps('city')} label="Cidade" required />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <TextField {...fieldProps('state')} label="UF" select required>
                {BRAZILIAN_STATES.map((uf) => (
                  <MenuItem key={uf} value={uf}>
                    {uf}
                  </MenuItem>
                ))}
              </TextField>
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

export default GuardianFormDialog;
