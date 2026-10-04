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
  /** Every guardian linked to the student, derived fresh on every read. */
  guardian_names: string[];
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
}

/** A student offered by the "Ata" create dialog's picker — shape shared by both data sources it
 * draws from (the teacher's own roll, or a school-wide search for manage_academic staff). */
export interface IncidentStudentOption {
  id: number;
  name: string;
  school_class_name?: string | null;
}
