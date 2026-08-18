import { Paginated } from 'types/academics';

/** Mirrors `ReportCardConfigBlueprint`. */
export interface ReportCardSignatory {
  id: number;
  role_label: string;
  name: string;
  title: string;
}

export interface ReportCardConfig {
  id: number;
  version: number;
  template_key: string;
  display_config: Record<string, unknown>;
  header_text: string | null;
  footer_text: string | null;
  document_signatory_id: number;
  signatory: ReportCardSignatory | null;
  created_at: string;
  updated_at: string;
}

export interface ReportCardBlocker {
  student_id: number | null;
  code: string;
  details?: Record<string, unknown>;
}

export interface ReportCardBatchCounts {
  requested: number;
  released: number;
  failed: number;
}

export interface ReportCardBatchResult {
  student_id: number;
  publication_id: number;
  snapshot_id: number;
  version: number;
  released_at: string;
  pdf_url: string;
}

/** Mirrors validate success and `ReportCardPublishBatchBlueprint`. */
export interface ReportCardBatch {
  batch_id: number;
  schedule_id: number | null;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  atomic: boolean;
  class_id: number;
  academic_period_id: number;
  scheduled_for: string | null;
  school_timezone?: string;
  counts: ReportCardBatchCounts;
  results: ReportCardBatchResult[];
  blockers: ReportCardBlocker[];
}

export interface ReportCardValidateResult {
  class_id: number;
  academic_period_id: number;
  ready: boolean;
  blockers: ReportCardBlocker[];
}

export interface ReportCardSnapshotPayload {
  disciplines?: Array<Record<string, unknown>>;
  attendance?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Mirrors `ReportCardSnapshotBlueprint`. */
export interface ReportCardSnapshot {
  id: number;
  version: number;
  released_at: string;
  correction_reason: string | null;
  grade_launch_digest: string;
  supersedes_id: number | null;
  snapshot: ReportCardSnapshotPayload;
  config_version: number;
  pdf_url: string;
}

/** Mirrors guardian list payload and `ReportCardPublicationBlueprint`. */
export interface MyReportCardListItem {
  publication_id: number;
  student_id: number;
  academic_period_id: number;
  /** Named by the API so a listing reads without a lookup per row. Absent on the family route. */
  academic_period_name?: string | null;
  snapshot_id: number | null;
  version: number | null;
  released_at: string | null;
  pdf_url: string | null;
}

export interface ReportCardPublication {
  id: number;
  student_id: number;
  academic_period_id: number;
  active_snapshot_id: number | null;
  active_snapshot: ReportCardSnapshot | null;
  created_at: string;
  updated_at: string;
}

export interface ReportCardRepublishResult {
  publication_id: number;
  snapshot_id: number;
  version: number;
  released_at: string;
  pdf_url: string;
}

export type MyReportCardListResponse = Paginated<MyReportCardListItem>;
