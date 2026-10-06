import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { listMessages } from 'services/communicationApi';
import { ConversationMessage } from 'types/communication';

/**
 * Messages for the open conversation.
 *
 * A send that creates the conversation already has the new message in hand. Remembering that
 * id keeps a later load — including a refresh when the window or tab regains focus — from
 * replacing it with an empty fetch that has not caught up yet. The focus refresh does not
 * consult `loadedFor`, so an open thread still picks up messages that arrived while the tab
 * was in the background.
 */
export const useThreadMessages = (schoolId: number | null, conversationId: number | null) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadedFor = useRef<number | null>(null);
  const pendingIds = useRef<Set<number>>(new Set());
  const conversationRef = useRef<number | null>(conversationId);
  conversationRef.current = conversationId;

  const mergeMessages = useCallback((incoming: ConversationMessage[]) => {
    const incomingIds = new Set(incoming.map((item) => item.id));

    setMessages((current) => {
      const kept = current.filter(
        (item) => pendingIds.current.has(item.id) && !incomingIds.has(item.id),
      );
      if (incoming.length === 0 && kept.length > 0) {
        return kept;
      }

      return kept.length > 0 ? [...incoming, ...kept] : incoming;
    });

    incoming.forEach((item) => pendingIds.current.delete(item.id));
  }, []);

  const fetchMessages = useCallback(
    async (id: number, background: boolean) => {
      if (schoolId == null) {
        return;
      }

      if (!background) {
        setLoading(true);
      }
      setError('');

      try {
        const response = await listMessages(schoolId, id);
        if (conversationRef.current !== id) {
          return;
        }

        mergeMessages(response.data);
      } catch (err) {
        if (conversationRef.current !== id) {
          return;
        }

        setError(err instanceof ApiError ? err.message : t('communication.loadError'));
        if (!background) {
          setMessages((current) =>
            current.some((item) => pendingIds.current.has(item.id)) ? current : [],
          );
        }
      } finally {
        if (!background && conversationRef.current === id) {
          setLoading(false);
        }
      }
    },
    [schoolId, t, mergeMessages],
  );

  useEffect(() => {
    if (schoolId == null || conversationId == null) {
      loadedFor.current = null;
      pendingIds.current.clear();
      setMessages([]);
      setLoading(false);
      setError('');
      return;
    }

    if (loadedFor.current === conversationId) {
      return;
    }

    pendingIds.current.clear();
    loadedFor.current = conversationId;
    setMessages([]);
    void fetchMessages(conversationId, false);
  }, [schoolId, conversationId, fetchMessages]);

  useEffect(() => {
    if (schoolId == null || conversationId == null) {
      return;
    }

    const refresh = () => {
      void fetchMessages(conversationId, true);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [schoolId, conversationId, fetchMessages]);

  const rememberSent = useCallback((id: number, message: ConversationMessage) => {
    loadedFor.current = id;
    pendingIds.current.add(message.id);
    setError('');
    setMessages((current) =>
      current.some((item) => item.id === message.id) ? current : [...current, message],
    );
  }, []);

  const retry = useCallback(() => {
    if (conversationId == null) {
      return;
    }

    loadedFor.current = conversationId;
    void fetchMessages(conversationId, false);
  }, [conversationId, fetchMessages]);

  return { messages, loading, error, rememberSent, retry };
};
