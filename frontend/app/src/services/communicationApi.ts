import { request, requestBlob } from './api';
import {
  CommunicationAttachment,
  CommunicationList,
  FamilyThread,
  ThreadMessage,
} from 'types/communication';

export type MessageAudience = 'teacher' | 'guardian';

/** Who may download. Coordination reads a routine's file on the staff path; they cannot post. */
export type AttachmentReader = 'staff' | 'guardian';

const staffBase = (schoolId: number) => `/api/v1/schools/${schoolId}/communication`;
const familyBase = (schoolId: number) => `/api/v1/schools/${schoolId}/me`;

const baseFor = (schoolId: number, audience: MessageAudience | AttachmentReader) =>
  audience === 'guardian' ? familyBase(schoolId) : staffBase(schoolId);

const everyPage = async <T>(load: (page: number) => Promise<CommunicationList<T>>) => {
  const first = await load(1);
  const rows = [...first.data];
  const pageSize = first.meta.per_page || first.data.length || 1;
  const pageCount = Math.ceil(first.meta.total / pageSize);

  for (let page = 2; page <= pageCount && page <= 20; page += 1) {
    const next = await load(page);
    rows.push(...next.data);
  }

  return rows;
};

const paged = (path: string, page: number) => {
  const join = path.includes('?') ? '&' : '?';
  return `${path}${join}page=${page}&limit=100`;
};

/**
 * Children the teacher currently teaches. The path key on the messages below is the student id:
 * the thread row is created on the first send, and this list does not create it.
 */
export const listThreads = (schoolId: number, audience: MessageAudience) =>
  everyPage<FamilyThread>((page) =>
    request<CommunicationList<FamilyThread>>(paged(`${baseFor(schoolId, audience)}/conversations`, page)),
  );

export const listMessages = (schoolId: number, studentId: number, audience: MessageAudience) =>
  everyPage<ThreadMessage>((page) =>
    request<CommunicationList<ThreadMessage>>(
      paged(`${baseFor(schoolId, audience)}/conversations/${studentId}/messages`, page),
    ),
  );

export interface PostMessageInput {
  body?: string;
  attachmentIds?: number[];
  clientRequestId?: string;
}

export const postMessage = async (
  schoolId: number,
  studentId: number,
  audience: MessageAudience,
  input: PostMessageInput,
) => {
  const response = await request<{ data: ThreadMessage }>(
    `${baseFor(schoolId, audience)}/conversations/${studentId}/messages`,
    {
      method: 'POST',
      body: {
        body: input.body,
        attachment_ids: input.attachmentIds ?? [],
        client_request_id: input.clientRequestId,
      },
    },
  );

  return response.data;
};

export interface ClassNoticeInput {
  schoolClassId: number;
  body?: string;
  attachmentIds?: number[];
  clientRequestId?: string;
}

/** One text copied into each enrolled child's own thread. */
export const postClassNotice = async (schoolId: number, input: ClassNoticeInput) => {
  const response = await request<{ data: ThreadMessage[] }>(
    `${staffBase(schoolId)}/class_notices`,
    {
      method: 'POST',
      body: {
        school_class_id: input.schoolClassId,
        body: input.body,
        attachment_ids: input.attachmentIds ?? [],
        client_request_id: input.clientRequestId,
      },
    },
  );

  return response.data;
};

export const uploadAttachment = async (
  schoolId: number,
  audience: MessageAudience,
  file: File,
) => {
  const body = new FormData();
  body.append('file', file);

  const response = await request<{ data: CommunicationAttachment }>(
    `${baseFor(schoolId, audience)}/attachments`,
    { method: 'POST', body },
  );

  return response.data;
};

export const fetchAttachment = (schoolId: number, id: number, audience: AttachmentReader) =>
  requestBlob(`${baseFor(schoolId, audience)}/attachments/${id}`);

export const newClientRequestId = () =>
  globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
