/**
 * Scroll cap for the two independently-scrollable boxes inside `StaffCommunication`'s list
 * column — the browse-by-class roster box and the inbox/search-results box — and, on a phone,
 * the fixed height of the single-pane thread view in `ChatColumns.tsx` (there is no sibling list
 * column to stretch to match at that width, so it keeps an explicit bound).
 *
 * On a computer the thread column no longer reads this constant: its height comes from CSS Grid
 * stretching it to match the list column's actual rendered height (scope toggles, buttons, the
 * Turma select, these two scroll boxes, the search field — everything the list stacks, which is
 * taller than either scroll box alone). See the comment in `ChatColumns.tsx` for that part.
 *
 * Measured live (1440x900, a staff inbox row with a wrapped sender_line + detail + preview
 * line): a `ConversationRow` renders ~102px tall, and the list's flex `gap` between rows is 12px
 * (spacing(1.5)). Five rows plus four gaps is `CHAT_PANEL_HEIGHT_PX` below. Change the row count
 * or re-measure here, not in either consumer.
 */
export const CONVERSATION_ROW_HEIGHT_PX = 102;
export const CONVERSATION_ROW_GAP_PX = 12;
export const VISIBLE_CONVERSATION_ROWS = 5;

export const CHAT_PANEL_HEIGHT_PX =
  VISIBLE_CONVERSATION_ROWS * CONVERSATION_ROW_HEIGHT_PX +
  (VISIBLE_CONVERSATION_ROWS - 1) * CONVERSATION_ROW_GAP_PX;
