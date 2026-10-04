import { ChangeEvent, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'providers/I18nContext';
import { LessonPlanAssessmentFormat, LessonPlanAssessmentType } from 'types/lessonPlans';
import { LessonPlanTemplateTextField, emptyLessonPlanTemplate } from 'utils/lessonPlanTemplate';
import LessonPlanTemplateFields from './LessonPlanTemplateFields';

export interface LessonPlanNewPlanDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Standalone "Novo Plano" entry point (teacher's lesson plans view) — opens the BR-LP07 template
 * fields without a date/subject resolved from the instructional-days calendar first, unlike
 * `LessonPlanFormDialog` (opened only from a calendar day click, which is what resolves
 * `school_class_id` + `subject_id` + `date` for the real `(school_class_id, subject_id, date)`
 * upsert — BR-LP04).
 *
 * How this entry point should resolve that triple is an open product question, not something to
 * guess at here — so Save is intentionally inert: this dialog never calls the upsert API. It only
 * lets a teacher preview/fill the template shape before that question is settled.
 */
const LessonPlanNewPlanDialog = ({ open, onClose }: LessonPlanNewPlanDialogProps) => {
  const { t } = useTranslation();

  const [template, setTemplate] = useState(emptyLessonPlanTemplate);

  const handleTextChange =
    (key: LessonPlanTemplateTextField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleClose = () => {
    setTemplate(emptyLessonPlanTemplate);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('lessonPlans.newDialog.title')}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2.5} pt={0.5}>
          <LessonPlanTemplateFields
            template={template}
            onTextChange={handleTextChange}
            onToggleAssessmentType={toggleAssessmentType}
            onToggleAssessmentFormat={toggleAssessmentFormat}
          />
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          {t('common.cancel')}
        </Button>
        {/* No resolved (school_class_id, subject_id, date) exists in this flow yet — see the
            component doc comment. Disabled rather than wired to a fake success, so nobody walks
            away thinking a plan was sent. */}
        <Tooltip title={t('lessonPlans.newDialog.saveDisabledHint')}>
          <span>
            <Button variant="contained" disabled>
              {t('common.save')}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
};

export default LessonPlanNewPlanDialog;
