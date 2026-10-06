/** Family chat (`docs/api/v1/communication.md` § Family chat). */

export type ConversationAudience = 'coordination' | 'secretary' | 'teacher';

/**
 * One row of `GET /communication/destinations`.
 *
 * Coordination and secretary are always present. Each teacher of the child's current class is
 * one object (`teacher_id`, `name`), even when they teach two subjects. `name` is null for the
 * two offices — the screen labels those from the catalogue.
 */
export interface CommunicationDestination {
  audience: ConversationAudience;
  teacher_id: number | null;
  name: string | null;
}

/**
 * One inbox row of `GET /communication/conversations`.
 *
 * `sender_line` is the guardian line the API derives at read time
 * ("Diego, pai da Lara — 1º ano"). `school_class_id` is the child's current class, also derived
 * at read time, so a teacher with more than one class can narrow the list.
 */
export interface Conversation {
  id: number;
  student_id: number;
  audience: ConversationAudience;
  teacher_id: number | null;
  last_message_at: string | null;
  school_class_id: number | null;
  sender_line: string;
}

/** One row of `GET /communication/conversations/:id/messages`, in `sent_at` order. */
export interface ConversationMessage {
  id: number;
  sender_membership_id: number;
  body: string;
  sent_at: string;
}

export interface SendMessagePayload {
  student_id: number;
  audience: ConversationAudience;
  /** Present only when `audience` is `teacher`. */
  teacher_id?: number | null;
  body: string;
}

/** `201` from `POST /communication/messages`: the conversation (existing or just created) and the message. */
export interface SentMessage {
  conversation_id: number;
  message: ConversationMessage;
}
