/** Written, then handed to the family — mirrors `PreceptorshipReportStateMachine`. */
export type PreceptorshipStatus = 'draft' | 'published';

export interface PreceptorshipReport {
  id: number;
  school_id: number;
  status: PreceptorshipStatus;
  body: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  student_id: number;
  teacher_id: number;
  academic_period_id: number | null;
  student_name: string | null;
  teacher_name: string | null;
  period_name: string | null;
  /** The model's own rule, so the screen does not re-derive it from the status. */
  editable: boolean;
}

export interface PreceptorshipListResponse {
  data: PreceptorshipReport[];
  meta: { page: number; per_page: number; total: number };
}

export interface PreceptorshipResponse {
  data: PreceptorshipReport;
}

/** A student the signed-in teacher may write about. */
export interface RollStudent {
  id: number;
  name: string;
  school_class_name: string | null;
  /**
   * The student's guardian(s), so the roster can show who the report ultimately reaches without
   * a request per student.
   *
   * Pending delivery from `PreceptorshipReportsController#roll` (see
   * `docs/api/v1/academics.md` / the live response once the backend agent ships it) — optional
   * until then so the roster degrades to an empty list rather than breaking.
   */
  guardian_names?: string[];
}

export interface RollResponse {
  data: RollStudent[];
}
