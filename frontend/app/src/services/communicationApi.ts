import {
  CommunicationDestination,
  CommunicationRosterItem,
  Conversation,
  ConversationAudience,
  ConversationMessage,
  ConversationPageMeta,
  SendMessagePayload,
  SentMessage,
} from 'types/communication';
import { request } from './api';

const base = (schoolId: number) => `/api/v1/schools/${schoolId}/communication`;

/** A miscounted `total` must not walk forever. 40 pages is 1,000 threads at the default size. */
const MAX_CONVERSATION_PAGES = 40;

/** GET /communication/destinations?student_id= — offices and the teachers of that child's class. */
export const listDestinations = (schoolId: number, studentId: number) =>
  request<{ data: CommunicationDestination[] }>(
    `${base(schoolId)}/destinations?student_id=${studentId}`,
  );

/**
 * GET /communication/conversations — every page of the signed-in actor's inbox.
 *
 * The server pages at 25. Stopping on the first page would hide a thread a bell deep-link
 * names. `audience=coordination` is coordination's "For me" list. Omit it for every
 * conversation that actor may see.
 */
export const listConversations = async (
  schoolId: number,
  audience?: ConversationAudience,
): Promise<{ data: Conversation[] }> => {
  const collected: Conversation[] = [];
  let page = 1;

  for (let guard = 0; guard < MAX_CONVERSATION_PAGES; guard += 1) {
    const query = new URLSearchParams({ page: String(page) });
    if (audience) {
      query.set('audience', audience);
    }

    const response = await request<{ data: Conversation[]; meta?: ConversationPageMeta }>(
      `${base(schoolId)}/conversations?${query}`,
    );
    const batch = response.data ?? [];
    collected.push(...batch);

    const meta = response.meta;
    if (!meta) {
      break;
    }

    const perPage = meta.per_page > 0 ? meta.per_page : batch.length;
    const shortPage = perPage === 0 || batch.length < perPage;
    if (shortPage || collected.length >= meta.total || batch.length === 0) {
      break;
    }

    page = (meta.page > 0 ? meta.page : page) + 1;
  }

  return { data: collected };
};

/**
 * GET /communication/roster?school_class_id= — the students in that class, so the school can
 * write the first message. This is not the inbox.
 */
export const listRoster = (schoolId: number, schoolClassId: number) => {
  const query = new URLSearchParams({ school_class_id: String(schoolClassId) });

  return request<{ data: CommunicationRosterItem[] }>(`${base(schoolId)}/roster?${query}`);
};

/** GET /communication/conversations/:id/messages — `sent_at` order. */
export const listMessages = (schoolId: number, conversationId: number) =>
  request<{ data: ConversationMessage[] }>(
    `${base(schoolId)}/conversations/${conversationId}/messages`,
  );

/**
 * POST /communication/messages — find or create the conversation, then append the message.
 *
 * `teacher_id` goes on the wire only for a teacher destination.
 */
export const sendMessage = async (
  schoolId: number,
  payload: SendMessagePayload,
): Promise<SentMessage> => {
  const body: Record<string, unknown> = {
    student_id: payload.student_id,
    audience: payload.audience,
    body: payload.body,
  };
  if (payload.audience === 'teacher') {
    body.teacher_id = payload.teacher_id;
  }

  const response = await request<{ data: SentMessage }>(`${base(schoolId)}/messages`, {
    method: 'POST',
    body,
  });

  return response.data;
};
