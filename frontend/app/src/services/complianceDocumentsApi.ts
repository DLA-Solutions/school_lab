import {
  ComplianceDocument,
  ComplianceDocumentResponse,
  ComplianceListResponse,
  ComplianceType,
} from 'types/complianceDocument';
import { apiAssetUrl, request } from './api';

const collectionPath = (schoolId: number) => `/api/v1/schools/${schoolId}/compliance_documents`;

/** What the API accepts, checked here too so a wrong file is refused before the upload starts. */
export const COMPLIANCE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const COMPLIANCE_MAX_BYTES = 10 * 1024 * 1024;

/** Pagy's `max_limit` on the API; the biggest page a single call can return. */
const PAGE_SIZE = 100;

/** GET /api/v1/schools/:school_id/compliance_documents — newest first, catalogue in `meta.types`. */
export const listComplianceDocuments = (
  schoolId: number,
  { documentType, page = 1 }: { documentType?: string; page?: number } = {},
) => {
  const params = new URLSearchParams({ page: String(page), per_page: String(PAGE_SIZE) });
  if (documentType) params.set('document_type', documentType);

  return request<ComplianceListResponse>(`${collectionPath(schoolId)}?${params.toString()}`);
};

/**
 * Every compliance file of the school plus the catalogue, from as many list calls as it takes.
 * The page groups by type client-side, so it needs the whole set rather than one slice.
 */
export const listAllComplianceDocuments = async (
  schoolId: number,
): Promise<{ documents: ComplianceDocument[]; types: ComplianceType[] }> => {
  const first = await listComplianceDocuments(schoolId);
  const documents = [...first.data];

  for (
    let page = 2;
    documents.length < first.meta.total && page <= Math.ceil(first.meta.total / PAGE_SIZE);
    page += 1
  ) {
    // Sequential on purpose: pages are ordered and the count is small.
    const next = await listComplianceDocuments(schoolId, { page });
    documents.push(...next.data);
  }

  return { documents, types: first.meta.types };
};

/**
 * POST /api/v1/schools/:school_id/compliance_documents as multipart with flat fields. The API
 * accepts a `title` but does not store it, so none is sent.
 */
export const uploadComplianceDocument = async (
  schoolId: number,
  { documentType, file }: { documentType: string; file: File },
): Promise<ComplianceDocument> => {
  const body = new FormData();
  body.append('document_type', documentType);
  body.append('file', file);

  const response = await request<ComplianceDocumentResponse>(collectionPath(schoolId), {
    method: 'POST',
    body,
  });

  return response.data;
};

/** DELETE /api/v1/schools/:school_id/compliance_documents/:id — soft delete, `204`. */
export const deleteComplianceDocument = (schoolId: number, id: number) =>
  request<null>(`${collectionPath(schoolId)}/${id}`, { method: 'DELETE' });

/** The signed Active Storage URL downloads without a bearer token, so it opens in a new tab. */
export const complianceDocumentUrl = (document: ComplianceDocument) =>
  apiAssetUrl(document.file_url);
