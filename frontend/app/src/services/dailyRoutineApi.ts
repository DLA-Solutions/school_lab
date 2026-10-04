import {
  DailyRoutineEntry,
  DailyRoutineRosterRow,
  DailyRoutineUpsertPayload,
} from 'types/dailyRoutine';
import { request } from './api';

const base = (schoolId: number) => `/api/v1/schools/${schoolId}/academics`;

/**
 * GET .../school_classes/:id/daily_routine_entries?date= — UC-DR01: every kept student of the
 * class plus their entry for that date, `null` when nothing was recorded yet. `403` when the
 * requester is a teacher without a `TeachingAssignment` to the class (BR-DR07).
 */
export const fetchDailyRoutineRoster = async (
  schoolId: number,
  schoolClassId: number,
  date: string,
): Promise<DailyRoutineRosterRow[]> => {
  const query = new URLSearchParams({ date });
  const response = await request<{ data: DailyRoutineRosterRow[] }>(
    `${base(schoolId)}/school_classes/${schoolClassId}/daily_routine_entries?${query}`,
  );

  return response.data;
};

/**
 * PUT .../daily_routine_entries — upsert by `(student_id, date)` (BR-DR01, UC-DR02). Always saves
 * as `draft`, or leaves `sent` as-is if the entry was already sent (BR-DR04) — this call never
 * changes `status` itself.
 */
export const upsertDailyRoutineEntry = async (
  schoolId: number,
  payload: DailyRoutineUpsertPayload,
): Promise<DailyRoutineEntry> => {
  const response = await request<{ data: DailyRoutineEntry }>(
    `${base(schoolId)}/daily_routine_entries`,
    { method: 'PUT', body: { daily_routine_entry: payload } },
  );

  return response.data;
};

/**
 * POST .../daily_routine_entries/:id/send — UC-DR03: `draft → sent`, notifying the student's
 * guardians server-side (BR-DR05). Idempotent — calling it again on an already-`sent` entry still
 * answers `200` with no second notification (BR-DR04, AC-DR04).
 */
export const sendDailyRoutineEntry = async (
  schoolId: number,
  id: number,
): Promise<DailyRoutineEntry> => {
  const response = await request<{ data: DailyRoutineEntry }>(
    `${base(schoolId)}/daily_routine_entries/${id}/send`,
    { method: 'POST' },
  );

  return response.data;
};

export interface ListMyChildDailyRoutineEntriesParams {
  /** Inclusive date range, `YYYY-MM-DD`. */
  from?: string;
  to?: string;
}

/**
 * GET .../me/students/:id/daily_routine_entries?from=&to= — UC-DR04 (guardian): `sent`-only
 * entries for the guardian's own linked child (BR-DR06). Cross-family guardian → `404`.
 */
export const listMyChildDailyRoutineEntries = async (
  schoolId: number,
  studentId: number,
  { from, to }: ListMyChildDailyRoutineEntriesParams = {},
): Promise<DailyRoutineEntry[]> => {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);

  const response = await request<{ data: DailyRoutineEntry[] }>(
    `/api/v1/schools/${schoolId}/me/students/${studentId}/daily_routine_entries?${query}`,
  );

  return response.data;
};
