import { request } from './api';
import { CommunicationList } from 'types/communication';
import { DailyRoutine, DailyRoutineInput, MealAmount, MealField } from 'types/dailyRoutine';

const teacherPath = (schoolId: number) => `/api/v1/schools/${schoolId}/academics/daily_routines`;
const familyPath = (schoolId: number) => `/api/v1/schools/${schoolId}/me/daily_routines`;

export interface ListDailyRoutinesParams {
  studentId?: number;
  schoolClassId?: number;
  date?: string;
}

const everyPage = async <T>(load: (page: number) => Promise<CommunicationList<T>>) => {
  const first = await load(1);
  const rows = [...first.data];
  const pageSize = first.meta.per_page || first.data.length || 1;
  const pageCount = Math.ceil(first.meta.total / pageSize);

  for (let page = 2; page <= pageCount && page <= 20; page += 1) {
    const next = await load(page);
    rows.push(...next.data);
  }

  return rows;
};

const queryFor = (params: ListDailyRoutinesParams, page: number) => {
  const query = new URLSearchParams({ page: String(page), limit: '100' });
  if (params.studentId !== undefined) query.set('student_id', String(params.studentId));
  if (params.schoolClassId !== undefined) query.set('school_class_id', String(params.schoolClassId));
  if (params.date) query.set('date', params.date);
  return query.toString();
};

export const listDailyRoutines = (schoolId: number, params: ListDailyRoutinesParams = {}) =>
  everyPage<DailyRoutine>((page) =>
    request<CommunicationList<DailyRoutine>>(`${teacherPath(schoolId)}?${queryFor(params, page)}`),
  );

export const showDailyRoutine = async (schoolId: number, id: number) => {
  const response = await request<{ data: DailyRoutine }>(`${teacherPath(schoolId)}/${id}`);
  return response.data;
};

/** Upsert by student and date. Does not post a card on the thread. */
export const upsertDailyRoutine = async (schoolId: number, dailyRoutine: DailyRoutineInput) => {
  const response = await request<{ data: DailyRoutine }>(teacherPath(schoolId), {
    method: 'PUT',
    body: { daily_routine: dailyRoutine },
  });

  return response.data;
};

export interface ApplyMealsInput {
  schoolClassId: number;
  date: string;
  field: MealField;
  value: MealAmount;
}

/** Fills one meal where that field is still empty. Does not send. */
export const applyMeals = async (schoolId: number, input: ApplyMealsInput) => {
  const response = await request<{ data: DailyRoutine[] }>(`${teacherPath(schoolId)}/apply_meals`, {
    method: 'POST',
    body: {
      school_class_id: input.schoolClassId,
      date: input.date,
      field: input.field,
      value: input.value,
    },
  });

  return response.data;
};

/** Posts one kind-routine message. A second call does not rewrite the card. */
export const sendDailyRoutine = async (schoolId: number, id: number) => {
  const response = await request<{ data: DailyRoutine }>(`${teacherPath(schoolId)}/${id}/send`, {
    method: 'POST',
    body: {},
  });

  return response.data;
};

export const listMyDailyRoutines = (schoolId: number, params: ListDailyRoutinesParams = {}) =>
  everyPage<DailyRoutine>((page) =>
    request<CommunicationList<DailyRoutine>>(`${familyPath(schoolId)}?${queryFor(params, page)}`),
  );

export const showMyDailyRoutine = async (schoolId: number, id: number) => {
  const response = await request<{ data: DailyRoutine }>(`${familyPath(schoolId)}/${id}`);
  return response.data;
};
