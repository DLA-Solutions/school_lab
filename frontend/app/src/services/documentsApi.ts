import {
  DocumentListResponse,
  DocumentResponse,
  GuardianDocument,
  GuardianDocumentListResponse,
  GuardianDocumentResponse,
  SchoolDocument,
} from 'types/document';
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

/** The guardian's own side of the archive ("Meus documentos"), shared with the co-guardians. */
const minePath = (schoolId: number) => `/api/v1/schools/${schoolId}/me/documents`;

/**
 * What a guardian may send, in the order the form offers it — mirrors the API's closed list.
 * `label` is a catalogue key, resolved where it is shown.
 */
export const GUARDIAN_DOCUMENT_TYPES = [
  { value: 'address_proof', label: 'myDocuments.type.address_proof' },
  { value: 'vaccination_card', label: 'myDocuments.type.vaccination_card' },
  { value: 'medical_report', label: 'myDocuments.type.medical_report' },
  { value: 'school_transfer', label: 'myDocuments.type.school_transfer' },
  { value: 'other', label: 'myDocuments.type.other' },
] as const;

/** What the API accepts, checked here too so a wrong file is refused before the upload starts. */
export const GUARDIAN_DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const GUARDIAN_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/** GET /api/v1/schools/:school_id/me/documents, optionally narrowed to one linked child. */
export const listMyDocuments = (
  schoolId: number,
  { studentId, page = 1 }: { studentId?: number | null; page?: number } = {},
) => {
  const params = new URLSearchParams();
  if (studentId) params.set('student_id', String(studentId));
  if (page > 1) params.set('page', String(page));

  const encoded = params.toString();

  return request<GuardianDocumentListResponse>(`${minePath(schoolId)}${encoded ? `?${encoded}` : ''}`);
};

/**
 * POST /api/v1/schools/:school_id/me/documents as multipart. Unlike the staff endpoint the fields
 * are flat, and the API has no title: the type and the child say what the file is.
 */
export const uploadMyDocument = async (
  schoolId: number,
  { studentId, documentType, file }: { studentId: number; documentType: string; file: File },
): Promise<GuardianDocument> => {
  const body = new FormData();
  body.append('student_id', String(studentId));
  body.append('document_type', documentType);
  body.append('file', file);

  const response = await request<GuardianDocumentResponse>(minePath(schoolId), {
    method: 'POST',
    body,
  });

  return response.data;
};

/** The signed Active Storage URL downloads without a bearer token, so it opens in a new tab. */
export const guardianDocumentUrl = (document: GuardianDocument) => apiAssetUrl(document.file_url);
