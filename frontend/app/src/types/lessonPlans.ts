/**
 * BC10 — Academic: Lesson Plans (`docs/prds/academic/lesson-plans.md`).
 *
 * A lesson plan keys off `class_discipline_id` (school + class + subject + assigned teacher,
 * already modelled by curriculum BC5) and a `date`. The wire shape below names the three parts
 * the client actually picks — `school_class_id` + `subject_id` + `date` — rather than the
 * resolved `class_discipline_id`, which only the API knows how to look up (BR-LP01, BR-LP02).
 */
export interface LessonPlan {
  id: number;
  school_id: number;
  school_class_id: number;
  subject_id: number;
  class_discipline_id: number;
  date: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

/** `PUT .../lesson_plans` body — upsert by `(school_class_id, subject_id, date)` (BR-LP04). */
export interface LessonPlanUpsertPayload {
  school_class_id: number;
  subject_id: number;
  date: string;
  content: string;
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
