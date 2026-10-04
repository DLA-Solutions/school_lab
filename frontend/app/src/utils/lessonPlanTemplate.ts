import type { MessageKey } from 'locales';
import {
  LessonPlan,
  LessonPlanAssessmentFormat,
  LessonPlanAssessmentType,
} from 'types/lessonPlans';

/**
 * BR-LP07 structured template shape, shared by `LessonPlanFormDialog` (the real teacher flow,
 * opened from a calendar day with a resolved date/subject) and `LessonPlanNewPlanDialog` (the
 * standalone "Novo Plano" stub, which has neither yet). Pulled out of
 * `components/sections/academics/LessonPlanTemplateFields.tsx` because a component file may only
 * export components (`react-refresh/only-export-components`).
 */

/** BR-LP07 — free-text template fields, all optional. */
export type LessonPlanTemplateTextField =
  | 'duration'
  | 'unit_stage'
  | 'topic'
  | 'general_objective'
  | 'specific_objectives'
  | 'bncc_competencies'
  | 'other_competencies'
  | 'resources_materials';

export type LessonPlanTemplateFormState = Record<LessonPlanTemplateTextField, string> & {
  assessment_types: LessonPlanAssessmentType[];
  assessment_formats: LessonPlanAssessmentFormat[];
};

export const emptyLessonPlanTemplate: LessonPlanTemplateFormState = {
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

export const toLessonPlanTemplateFormState = (plan: LessonPlan): LessonPlanTemplateFormState => ({
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

export const LESSON_PLAN_TEXT_FIELDS: {
  key: LessonPlanTemplateTextField;
  labelKey: MessageKey;
  multiline: boolean;
}[] = [
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

export const LESSON_PLAN_ASSESSMENT_TYPE_OPTIONS: {
  key: LessonPlanAssessmentType;
  labelKey: MessageKey;
}[] = [
  { key: 'diagnostic', labelKey: 'lessonPlans.dialog.assessmentTypes.diagnostic' },
  { key: 'formative', labelKey: 'lessonPlans.dialog.assessmentTypes.formative' },
  { key: 'summative', labelKey: 'lessonPlans.dialog.assessmentTypes.summative' },
];

export const LESSON_PLAN_ASSESSMENT_FORMAT_OPTIONS: {
  key: LessonPlanAssessmentFormat;
  labelKey: MessageKey;
}[] = [
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
