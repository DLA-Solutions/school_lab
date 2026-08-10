/** Mirrors `DocumentBlueprint` (web/app/blueprints/document_blueprint.rb). */
export interface SchoolDocument {
  id: number;
  school_id: number;
  documentable_type: 'School' | 'Guardian' | 'Student';
  documentable_id: number;
  document_type: string;
  /** `pending` on upload; staff moves it to `approved` or `rejected`. */
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  filename: string | null;
  content_type: string | null;
  byte_size: number | null;
  /** Path to the Active Storage blob, relative to the API host. */
  file_url: string | null;
}

export interface DocumentListMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface DocumentListResponse {
  data: SchoolDocument[];
  meta: DocumentListMeta;
}

export interface DocumentResponse {
  data: SchoolDocument;
}
