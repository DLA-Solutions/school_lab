/**
 * BC10 — Academic: Lesson Plans (`docs/prds/academic/lesson-plans.md`).
 *
 * A lesson plan keys off `class_discipline_id` (school + class + subject + assigned teacher,
 * already modelled by curriculum BC5) and a `date`. The wire shape below names the three parts
 * the client actually picks — `school_class_id` + `subject_id` + `date` — rather than the
 * resolved `class_discipline_id`, which only the API knows how to look up (BR-LP01, BR-LP02).
 */

/** BR-LP07 — `assessment_types` allowed values. */
export type LessonPlanAssessmentType = 'diagnostic' | 'formative' | 'summative';

/** BR-LP07 — `assessment_formats` allowed values. */
export type LessonPlanAssessmentFormat =
  | 'observation'
  | 'exercises'
  | 'participation'
  | 'written_production'
  | 'oral_presentation'
  | 'practical_activity'
  | 'test';

/**
 * The BR-LP07 structured template — supersedes the free-text `content` field from BR-LP01. Every
 * field is optional (`[product decision]`): nothing beyond `class_discipline_id`/`date` is
 * required to save a plan (BR-LP03).
 */
export interface LessonPlan {
  id: number;
  school_id: number;
  school_class_id: number;
  subject_id: number;
  class_discipline_id: number;
  /** Denormalized by the blueprint for the coordination list (UC-LP04) — null when the
   *  `class_discipline` has no assigned teacher. */
  teacher_id: number | null;
  teacher_name: string | null;
  /** Denormalized alongside `teacher_name` so the admin table renders without N+1 lookups. */
  subject_name: string;
  school_class_name: string;
  date: string;
  duration: string | null;
  unit_stage: string | null;
  topic: string | null;
  general_objective: string | null;
  specific_objectives: string | null;
  bncc_competencies: string | null;
  other_competencies: string | null;
  resources_materials: string | null;
  assessment_types: LessonPlanAssessmentType[];
  assessment_formats: LessonPlanAssessmentFormat[];
  created_at?: string;
  updated_at?: string;
}

/** `PUT .../lesson_plans` body — upsert by `(school_class_id, subject_id, date)` (BR-LP04). */
export interface LessonPlanUpsertPayload {
  school_class_id: number;
  subject_id: number;
  date: string;
  duration?: string;
  unit_stage?: string;
  topic?: string;
  general_objective?: string;
  specific_objectives?: string;
  bncc_competencies?: string;
  other_competencies?: string;
  resources_materials?: string;
  assessment_types?: LessonPlanAssessmentType[];
  assessment_formats?: LessonPlanAssessmentFormat[];
}

/**
 * `GET .../school_classes/:id/instructional_days` — the teacher-facing read of BR-SY10 for one
 * class's school year. Only instructional dates are listed; everything else in
 * `[starts_on, ends_on]` — and everything outside it — is not (AC-SY05: undecided never defaults
 * to instructional).
 */
export interface ClassInstructionalDays {
  school_year_id: number;
  starts_on: string;
  ends_on: string;
  instructional_dates: string[];
}
