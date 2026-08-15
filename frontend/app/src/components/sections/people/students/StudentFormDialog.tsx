import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
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
import { useTranslation } from 'providers/I18nContext';
import { listSchoolClasses } from 'services/academicsApi';
import { ApiError } from 'services/api';
import { createStudent, updateStudent } from 'services/studentsApi';
import { SchoolClass } from 'types/academics';
import { Student, StudentPayload } from 'types/student';
import { formatCpf, isValidCpf, normalizeCpf } from 'utils/documentNumber';
import { schoolClassLabel } from 'utils/schoolClassLabel';

export interface StudentFormDialogProps {
  open: boolean;
  schoolId: number;
  /** Absent for a new student; present to edit an existing one. */
  student?: Student | null;
  onClose: () => void;
  onSaved: (student: Student) => void;
}

type FormField =
  | 'name'
  | 'cpf'
  | 'rg'
  | 'birth_date'
  | 'school_class_id'
  | 'father_cpf'
  | 'mother_cpf';

type FormState = Record<FormField, string>;

type FieldErrors = Partial<Record<FormField, string>>;

const emptyForm: FormState = {
  name: '',
  cpf: '',
  rg: '',
  birth_date: '',
  school_class_id: '',
  father_cpf: '',
  mother_cpf: '',
};

/** The three CPF fields all mask as they are typed. */
const CPF_FIELDS: FormField[] = ['cpf', 'father_cpf', 'mother_cpf'];

const toFormState = (student?: Student | null): FormState =>
  student
    ? {
        name: student.name ?? '',
        // Stored as bare digits; shown masked.
        cpf: formatCpf(student.cpf),
        rg: student.rg ?? '',
        birth_date: student.birth_date ?? '',
        school_class_id: student.school_class_id ? String(student.school_class_id) : '',
        father_cpf: formatCpf(
          student.guardians?.find((link) => link.relationship === 'father')?.cpf,
        ),
        mother_cpf: formatCpf(
          student.guardians?.find((link) => link.relationship === 'mother')?.cpf,
        ),
      }
    : emptyForm;

const toPayload = (form: FormState): StudentPayload => ({
  name: form.name.trim(),
  cpf: normalizeCpf(form.cpf),
  rg: form.rg.trim(),
  birth_date: form.birth_date,
  school_class_id: Number(form.school_class_id),
  // An empty parent field is sent as null: the API takes one or both, never neither.
  father_cpf: normalizeCpf(form.father_cpf) || null,
  mother_cpf: normalizeCpf(form.mother_cpf) || null,
});

/** `validation_error` responses carry `details` as ActiveModel's `errors.to_hash`. */
const toFieldErrors = (details: Record<string, unknown>): FieldErrors =>
  Object.entries(details).reduce<FieldErrors>((acc, [key, value]) => {
    if (key in emptyForm && Array.isArray(value) && typeof value[0] === 'string') {
      acc[key as FormField] = value[0];
    }
    return acc;
  }, {});

/** Catches what the API would reject anyway. CPF uniqueness is only knowable server-side. */
const validate = (form: FormState): FieldErrors => {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Informe o nome do estudante.';
  }

  if (!normalizeCpf(form.cpf)) {
    errors.cpf = 'Informe o CPF.';
  } else if (!isValidCpf(form.cpf)) {
    errors.cpf = 'CPF inválido — confira os dígitos.';
  }

  // RG is optional — see the matching note on the Student model.

  if (!form.birth_date) {
    errors.birth_date = 'Informe a data de nascimento.';
  } else if (form.birth_date >= new Date().toISOString().slice(0, 10)) {
    // ISO dates compare correctly as strings, which avoids a timezone round trip here.
    errors.birth_date = 'A data de nascimento deve estar no passado.';
  }

  if (!form.school_class_id) {
    errors.school_class_id = 'Selecione a turma.';
  }

  // At least one parent, and each CPF given must be a real document.
  const father = normalizeCpf(form.father_cpf);
  const mother = normalizeCpf(form.mother_cpf);

  if (!father && !mother) {
    errors.father_cpf = 'Informe o CPF do pai ou da mãe.';
    errors.mother_cpf = 'Informe o CPF do pai ou da mãe.';
  }

  if (father && !isValidCpf(father)) {
    errors.father_cpf = 'CPF inválido — confira os dígitos.';
  }

  if (mother && !isValidCpf(mother)) {
    errors.mother_cpf = 'CPF inválido — confira os dígitos.';
  }

  if (father && mother && father === mother) {
    errors.mother_cpf = 'O mesmo CPF já foi informado para o pai.';
  }

  return errors;
};

