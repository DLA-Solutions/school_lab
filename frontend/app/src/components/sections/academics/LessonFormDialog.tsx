import { FormEvent, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { ErrorBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { assignTeaching, listTeachers } from 'services/academicsApi';
import { SchoolClass, Subject, Teacher } from 'types/academics';
import { schoolClassLabel } from 'utils/schoolClassLabel';

export interface LessonFormDialogProps {
  open: boolean;
  schoolId: number;
  classes: SchoolClass[];
  subjects: Subject[];
  onClose: () => void;
  onSaved: () => void;
}

type FormField = 'teacher_id' | 'school_class_id' | 'subject_id';

/**
 * One lesson: who teaches what, to which cohort. All three are required — the API keys the
 * assignment on the three together, and any two of them name nothing in particular.
 */
const LessonFormDialog = ({
  open,
  schoolId,
  classes,
  subjects,
  onClose,
  onSaved,
}: LessonFormDialogProps) => {
  const { t } = useTranslation();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState<Record<FormField, string>>({
    teacher_id: '',
    school_class_id: '',
    subject_id: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const response = await listTeachers({ schoolId });
        setTeachers(response.data);
      } catch {
        setTeachers([]);
      }
    };

    loadTeachers();
  }, [schoolId]);

  const handleChange = (field: FormField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors: Partial<Record<FormField, string>> = {};
    if (!form.teacher_id) errors.teacher_id = t('lessons.teacherRequired');
    if (!form.school_class_id) errors.school_class_id = t('lessons.classRequired');
    if (!form.subject_id) errors.subject_id = t('lessons.subjectRequired');

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setError('');

    try {
      await assignTeaching(schoolId, Number(form.teacher_id), {
        schoolClassId: Number(form.school_class_id),
        subjectId: Number(form.subject_id),
      });
      onSaved();
    } catch (err) {
      // The API refuses the same teacher, subject and cohort twice; that message names the clash.
      setError(err instanceof ApiError ? err.message : t('common.saveConnectionError'));
    } finally {
      setSaving(false);
    }
  };

  const field = (name: FormField, label: string) => ({
    id: `lesson-${name}`,
    label,
    value: form[name],
    onChange: (e: { target: { value: string } }) => handleChange(name, e.target.value),
    error: Boolean(fieldErrors[name]),
    helperText: fieldErrors[name],
    disabled: saving,
    variant: 'filled' as const,
    fullWidth: true,
    required: true,
    select: true,
  });

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('lessons.new')}</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
        <DialogContent>
          <Grid container spacing={2.5} pt={0.5}>
            <Grid size={12}>
              <TextField {...field('teacher_id', t('lessons.teacher'))}>
                {teachers.map((teacher) => (
                  <MenuItem key={teacher.id} value={String(teacher.id)}>
                    {teacher.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              {/* Named in full: the letter alone repeats in every grade and both shifts. */}
              <TextField {...field('school_class_id', t('common.class'))}>
                {classes.map((schoolClass) => (
                  <MenuItem key={schoolClass.id} value={String(schoolClass.id)}>
                    {schoolClassLabel(schoolClass, t)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField {...field('subject_id', t('common.subject'))}>
                {subjects.map((subject) => (
                  <MenuItem key={subject.id} value={String(subject.id)}>
                    {subject.name}
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
          <Button onClick={onClose} color="inherit" disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
};

export default LessonFormDialog;
