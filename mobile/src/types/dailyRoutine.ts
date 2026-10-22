/**
 * Guardian read model for an infant daily routine entry.
 * Mirrors `DailyRoutineEntryBlueprint` (`web/app/blueprints/daily_routine_entry_blueprint.rb`).
 * Mobile does not import school SPA types.
 */

/** BR-DR04 — plain draft/sent flag. Início renders `sent` only. */
export type DailyRoutineStatus = 'draft' | 'sent';

export interface DailyRoutineEntry {
  id: number;
  student_id: number;
  date: string;
  /** BR-DR03 — `null` means not recorded, distinct from recorded as not eaten (`false`). */
  snack_eaten: boolean | null;
  poop_count: number;
  pee_count: number;
  notes: string | null;
  status: DailyRoutineStatus;
  sent_at: string | null;
  sent_by_membership_id: number | null;
  recorded_by_membership_id: number | null;
  created_at: string;
  updated_at: string;
}
