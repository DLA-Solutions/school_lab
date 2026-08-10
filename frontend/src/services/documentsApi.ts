import { DocumentListResponse, DocumentResponse, SchoolDocument } from 'types/document';
import { apiAssetUrl, request } from './api';

const collectionPath = (schoolId: number) => `/api/v1/schools/${schoolId}/documents`;

/** The owners a personal document can hang off — mirrors `Document::DOCUMENTABLE_TYPES`. */
export type DocumentableType = 'Guardian' | 'Student' | 'Teacher';

/**
 * Personal-document kinds a school collects. Free text on the API side; `label` is a catalogue
 * key, resolved where it is shown so the list reads in the user's language.
 */
export const PERSONAL_DOCUMENT_TYPES = [
  { value: 'cpf', label: 'document.type.cpf' },
  { value: 'rg', label: 'document.type.rg' },
  { value: 'proof_of_address', label: 'document.type.proof_of_address' },
  { value: 'proof_of_income', label: 'document.type.proof_of_income' },
  { value: 'other', label: 'document.type.other' },
] as const;

/** What a collaborator's file is usually called, on top of the shared kinds. */
export const COLLABORATOR_DOCUMENT_TYPES = [
  ...PERSONAL_DOCUMENT_TYPES.filter((type) => type.value !== 'proof_of_income'),
  { value: 'employment_contract', label: 'document.type.employment_contract' },
  { value: 'diploma', label: 'document.type.diploma' },
] as const;

/**
 * The catalogue key for a stored document type, or `null` when the API carries one this build
 * does not know — the raw value is shown then, which is better than an empty cell.
 */
export const documentTypeKey = (value: string) =>
  [...PERSONAL_DOCUMENT_TYPES, ...COLLABORATOR_DOCUMENT_TYPES].find(
    (type) => type.value === value,
  )?.label ?? null;

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

/** The blueprint returns `file_url` host-relative; `apiAssetUrl` puts the API origin back on. */
export const documentDownloadUrl = (document: SchoolDocument) => apiAssetUrl(document.file_url);
