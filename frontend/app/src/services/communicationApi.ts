import {
  CommunicationDestination,
  Conversation,
  ConversationAudience,
  ConversationMessage,
  SendMessagePayload,
  SentMessage,
} from 'types/communication';
import { request } from './api';

const base = (schoolId: number) => `/api/v1/schools/${schoolId}/communication`;

/** GET /communication/destinations?student_id= — offices and the teachers of that child's class. */
export const listDestinations = (schoolId: number, studentId: number) =>
  request<{ data: CommunicationDestination[] }>(
    `${base(schoolId)}/destinations?student_id=${studentId}`,
  );

/**
 * GET /communication/conversations — the signed-in actor's inbox.
 *
 * `audience=coordination` is coordination's "For me" list. Omit it for every conversation
 * that actor may see.
 */
export const listConversations = (schoolId: number, audience?: ConversationAudience) => {
  const query = new URLSearchParams();
  if (audience) {
    query.set('audience', audience);
  }
  const suffix = query.toString();

  return request<{ data: Conversation[] }>(
    `${base(schoolId)}/conversations${suffix ? `?${suffix}` : ''}`,
  );
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
