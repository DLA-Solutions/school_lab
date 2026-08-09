import { DocumentListResponse, DocumentResponse, SchoolDocument } from 'types/document';
import { API_BASE_URL, request } from './api';

const collectionPath = (schoolId: number) => `/api/v1/schools/${schoolId}/documents`;

/** The owners a personal document can hang off — mirrors `Document::DOCUMENTABLE_TYPES`. */
export type DocumentableType = 'Guardian' | 'Student' | 'Teacher';

/** Personal-document kinds a school collects. Free text on the API side. */
export const PERSONAL_DOCUMENT_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'rg', label: 'RG' },
  { value: 'proof_of_address', label: 'Comprovante de residência' },
  { value: 'proof_of_income', label: 'Comprovante de renda' },
  { value: 'other', label: 'Outro' },
] as const;

/** What a collaborator's file is usually called, on top of the shared kinds. */
export const COLLABORATOR_DOCUMENT_TYPES = [
  ...PERSONAL_DOCUMENT_TYPES.filter((type) => type.value !== 'proof_of_income'),
  { value: 'employment_contract', label: 'Contrato de trabalho' },
  { value: 'diploma', label: 'Diploma / certificação' },
] as const;

export const documentTypeLabel = (value: string) =>
  [...PERSONAL_DOCUMENT_TYPES, ...COLLABORATOR_DOCUMENT_TYPES].find(
    (type) => type.value === value,
  )?.label ?? value;

/** GET /api/v1/schools/:school_id/documents, narrowed to one owner. */
export const listPersonDocuments = (
  schoolId: number,
  documentableType: DocumentableType,
  documentableId: number,
  page = 1,
) =>
  request<DocumentListResponse>(
    `${collectionPath(schoolId)}?documentable_type=${documentableType}` +
      `&documentable_id=${documentableId}&page=${page}`,
  );

/**
 * POST /api/v1/schools/:school_id/documents as multipart — the file rides in the body, so this
 * is a FormData rather than JSON. `documents_controller` reads `document[file]`.
 */
export const uploadPersonDocument = async (
  schoolId: number,
  documentableType: DocumentableType,
  documentableId: number,
  { file, documentType }: { file: File; documentType: string },
): Promise<SchoolDocument> => {
  const body = new FormData();
  body.append('document[documentable_type]', documentableType);
  body.append('document[documentable_id]', String(documentableId));
  body.append('document[document_type]', documentType);
  body.append('document[file]', file);

  const response = await request<DocumentResponse>(collectionPath(schoolId), {
    method: 'POST',
    body,
  });

  return response.data;
};

/** DELETE /api/v1/schools/:school_id/documents/:id — soft delete, like every discard here. */
export const deleteDocument = (schoolId: number, id: number) =>
  request<null>(`${collectionPath(schoolId)}/${id}`, { method: 'DELETE' });

/**
 * The blueprint returns `file_url` as a host-relative path (`only_path: true`), so it needs the
 * API origin prepended before it can be opened from the SPA, which is served elsewhere in dev.
 */
export const documentDownloadUrl = (document: SchoolDocument) =>
  document.file_url ? `${API_BASE_URL}${document.file_url}` : null;
