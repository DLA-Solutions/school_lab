import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { ErrorBanner } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import type { MessageKey } from 'locales';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { listLessonPlans, upsertLessonPlan } from 'services/lessonPlansApi';
import { Subject } from 'types/academics';
import {
  LessonPlan,
  LessonPlanAssessmentFormat,
  LessonPlanAssessmentType,
} from 'types/lessonPlans';
import LessonPlanPreviewDialog from './LessonPlanPreviewDialog';

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

/** BR-LP07 — free-text template fields, all optional. */
type TemplateTextField =
  | 'duration'
  | 'unit_stage'
  | 'topic'
  | 'general_objective'
  | 'specific_objectives'
  | 'bncc_competencies'
  | 'other_competencies'
  | 'resources_materials';

type TemplateFormState = Record<TemplateTextField, string> & {
  assessment_types: LessonPlanAssessmentType[];
  assessment_formats: LessonPlanAssessmentFormat[];
};

const emptyTemplate: TemplateFormState = {
  duration: '',
  unit_stage: '',
  topic: '',
  general_objective: '',
  specific_objectives: '',
  bncc_competencies: '',
  other_competencies: '',
  resources_materials: '',
  assessment_types: [],
  assessment_formats: [],
};

const toTemplateFormState = (plan: LessonPlan): TemplateFormState => ({
  duration: plan.duration ?? '',
  unit_stage: plan.unit_stage ?? '',
  topic: plan.topic ?? '',
  general_objective: plan.general_objective ?? '',
  specific_objectives: plan.specific_objectives ?? '',
  bncc_competencies: plan.bncc_competencies ?? '',
  other_competencies: plan.other_competencies ?? '',
  resources_materials: plan.resources_materials ?? '',
  assessment_types: plan.assessment_types ?? [],
  assessment_formats: plan.assessment_formats ?? [],
});

const TEXT_FIELDS: { key: TemplateTextField; labelKey: MessageKey; multiline: boolean }[] = [
  { key: 'duration', labelKey: 'lessonPlans.dialog.durationLabel', multiline: false },
  { key: 'unit_stage', labelKey: 'lessonPlans.dialog.unitStageLabel', multiline: false },
  { key: 'topic', labelKey: 'lessonPlans.dialog.topicLabel', multiline: false },
  { key: 'general_objective', labelKey: 'lessonPlans.dialog.generalObjectiveLabel', multiline: true },
  {
    key: 'specific_objectives',
    labelKey: 'lessonPlans.dialog.specificObjectivesLabel',
    multiline: true,
  },
  {
    key: 'bncc_competencies',
    labelKey: 'lessonPlans.dialog.bnccCompetenciesLabel',
    multiline: true,
  },
  {
    key: 'other_competencies',
    labelKey: 'lessonPlans.dialog.otherCompetenciesLabel',
    multiline: true,
  },
  {
    key: 'resources_materials',
    labelKey: 'lessonPlans.dialog.resourcesMaterialsLabel',
    multiline: true,
  },
];

const ASSESSMENT_TYPE_OPTIONS: { key: LessonPlanAssessmentType; labelKey: MessageKey }[] = [
  { key: 'diagnostic', labelKey: 'lessonPlans.dialog.assessmentTypes.diagnostic' },
  { key: 'formative', labelKey: 'lessonPlans.dialog.assessmentTypes.formative' },
  { key: 'summative', labelKey: 'lessonPlans.dialog.assessmentTypes.summative' },
];

const ASSESSMENT_FORMAT_OPTIONS: { key: LessonPlanAssessmentFormat; labelKey: MessageKey }[] = [
  { key: 'observation', labelKey: 'lessonPlans.dialog.assessmentFormats.observation' },
  { key: 'exercises', labelKey: 'lessonPlans.dialog.assessmentFormats.exercises' },
  { key: 'participation', labelKey: 'lessonPlans.dialog.assessmentFormats.participation' },
  {
    key: 'written_production',
    labelKey: 'lessonPlans.dialog.assessmentFormats.writtenProduction',
  },
  {
    key: 'oral_presentation',
    labelKey: 'lessonPlans.dialog.assessmentFormats.oralPresentation',
  },
  {
    key: 'practical_activity',
    labelKey: 'lessonPlans.dialog.assessmentFormats.practicalActivity',
  },
  { key: 'test', labelKey: 'lessonPlans.dialog.assessmentFormats.test' },
];

