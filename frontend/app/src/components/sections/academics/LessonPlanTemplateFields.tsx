import { ChangeEvent } from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'providers/I18nContext';
import { LessonPlanAssessmentFormat, LessonPlanAssessmentType } from 'types/lessonPlans';
import {
  LESSON_PLAN_ASSESSMENT_FORMAT_OPTIONS,
  LESSON_PLAN_ASSESSMENT_TYPE_OPTIONS,
  LESSON_PLAN_TEXT_FIELDS,
  LessonPlanTemplateFormState,
  LessonPlanTemplateTextField,
} from 'utils/lessonPlanTemplate';

export interface LessonPlanTemplateFieldsProps {
  template: LessonPlanTemplateFormState;
  onTextChange: (
    key: LessonPlanTemplateTextField,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onToggleAssessmentType: (key: LessonPlanAssessmentType) => void;
  onToggleAssessmentFormat: (key: LessonPlanAssessmentFormat) => void;
  disabled?: boolean;
}

/**
 * BR-LP07 structured template fields — the free-text fields plus the two Avaliação checkbox
 * groups. Shared by the real teacher flow (`LessonPlanFormDialog`, where a `date` + subject are
 * already resolved from the calendar) and the standalone `LessonPlanNewPlanDialog` stub (opened
 * from a plain "Novo Plano" button, with no resolved date/subject yet — see that file for why its
 * Save button has no real action).
 */
const LessonPlanTemplateFields = ({
  template,
  onTextChange,
  onToggleAssessmentType,
  onToggleAssessmentFormat,
  disabled = false,
}: LessonPlanTemplateFieldsProps) => {
  const { t } = useTranslation();

  return (
    <>
      {LESSON_PLAN_TEXT_FIELDS.map(({ key, labelKey, multiline }) => (
        <Grid size={12} key={key}>
          <TextField
            id={`lesson-plan-${key}`}
            label={t(labelKey)}
            value={template[key]}
            onChange={onTextChange(key)}
            disabled={disabled}
            variant="filled"
            fullWidth
            multiline={multiline}
            minRows={multiline ? 3 : undefined}
          />
        </Grid>
      ))}

      <Grid size={12}>
        <FormLabel component="legend">{t('lessonPlans.dialog.assessmentSectionTitle')}</FormLabel>

        <Stack direction="column" gap={1} mt={1}>
          <FormLabel component="legend" sx={{ typography: 'caption' }}>
            {t('lessonPlans.dialog.assessmentTypesLabel')}
          </FormLabel>
          <FormGroup row>
            {LESSON_PLAN_ASSESSMENT_TYPE_OPTIONS.map((option) => (
              <FormControlLabel
                key={option.key}
                control={
                  <Checkbox
                    checked={template.assessment_types.includes(option.key)}
                    onChange={() => onToggleAssessmentType(option.key)}
                    disabled={disabled}
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
            {LESSON_PLAN_ASSESSMENT_FORMAT_OPTIONS.map((option) => (
              <FormControlLabel
                key={option.key}
                control={
                  <Checkbox
                    checked={template.assessment_formats.includes(option.key)}
                    onChange={() => onToggleAssessmentFormat(option.key)}
                    disabled={disabled}
                  />
                }
                label={t(option.labelKey)}
              />
            ))}
          </FormGroup>
        </Stack>
      </Grid>
    </>
  );
};

export default LessonPlanTemplateFields;
