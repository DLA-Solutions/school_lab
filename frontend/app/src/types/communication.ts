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
 * The list is paginated (`data` + `meta`). `sender_line` is always the family identity
 * ("Diego, pai da Lara — 1º ano"), not whoever spoke last. `teacher_name` is set only when
 * `audience` is `teacher`.
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
  sender_line: string;
}

/** Page envelope for `GET /communication/conversations`. */
export interface ConversationPageMeta {
  page: number;
  per_page: number;
  total: number;
}

/** One row of `GET /communication/conversations/:id/messages`, in `sent_at` order. */
export interface ConversationMessage {
  id: number;
  sender_membership_id: number;
  /** Whoever spoke: the guardian line, or the staff role / teacher name. */
  sender_line: string;
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

/**
 * One student on `GET /communication/roster?school_class_id=` or `GET /communication/search?q=`.
 *
 * Used only to start a thread that does not exist yet. `conversation_id` and `sender_line` are
 * null until someone has written. A teacher's row includes `teacher_id` (that teacher) even then.
 * Secretary and coordination rows have `teacher_id` null. A director's row lists `destinations`
 * and keeps `conversation_id` null.
 */
export interface CommunicationRosterItem {
  student_id: number;
  student_name: string;
  school_class_id: number;
  conversation_id: number | null;
  sender_line: string | null;
  /** The signed-in teacher. Null for secretary and coordination. Omitted for a director. */
  teacher_id?: number | null;
  destinations?: CommunicationDestination[];
  /**
   * Present only on `/search` rows (undefined on `/roster` rows). That student's kept guardians,
   * ordered father, then mother, then other.
   */
  guardians?: { name: string; relationship: 'father' | 'mother' | 'other' }[];
}
