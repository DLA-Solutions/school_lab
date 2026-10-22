import { request } from './api';
import { DailyRoutineEntry } from '../types/dailyRoutine';

/**
 * GET /api/v1/schools/:school_id/me/students/:student_id/daily_routine_entries?from=&to=
 * Sent infant routine for one linked child (UC-DR04). `request()` already prefixes `/api/v1`.
 * The API omits drafts and answers 404 for another family, an unknown student, or another school.
 */
export const fetchDailyRoutineEntries = (
  schoolId: number,
  studentId: number,
  from: string,
  to: string,
): Promise<{ data: DailyRoutineEntry[] }> => {
  const query = new URLSearchParams({ from, to });

  return request(
    `/schools/${schoolId}/me/students/${studentId}/daily_routine_entries?${query.toString()}`,
  );
};
