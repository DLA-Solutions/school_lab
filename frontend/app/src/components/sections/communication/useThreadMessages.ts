import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { listMessages } from 'services/communicationApi';
import { ConversationMessage } from 'types/communication';

/**
 * Messages for the open conversation.
 *
 * A send that creates the conversation already has the new message in hand. Remembering that id
 * keeps the following load from replacing it with an empty fetch that has not caught up yet.
 */
export const useThreadMessages = (schoolId: number | null, conversationId: number | null) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadedFor = useRef<number | null>(null);

  const fetchMessages = useCallback(
    async (id: number) => {
      if (schoolId == null) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await listMessages(schoolId, id);
        setMessages(response.data);
      } catch (err) {
        setMessages([]);
        setError(err instanceof ApiError ? err.message : t('communication.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [schoolId, t],
  );

  useEffect(() => {
    if (schoolId == null || conversationId == null) {
      loadedFor.current = null;
      setMessages([]);
      setLoading(false);
      setError('');
      return;
    }

    if (loadedFor.current === conversationId) {
      return;
    }

    loadedFor.current = conversationId;
    setMessages([]);
    void fetchMessages(conversationId);
  }, [schoolId, conversationId, fetchMessages]);

  const rememberSent = useCallback((id: number, message: ConversationMessage) => {
    loadedFor.current = id;
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
    void fetchMessages(conversationId);
  }, [conversationId, fetchMessages]);

  return { messages, loading, error, rememberSent, retry };
};