const StudentFormDialog = ({
  open,
  schoolId,
  student,
  onClose,
  onSaved,
}: StudentFormDialogProps) => {
  // Only the cohort labels are translated here — the rest of this dialog is pt-BR copy.
  const { t } = useTranslation();
  // Seeded once per mount; the caller remounts on open (see the `key` at the call site).
  const [form, setForm] = useState<FormState>(() => toFormState(student));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const isEdit = Boolean(student);

  // The cohorts drive the "Turma" select; they do not change while the dialog is open.
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await listSchoolClasses(schoolId);
        setClasses(response.data);
      } catch {
        // An empty select is signal enough here, and saving would surface anything worse.
        setClasses([]);
      }
    };

    loadClasses();
  }, [schoolId]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as FormField;

    setForm((current) => ({
      ...current,
      [field]: CPF_FIELDS.includes(field) ? formatCpf(value) : value,
    }));
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
      const saved = student
        ? await updateStudent(schoolId, student.id, payload)
        : await createStudent(schoolId, payload);

      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = toFieldErrors(err.details);
        setFieldErrors(fields);

        // `base` carries the rules that belong to no single field ("inform one parent", "the
        // same CPF twice"); those go to the banner.
        const baseErrors = err.details.base;
        if (Array.isArray(baseErrors) && typeof baseErrors[0] === 'string') {
          setError(baseErrors[0]);
        } else if (Object.keys(fields).length === 0) {
          setError(err.message);
        }
      } else {
        setError('Não foi possível salvar. Verifique sua conexão e tente novamente.');
      }
      setSubmitting(false);
    }
  };

  const fieldProps = (field: FormField) => ({
    id: `student-${field}`,
    name: field,
    value: form[field],
    onChange: handleChange,
    error: Boolean(fieldErrors[field]),
    helperText: fieldErrors[field],
    disabled: submitting,
    variant: 'filled' as const,
    fullWidth: true,
    required: true,
  });

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Editar estudante' : 'Novo estudante'}</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
        <DialogContent>
          <Grid container spacing={2.5} pt={0.5}>
            <Grid size={12}>
              <TextField {...fieldProps('name')} label="Nome completo" autoFocus />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...fieldProps('cpf')}
                label="CPF"
                inputMode="numeric"
                placeholder="000.000.000-00"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField {...fieldProps('rg')} label="RG (opcional)" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...fieldProps('birth_date')}
                label="Data de nascimento"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {/* A cohort, not a bare grade: the grade, letter, shift and year come with it —
                  the shift because the same letter is used in the morning and the afternoon. */}
              <TextField {...fieldProps('school_class_id')} label="Turma" select>
                {classes.map((schoolClass) => (
                  <MenuItem key={schoolClass.id} value={String(schoolClass.id)}>
                    {schoolClassLabel(schoolClass, t)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={12}>
              <Divider sx={{ mt: 1 }} />
              <Typography variant="body2" color="text.secondary" mt={2}>
                Responsáveis — informe o CPF de pelo menos um. Ele já deve estar cadastrado em
                Responsáveis.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...fieldProps('father_cpf')}
                label="CPF do pai"
                required={false}
                inputMode="numeric"
                placeholder="000.000.000-00"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...fieldProps('mother_cpf')}
                label="CPF da mãe"
                required={false}
                inputMode="numeric"
                placeholder="000.000.000-00"
              />
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

export default StudentFormDialog;
