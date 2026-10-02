/**
 * GET /api/v1/schools/:school_id/me/report_cards — one row per released publication.
 * `snapshot_id`/`version`/`released_at`/`pdf_url` are null when the publication has no active
 * released snapshot yet (should not normally happen for guardian-visible rows, but the API models
 * it as nullable — see Api::V1::Schools::Me::ReportCardsController#list_payload).
 */
export interface ReportCardListItem {
  publication_id: number;
  student_id: number;
  academic_period_id: number;
  snapshot_id: number | null;
  version: number | null;
  released_at: string | null;
  pdf_url: string | null;
}

export interface PagyMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface ReportCardListResponse {
  data: ReportCardListItem[];
  meta: PagyMeta;
}

/** GET /api/v1/schools/:school_id/me/students (view: guardian) — id + name only. */
export interface GuardianStudent {
  id: number;
  name: string;
}

export interface ReportCardSignatory {
  id: number;
  role_label: string;
  name: string;
  title: string;
}

export interface ReportCardConfigSnapshot {
  id: number;
  version: number;
  template_key: string;
  display_config: Record<string, unknown>;
  header_text: string | null;
  footer_text: string | null;
  signatory: ReportCardSignatory;
}

/** `entry.value` is a plain string column (qualitative or numeric grades share one column). */
export interface ReportCardComponentEntry {
  id: number;
  name: string;
  weight_percent: string;
  entry_kind: string;
  value: string | null;
}

export interface ReportCardOverride {
  computed_value: string;
  override_value: string;
  reason_code: string;
}

export interface ReportCardDisciplineRow {
  class_discipline_id: number;
  subject_id: number;
  subject_name: string;
  grade_launch_id: number;
  grade_launch_digest: string;
  components: ReportCardComponentEntry[];
  override: ReportCardOverride | null;
  final_value: string | null;
}

export interface ReportCardAttendanceSummary {
  instructional_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  numerator: number;
  late_counts_as_absence: boolean;
  /** Half-up to two decimals server-side; null when the period has zero instructional sessions. */
  percentage: number | null;
}

/**
 * The immutable JSON stored on the released snapshot — built once at release time by
 * ReportCards::MaterializeSnapshotService and never recomputed afterwards, even if later grade or
 * attendance data changes.
 */
export interface ReportCardSnapshotPayload {
  student: { id: number; name: string };
  period: { id: number; name: string; sequence: number; closure_status: string };
  school_class: { id: number; name: string };
  config: ReportCardConfigSnapshot;
  disciplines: ReportCardDisciplineRow[];
  attendance: ReportCardAttendanceSummary;
  grade_launch_digest: string;
}

export interface ReportCardSnapshot {
  id: number;
  version: number;
  released_at: string;
  correction_reason: string | null;
  grade_launch_digest: string;
  supersedes_id: number | null;
  snapshot: ReportCardSnapshotPayload;
  config_version: number;
  /** Relative API path (already includes /api/v1/...) — see fetchReportCardPdfDataUri instead. */
  pdf_url: string;
}

/** GET /api/v1/schools/:school_id/me/report_cards/:publication_id */
export interface ReportCardPublication {
  id: number;
  student_id: number;
  academic_period_id: number;
  active_snapshot_id: number | null;
  created_at: string;
  updated_at: string;
  active_snapshot: ReportCardSnapshot | null;
}
