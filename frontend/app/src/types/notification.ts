/** GET /api/v1/notifications */
export interface AppNotification {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  created_at: string;
  read: boolean;
  school_id: number;
  contract_id: number | null;
  /** Set when `kind` is `message`, so the bell can open that chat. Null for every other kind. */
  conversation_id: number | null;
}
