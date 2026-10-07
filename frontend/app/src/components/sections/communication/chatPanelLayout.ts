/**
 * Shared height for the two `StaffCommunication` chat columns — the capped conversation list on
 * the left and the thread pane on the right.
 *
 * Measured live (1440x900, a staff inbox row with a wrapped sender_line + detail + preview
 * line): a `ConversationRow` renders ~102px tall, and the list's flex `gap` between rows is 12px
 * (spacing(1.5)). Five rows plus four gaps is `CHAT_PANEL_HEIGHT_PX` below — the single source
 * both `StaffCommunication.tsx` (the list's scroll cap) and `ChatColumns.tsx` (the thread pane's
 * fixed height) read from, so the two columns always render as one matched pair instead of two
 * independently-tuned numbers that happen to agree today and drift tomorrow. Change the row
 * count or re-measure here, not in either consumer.
 */
export const CONVERSATION_ROW_HEIGHT_PX = 102;
export const CONVERSATION_ROW_GAP_PX = 12;
export const VISIBLE_CONVERSATION_ROWS = 5;

export const CHAT_PANEL_HEIGHT_PX =
  VISIBLE_CONVERSATION_ROWS * CONVERSATION_ROW_HEIGHT_PX +
  (VISIBLE_CONVERSATION_ROWS - 1) * CONVERSATION_ROW_GAP_PX;
