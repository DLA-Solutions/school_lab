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

/**
 * Who put a family document in the archive: a parent through "Meus documentos", or the school.
 * System-generated files (the signed contract) have no uploader and carry `null` instead.
 */
export type GuardianDocumentUploaderKind = 'guardian' | 'school';

/**
 * A document with the child it hangs off and who sent it. Staff see these when listing by
 * guardian, where a file attached to the guardian itself has no child (and no parent sender).
 */
export interface FamilyDocument extends SchoolDocument {
  student_id: number | null;
  student_name: string | null;
  /** The parent's name; `null` when school staff uploaded the file or the system filed it. */
  uploaded_by_name: string | null;
  /** `null` for system-generated documents, such as the e-signed contract. */
  uploaded_by_kind: GuardianDocumentUploaderKind | null;
}

export interface FamilyDocumentListResponse {
  data: FamilyDocument[];
  meta: DocumentListMeta;
}

/**
 * A row of the guardian's "Meus documentos" — always child-bound. Mirrors `Me::DocumentBlueprint`.
 */
export interface GuardianDocument extends FamilyDocument {
  student_id: number;
}

export interface GuardianDocumentListResponse {
  data: GuardianDocument[];
  meta: DocumentListMeta;
}

export interface GuardianDocumentResponse {
  data: GuardianDocument;
}
