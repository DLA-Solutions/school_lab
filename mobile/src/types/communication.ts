/** Family chat (`docs/api/v1/communication.md` § Family chat). */

export type ConversationAudience = 'coordination' | 'secretary' | 'director' | 'teacher';

/**
 * One inbox row of `GET /communication/conversations`.
 *
 * `sender_line` is the family identity, and null when the conversation has no message yet.
 * `teacher_name` is set only when `audience` is `teacher`.
 */
export interface Conversation {
  id: number;
  student_id: number;
  student_name: string;
  audience: ConversationAudience;
  teacher_id: number | null;
  teacher_name: string | null;
  last_message_at: string | null;
  last_message_body: string | null;
  school_class_id: number | null;
  sender_line: string | null;
  /**
   * False when the child is no longer enrolled. Absent is not closed — only an explicit
   * `false` closes the chat. The thread uses `meta.student_active` from the messages route.
   */
  student_active?: boolean;
}

/** Page envelope for `GET /communication/conversations`. */
export interface ConversationPageMeta {
  page: number;
  per_page: number;
  total: number;
}

/** `meta` of `GET /communication/conversations/:id/messages`. */
export interface MessagesPageMeta extends ConversationPageMeta {
  /** Same meaning as `Conversation.student_active`. History is still returned when false. */
  student_active?: boolean;
}

/**
 * One row of `GET /communication/conversations/:id/messages`, in `sent_at` order.
 * The blueprint fields are `id`, `sender_membership_id`, `sender_line`, `body`, and `sent_at`.
 * Any other string property is left on the object so a future absolute image URL can render.
 */
export interface ConversationMessage {
  id: number;
  sender_membership_id: number;
  sender_line: string;
  body: string;
  sent_at: string;
}

export interface SendMessagePayload {
  student_id: number;
  audience: ConversationAudience;
  /** Sent only when `audience` is `teacher`. */
  teacher_id?: number | null;
  body: string;
}

/** `201` from `POST /communication/messages`. */
export interface SentMessage {
  conversation_id: number;
  message: ConversationMessage;
}
