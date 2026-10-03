import { FormEvent, useEffect, useMemo, useState } from 'react';
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
import { listLessonPlans, upsertLessonPlan } from 'services/lessonPlansApi';
import { Subject } from 'types/academics';
import { LessonPlan } from 'types/lessonPlans';

export interface LessonPlanFormDialogProps {
  open: boolean;
  schoolId: number;
  schoolClassId: number;
  /** ISO `YYYY-MM-DD` — the instructional day the teacher clicked on the calendar. */
  date: string;
  /** The requesting teacher's own subjects in this class (BR-LP02) — empty means none assigned. */
  subjects: Subject[];
  onClose: () => void;
  onSaved: () => void;
}

type FormField = 'subject_id' | 'content';

/**
 * UC-LP02: subject + content for one class/day, upserted by `(school_class_id, subject_id,
 * date)` (BR-LP04) — sending it again for a pair already planned updates that plan rather than
 * creating a second one, so picking a subject that already has a plan loads what was written.
 */
const LessonPlanFormDialog = ({
  open,
  schoolId,
  schoolClassId,
  date,
  subjects,
  onClose,
  onSaved,
}: LessonPlanFormDialogProps) => {
  const { t, locale } = useTranslation();

  const [subjectId, setSubjectId] = useState('');
  const [content, setContent] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [existingPlans, setExistingPlans] = useState<LessonPlan[]>([]);
  const [existingError, setExistingError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setSubjectId('');
    setContent('');
    setFieldErrors({});
    setError('');
    setExistingError('');

    const loadExisting = async () => {
      try {
        const response = await listLessonPlans(schoolId, {
          school_class_id: schoolClassId,
          from: date,
          to: date,
        });
        setExistingPlans(response.data);
      } catch (err) {
        // Only the prefill is lost here, not the ability to write a new plan — so this is a
        // quiet warning, not a blocking error.
        setExistingPlans([]);
        setExistingError(
          err instanceof ApiError ? err.message : t('lessonPlans.dialog.existingLoadError'),
        );
      }
    };

    loadExisting();
  }, [open, schoolId, schoolClassId, date, t]);

  const handleSubjectChange = (value: string) => {
    setSubjectId(value);
    setFieldErrors((current) => ({ ...current, subject_id: undefined }));
    setError('');

    const existing = existingPlans.find((plan) => String(plan.subject_id) === value);
    setContent(existing?.content ?? '');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors: Partial<Record<FormField, string>> = {};
    if (!subjectId) errors.subject_id = t('lessonPlans.dialog.subjectRequired');
    if (!content.trim()) errors.content = t('lessonPlans.dialog.contentRequired');

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setError('');

    try {
      await upsertLessonPlan(schoolId, {
        school_class_id: schoolClassId,
        subject_id: Number(subjectId),
        date,
        content: content.trim(),
      });
      onSaved();
    } catch (err) {
      // Covers BR-LP03 (422 non_instructional_day) and BR-LP02 (403) alike — the API's own
      // message already names which one happened.
      setError(err instanceof ApiError ? err.message : t('lessonPlans.dialog.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = useMemo(() => {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString(locale === 'en-US' ? 'en-US' : 'pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [date, locale]);

  const noSubjects = subjects.length === 0;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('lessonPlans.dialog.title', { date: formattedDate })}</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
        <DialogContent>
          <Grid container spacing={2.5} pt={0.5}>
            {noSubjects ? (
              <Grid size={12}>
                <ErrorBanner message={t('lessonPlans.dialog.noSubjects')} />
              </Grid>
            ) : (
              <>
                <Grid size={12}>
                  <TextField
                    id="lesson-plan-subject"
                    select
                    fullWidth
                    required
                    variant="filled"
                    label={t('lessonPlans.dialog.subjectLabel')}
                    value={subjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    disabled={saving}
                    error={Boolean(fieldErrors.subject_id)}
                    helperText={fieldErrors.subject_id}
                  >
                    {subjects.map((subject) => (
                      <MenuItem key={subject.id} value={String(subject.id)}>
                        {subject.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={12}>
                  <TextField
                    id="lesson-plan-content"
                    label={t('lessonPlans.dialog.contentLabel')}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      setFieldErrors((current) => ({ ...current, content: undefined }));
                    }}
                    disabled={saving}
                    error={Boolean(fieldErrors.content)}
                    helperText={fieldErrors.content}
                    variant="filled"
                    fullWidth
                    required
                    multiline
                    minRows={4}
                  />
                </Grid>
              </>
            )}
            {existingError && (
              <Grid size={12}>
                <ErrorBanner message={existingError} />
              </Grid>
            )}
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
            disabled={saving || noSubjects}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
};

export default LessonPlanFormDialog;
