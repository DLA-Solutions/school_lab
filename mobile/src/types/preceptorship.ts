/**
 * Guardian read model for a preceptorship report.
 * Mirrors `PreceptorshipReportBlueprint`. Mobile does not import school SPA types.
 * Guardian routes return published rows; `draft` stays in the type so a leaked row can be dropped.
 */

export type PreceptorshipStatus = 'draft' | 'published';

export interface PreceptorshipReport {
  id: number;
  school_id: number;
  status: PreceptorshipStatus | string;
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
  editable: boolean;
}

export interface PreceptorshipListResponse {
  data: PreceptorshipReport[];
  meta: {
    page: number;
    per_page: number;
    total: number;
  };
}
