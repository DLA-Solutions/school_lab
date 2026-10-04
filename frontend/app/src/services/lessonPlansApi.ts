import { Paginated } from 'types/academics';
import { ClassInstructionalDays, LessonPlan, LessonPlanUpsertPayload } from 'types/lessonPlans';
import { request } from './api';

const base = (schoolId: number) => `/api/v1/schools/${schoolId}/academics`;

/**
 * GET .../school_classes/:id/instructional_days — UC-LP01: resolves the class's school year and
 * which of its days the admin has marked instructional (BR-SY10), so the calendar knows which
 * days a teacher may click.
 */
export const fetchClassInstructionalDays = async (
  schoolId: number,
  schoolClassId: number,
): Promise<ClassInstructionalDays> => {
  const response = await request<{ data: ClassInstructionalDays }>(
    `${base(schoolId)}/school_classes/${schoolClassId}/instructional_days`,
  );

  return response.data;
};

export interface ListLessonPlansParams {
  page?: number;
  school_class_id?: number;
  subject_id?: number;
  /** Inclusive date range, `YYYY-MM-DD` — UC-LP03 (teacher-scoped) and UC-LP04 (staff-scoped). */
  from?: string;
  to?: string;
}

/** GET .../lesson_plans — scoped by `policy_scope` server-side (own vs. whole school). */
export const listLessonPlans = (
  schoolId: number,
  { page = 1, school_class_id, subject_id, from, to }: ListLessonPlansParams = {},
) => {
  const query = new URLSearchParams({ page: String(page) });
  if (school_class_id !== undefined) query.set('school_class_id', String(school_class_id));
  if (subject_id !== undefined) query.set('subject_id', String(subject_id));
  if (from) query.set('from', from);
  if (to) query.set('to', to);

  return request<Paginated<LessonPlan>>(`${base(schoolId)}/lesson_plans?${query}`);
};

/** GET .../lesson_plans/:id — read one. */
export const fetchLessonPlan = async (schoolId: number, id: number): Promise<LessonPlan> => {
  const response = await request<{ data: LessonPlan }>(`${base(schoolId)}/lesson_plans/${id}`);

  return response.data;
};

/**
 * PUT .../lesson_plans — upsert by `(school_class_id, subject_id, date)` (BR-LP04, UC-LP02).
 * Rejected with `422 non_instructional_day` when `date` is not marked instructional (BR-LP03),
 * `403 forbidden` when the requester is not the `class_discipline`'s teacher (BR-LP02).
 */
export const upsertLessonPlan = async (
  schoolId: number,
  payload: LessonPlanUpsertPayload,
): Promise<LessonPlan> => {
  const response = await request<{ data: LessonPlan }>(`${base(schoolId)}/lesson_plans`, {
    method: 'PUT',
    body: { lesson_plan: payload },
  });

  return response.data;
};
