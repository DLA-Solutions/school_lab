/** Mirrors the compliance document blueprint (docs/api/v1/documents-and-archive.md § Compliance). */
export interface ComplianceDocument {
  id: number;
  /** One of the closed catalogue keys returned in the list `meta.types`. */
  document_type: string;
  document_type_label: string;
  status: 'approved';
  uploaded_by_id: number | null;
  filename: string | null;
  content_type: string | null;
  byte_size: number | null;
  /** Path to the Active Storage blob, relative to the API host. */
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

/** One entry of the catalogue the API ships in the list `meta`, in display order. */
export interface ComplianceType {
  key: string;
  label: string;
}

export interface ComplianceListMeta {
  page: number;
  per_page: number;
  total: number;
  types: ComplianceType[];
}

export interface ComplianceListResponse {
  data: ComplianceDocument[];
  meta: ComplianceListMeta;
}

export interface ComplianceDocumentResponse {
  data: ComplianceDocument;
}
