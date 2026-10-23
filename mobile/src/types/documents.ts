/**
 * Family view of `GET /api/v1/schools/:school_id/me/documents`.
 * Mirrors `DocumentBlueprint` view `:family`. Mobile does not import school SPA types.
 */

export type FamilyDocumentStatus = 'pending' | 'approved' | 'rejected';

export type UploadedByKind = 'guardian' | 'school';

export interface FamilyDocument {
  id: number;
  school_id: number;
  document_type: string;
  status: FamilyDocumentStatus | string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  documentable_type: string;
  documentable_id: number;
  filename: string | null;
  content_type: string | null;
  byte_size: number | null;
  /** Signed Active Storage path. Downloads without a bearer token. Null when no file is attached. */
  file_url: string | null;
  student_id: number | null;
  student_name: string | null;
  uploaded_by_name: string | null;
  uploaded_by_kind: UploadedByKind | null;
}

export interface FamilyDocumentListResponse {
  data: FamilyDocument[];
  meta: {
    page: number;
    per_page: number;
    total: number;
  };
}
