/**
 * BC11 — Academic: Infant Daily Routine / Rotina Infantil (`docs/prds/academic/routine.md`).
 *
 * A daily routine entry keys off `student_id` + `date` (BR-DR01) — same upsert-by-day shape as
 * `lesson-plans.md`'s `LessonPlan`. Mirrors `DailyRoutineEntryBlueprint`
 * (`web/app/blueprints/daily_routine_entry_blueprint.rb`).
 */

/** BR-DR04 — plain draft/sent flag, not an AASM machine. */
export type DailyRoutineStatus = 'draft' | 'sent';

export interface DailyRoutineEntry {
  id: number;
  student_id: number;
  date: string;
  /** BR-DR03 — `null` means not yet recorded, distinct from "recorded as not eaten" (`false`). */
  snack_eaten: boolean | null;
  poop_count: number;
  pee_count: number;
  notes: string | null;
  status: DailyRoutineStatus;
  sent_at: string | null;
  sent_by_membership_id: number | null;
  recorded_by_membership_id: number | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * One roster row (UC-DR01) — a student in the class plus their entry for the requested date, or
 * `null` when nothing has been recorded yet. Mirrors the `roster_row` shape rendered by
 * `Api::V1::Schools::Academics::DailyRoutineEntriesController#index`.
 */
export interface DailyRoutineRosterRow {
  student_id: number;
  student_name: string;
  daily_routine_entry: DailyRoutineEntry | null;
}

/**
 * `PUT .../daily_routine_entries` body — upsert by `(student_id, date)` (BR-DR01, UC-DR02). Every
 * field besides `student_id`/`date` is optional: the API only touches the keys actually sent, so
 * a single icon tap can patch just `poop_count` without clobbering notes or snack state.
 */
export interface DailyRoutineUpsertPayload {
  student_id: number;
  date: string;
  snack_eaten?: boolean | null;
  poop_count?: number;
  pee_count?: number;
  notes?: string | null;
}