/**
 * UC-LP02: subject + the BR-LP07 template for one class/day, upserted by `(school_class_id,
 * subject_id, date)` (BR-LP04) — sending it again for a pair already planned updates that plan
 * rather than creating a second one, so picking a subject that already has a plan loads what was
 * written and offers a PDF preview of it (UC-LP05/BR-LP08).
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
  const [template, setTemplate] = useState<TemplateFormState>(emptyTemplate);
  const [fieldErrors, setFieldErrors] = useState<{ subject_id?: string }>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [existingPlans, setExistingPlans] = useState<LessonPlan[]>([]);
  const [existingError, setExistingError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setSubjectId('');
    setTemplate(emptyTemplate);
    setFieldErrors({});
    setError('');
    setExistingError('');
    setPreviewOpen(false);

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

  const existingPlan = useMemo(
    () => existingPlans.find((plan) => String(plan.subject_id) === subjectId) ?? null,
    [existingPlans, subjectId],
  );

  const selectedSubject = useMemo(
    () => subjects.find((subject) => String(subject.id) === subjectId) ?? null,
    [subjects, subjectId],
  );

  const handleSubjectChange = (value: string) => {
    setSubjectId(value);
    setFieldErrors((current) => ({ ...current, subject_id: undefined }));
    setError('');

    const existing = existingPlans.find((plan) => String(plan.subject_id) === value);
    setTemplate(existing ? toTemplateFormState(existing) : emptyTemplate);
  };

  const handleTextChange =
    (key: TemplateTextField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setTemplate((current) => ({ ...current, [key]: event.target.value }));
    };

  const toggleAssessmentType = (key: LessonPlanAssessmentType) => {
    setTemplate((current) => ({
      ...current,
      assessment_types: current.assessment_types.includes(key)
        ? current.assessment_types.filter((item) => item !== key)
        : [...current.assessment_types, key],
    }));
  };

  const toggleAssessmentFormat = (key: LessonPlanAssessmentFormat) => {
    setTemplate((current) => ({
      ...current,
      assessment_formats: current.assessment_formats.includes(key)
        ? current.assessment_formats.filter((item) => item !== key)
        : [...current.assessment_formats, key],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!subjectId) {
      setFieldErrors({ subject_id: t('lessonPlans.dialog.subjectRequired') });
      return;
    }

    setSaving(true);
    setError('');

    try {
      await upsertLessonPlan(schoolId, {
        school_class_id: schoolClassId,
        subject_id: Number(subjectId),
        date,
        duration: template.duration.trim() || undefined,
        unit_stage: template.unit_stage.trim() || undefined,
        topic: template.topic.trim() || undefined,
        general_objective: template.general_objective.trim() || undefined,
        specific_objectives: template.specific_objectives.trim() || undefined,
        bncc_competencies: template.bncc_competencies.trim() || undefined,
        other_competencies: template.other_competencies.trim() || undefined,
        resources_materials: template.resources_materials.trim() || undefined,
        assessment_types: template.assessment_types,
        assessment_formats: template.assessment_formats,
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
    <>
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          {t('lessonPlans.dialog.title', { date: formattedDate })}
          {existingPlan && (
            <Tooltip title={t('lessonPlans.preview')}>
              <IconButton
                size="small"
                aria-label={t('lessonPlans.previewAria', {
                  subject: selectedSubject?.name ?? '',
                })}
                onClick={() => setPreviewOpen(true)}
              >
                <IconifyIcon icon="mingcute:eye-line" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </DialogTitle>
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

                {TEXT_FIELDS.map(({ key, labelKey, multiline }) => (
                  <Grid size={12} key={key}>
                    <TextField
                      id={`lesson-plan-${key}`}
                      label={t(labelKey)}
                      value={template[key]}
                      onChange={handleTextChange(key)}
                      disabled={saving}
                      variant="filled"
                      fullWidth
                      multiline={multiline}
                      minRows={multiline ? 3 : undefined}
                    />
                  </Grid>
                ))}

                <Grid size={12}>
                  <FormLabel component="legend">
                    {t('lessonPlans.dialog.assessmentSectionTitle')}
                  </FormLabel>

                  <Stack direction="column" gap={1} mt={1}>
                    <FormLabel component="legend" sx={{ typography: 'caption' }}>
                      {t('lessonPlans.dialog.assessmentTypesLabel')}
                    </FormLabel>
                    <FormGroup row>
                      {ASSESSMENT_TYPE_OPTIONS.map((option) => (
                        <FormControlLabel
                          key={option.key}
                          control={
                            <Checkbox
                              checked={template.assessment_types.includes(option.key)}
                              onChange={() => toggleAssessmentType(option.key)}
                              disabled={saving}
                            />
                          }
                          label={t(option.labelKey)}
                        />
                      ))}
                    </FormGroup>

                    <FormLabel component="legend" sx={{ typography: 'caption' }}>
                      {t('lessonPlans.dialog.assessmentFormatsLabel')}
                    </FormLabel>
                    <FormGroup row>
                      {ASSESSMENT_FORMAT_OPTIONS.map((option) => (
                        <FormControlLabel
                          key={option.key}
                          control={
                            <Checkbox
                              checked={template.assessment_formats.includes(option.key)}
                              onChange={() => toggleAssessmentFormat(option.key)}
                              disabled={saving}
                            />
                          }
                          label={t(option.labelKey)}
                        />
                      ))}
                    </FormGroup>
                  </Stack>
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

    <LessonPlanPreviewDialog
      open={previewOpen}
      schoolId={schoolId}
      lessonPlan={existingPlan}
      subjectName={selectedSubject?.name}
      onClose={() => setPreviewOpen(false)}
    />
    </>
  );
};

export default LessonPlanFormDialog;
