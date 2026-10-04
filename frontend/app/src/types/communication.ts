/** A child the caller may write to. The thread row itself may not exist yet. */
export interface FamilyThread {
  student_id: number;
  student_name: string;
  school_class_id: number | null;
  conversation_id: number | null;
  last_message_at: string | null;
}

export type MessageKind = 'text' | 'routine';

/** One line on a family thread. A routine card points at the day record; the body stays empty. */
export interface ThreadMessage {
  id: number;
  conversation_id: number;
  sender_membership_id: number;
  body: string | null;
  kind: MessageKind;
  daily_routine_id: number | null;
  attachment_ids: number[];
  sent_at: string;
}

/** The upload held until a message or a routine claims it. */
export interface CommunicationAttachment {
  id: number;
  content_type: string;
  byte_size: number;
}

export interface CommunicationList<T> {
  data: T[];
  meta: { page: number; per_page: number; total: number };
}
