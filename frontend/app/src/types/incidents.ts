import { StudentGuardianLink } from 'types/student';

/**
 * BC7 — Academic: Incidents (`docs/prds/academic/incidents.md`), surfaced in the product menu as
 * "Ata". Mirrors `IncidentBlueprint` (web/app/blueprints/incident_blueprint.rb) — the staff shape,
 * which carries both BR-IN08 approval slots and who filed the record.
 */
export type IncidentCategory = 'disciplinary' | 'pastoral' | 'health';

export type IncidentVisibility = 'staff_only' | 'guardian' | 'guardian_on_publish';

export type IncidentStatus = 'pending_approval' | 'approved' | 'archived';

export interface Incident {
  id: number;
  student_id: number;
  incident_type_id: number;
  category: IncidentCategory;
  severity: string | null;
  visibility: IncidentVisibility;
  status: IncidentStatus;
  description: string | null;
  guardian_points_raised: string | null;
  school_response: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  reported_by_membership_id?: number;
  coordination_approved_at?: string | null;
  coordination_approved_by_membership_id?: number | null;
  director_approved_at?: string | null;
  director_approved_by_membership_id?: number | null;
  /** The "Ata" grid is read by name, not by id — derived from the student association. */
  student_name: string;
  incident_type_name: string;
  /**
   * BR-IN11 — the guardian set snapshotted onto this incident at save time (`incident_guardians`),
   * not derived live from the student's current `student_guardians` the way this field used to
   * work. `guardian_id` is nullable: a later guardian deletion nullifies the link but keeps the
   * row, since the ata is a historical record of who was on file that day.
   */
  guardians: IncidentGuardianSnapshot[];
}

/** One row of `Incident#guardians` — mirrors `incident_guardians`. */
export interface IncidentGuardianSnapshot {
  guardian_id: number | null;
  name: string;
  relationship: 'father' | 'mother' | 'other';
}

export interface IncidentListMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface IncidentListResponse {
  data: Incident[];
  meta: IncidentListMeta;
}

export interface IncidentResponse {
  data: Incident;
}

/**
 * `POST .../academics/incidents` body. The "Ata" menu entry's own create flow (a parent-meeting
 * note) deliberately omits `incident_type_id` and `visibility` — the API resolves the seeded
 * "Reunião com os pais" (`system_key: guardian_meeting`) type and its default visibility
 * (`staff_only`) when both are absent (`Academic::CreateIncidentService`). A generic incident
 * form picking its own type/category/severity is out of scope for this entry point.
 */
export interface IncidentCreatePayload {
  student_id: number;
  guardian_points_raised?: string;
  school_response?: string;
  /**
   * BR-IN11/UC-IN06 — the guardians to snapshot onto the incident. Omitted preserves today's
   * default (the API snapshots the student's current `student_guardians`); sent only once the
   * creator has actually touched the pre-filled checklist (`manage_academic` staff path only —
   * the teacher "nota ata" flow never sends this).
   */
  guardian_ids?: number[];
}

/** A student offered by the "Ata" create dialog's picker — shape shared by both data sources it
 * draws from (the teacher's own roll, or a school-wide search for manage_academic staff). */
export interface IncidentStudentOption {
  id: number;
  name: string;
  school_class_name?: string | null;
  /**
   * Present only for the manage_academic staff search path (`StudentBlueprint` already embeds
   * this on every row) — lets the guardian checklist show "Mãe"/"Pai" labels without a second
   * round trip. The teacher roll endpoint does not carry relationship-tagged guardians, so this
   * is absent there (BR-IN11's guardian picker is staff-only — see `IncidentFormDialog`).
   */
  guardians?: StudentGuardianLink[];
}
