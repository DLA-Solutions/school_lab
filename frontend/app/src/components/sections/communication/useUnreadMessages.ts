import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { markNotificationRead } from 'services/notificationsApi';
import { AppNotification } from 'types/notification';

export interface UnreadMessageNotice {
  id: number;
  conversationId: number;
}

/** Unread bell rows that point at a chat. Other kinds stay in the topbar. */
export const unreadMessageNotices = (notifications: AppNotification[]): UnreadMessageNotice[] =>
  notifications
    .filter(
      (notification) =>
        notification.kind === 'message' &&
        !notification.read &&
        notification.conversation_id != null,
    )
    .map((notification) => ({
      id: notification.id,
      conversationId: notification.conversation_id as number,
    }));

/**
 * Opening a thread marks each unread message notification for that conversation and drops
 * the chip. The ref blocks a second PATCH if the effect runs again before state settles.
 */
export const useMarkOpenConversationRead = (
  notices: UnreadMessageNotice[],
  setNotices: Dispatch<SetStateAction<UnreadMessageNotice[]>>,
  conversationId: number | null,
) => {
  const marking = useRef(new Set<number>());

  useEffect(() => {
    if (conversationId == null) {
      return;
    }

    const pending = notices.filter(
      (notice) => notice.conversationId === conversationId && !marking.current.has(notice.id),
    );
    if (pending.length === 0) {
      return;
    }

    pending.forEach((notice) => marking.current.add(notice.id));
    setNotices((current) => current.filter((notice) => notice.conversationId !== conversationId));
    pending.forEach((notice) => {
      void markNotificationRead(notice.id);
    });
  }, [conversationId, notices, setNotices]);
};
