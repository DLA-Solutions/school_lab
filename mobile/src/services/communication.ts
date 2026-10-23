import { ApiError, request } from './api';
import {
  Conversation,
  ConversationMessage,
  ConversationPageMeta,
  MessagesPageMeta,
  SendMessagePayload,
  SentMessage,
} from '../types/communication';

const communicationPath = (schoolId: number) => `/schools/${schoolId}/communication`;

/**
 * A miscounted `total` must not walk forever. 40 pages is 1,000 rows at the server page size
 * of 25 (`web/config/initializers/pagy.rb`). Same ceiling as the school SPA inbox walker.
 */
const MAX_PAGES = 40;

const pagePath = (path: string, page: number) => {
  const query = new URLSearchParams({ page: String(page) });
  return `${path}?${query.toString()}`;
};

const readPage = async <T, M>(path: string): Promise<{ data: T[]; meta?: M }> => {
  const response = await request<{ data?: T[]; meta?: M }>(path);

  if (!response || !Array.isArray(response.data)) {
    throw new ApiError(200, 'unexpected_error', 'Request failed', {});
  }

  return { data: response.data, meta: response.meta };
};

/**
 * Walks `page` 1, then 2, … and concatenates. Stops on a short page, an empty page, or once
 * `collected` reaches `meta.total`. Does not reverse.
 */
const walkPages = async <T, M extends ConversationPageMeta>(
  pathForPage: (page: number) => string,
  onMeta?: (meta: M | undefined) => void,
): Promise<T[]> => {
  const collected: T[] = [];
  let page = 1;

  for (let guard = 0; guard < MAX_PAGES; guard += 1) {
    const response = await readPage<T, M>(pathForPage(page));
    collected.push(...response.data);
    onMeta?.(response.meta);

    const meta = response.meta;
    if (!meta) {
      break;
    }

    const perPage = meta.per_page > 0 ? meta.per_page : response.data.length;
    const shortPage = perPage === 0 || response.data.length < perPage;
    if (shortPage || collected.length >= meta.total || response.data.length === 0) {
      break;
    }

    page = (meta.page > 0 ? meta.page : page) + 1;
  }

  return collected;
};

/**
 * GET /schools/:school_id/communication/conversations — every page the actor may see.
 * `audience` is omitted so a later page is not dropped from a filtered "for me" list.
 */
export const listConversations = (schoolId: number): Promise<Conversation[]> =>
  walkPages<Conversation, ConversationPageMeta>((page) =>
    pagePath(`${communicationPath(schoolId)}/conversations`, page),
  );

/**
 * GET /schools/:school_id/communication/conversations/:id/messages.
 * Pages are concatenated in `sent_at` order (page 1, then 2, …). `studentActive` is set only
 * when a page sends a boolean; an explicit `false` is kept if a later page omits the flag.
 */
export const listMessages = async (
  schoolId: number,
  conversationId: number,
): Promise<{ data: ConversationMessage[]; studentActive: boolean | undefined }> => {
  let studentActive: boolean | undefined;

  const data = await walkPages<ConversationMessage, MessagesPageMeta>(
    (page) => pagePath(`${communicationPath(schoolId)}/conversations/${conversationId}/messages`, page),
    (meta) => {
      if (typeof meta?.student_active === 'boolean') {
        studentActive = studentActive === false ? false : meta.student_active;
      }
    },
  );

  return { data, studentActive };
};

/**
 * POST /schools/:school_id/communication/messages.
 * `teacher_id` is included only for a teacher audience. A second send appends; the API does
 * not create another conversation for the same child and destination.
 */
export const sendMessage = async (schoolId: number, payload: SendMessagePayload): Promise<SentMessage> => {
  const body: {
    student_id: number;
    audience: SendMessagePayload['audience'];
    body: string;
    teacher_id?: number | null;
  } = {
    student_id: payload.student_id,
    audience: payload.audience,
    body: payload.body,
  };

  if (payload.audience === 'teacher') {
    body.teacher_id = payload.teacher_id ?? null;
  }

  const response = await request<{ data?: SentMessage }>(`${communicationPath(schoolId)}/messages`, {
    method: 'POST',
    body,
  });

  if (!response?.data?.message || typeof response.data.conversation_id !== 'number') {
    throw new ApiError(201, 'unexpected_error', 'Request failed', {});
  }

  return response.data;
};
