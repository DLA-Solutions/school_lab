import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { t } from '../i18n';
import { MessagesStackParamList } from '../navigation/types';
import { useGuardianContext } from '../providers/GuardianContext';
import { ApiError } from '../services/api';
import { listConversations, listMessages, sendMessage } from '../services/communication';
import { colors } from '../theme/colors';
import { Conversation, ConversationMessage } from '../types/communication';
import { audienceLabel } from '../utils/conversationAudience';
import { messageImageUrls } from '../utils/messageImages';

type Props = NativeStackScreenProps<MessagesStackParamList, 'Thread'>;

type ThreadPhase = 'loading' | 'ready' | 'not_found' | 'error' | 'offline';

type SendError = 'empty_content' | 'student_inactive' | 'send' | 'network';

const sendErrorText = (error: SendError): string => {
  switch (error) {
    case 'empty_content':
      return t('messages.emptyContent');
    case 'student_inactive':
      return t('messages.studentInactive');
    case 'network':
      return t('messages.networkError');
    case 'send':
      return t('messages.sendError');
  }
};

const MessageBubble = ({ message }: { message: ConversationMessage }) => {
  const images = messageImageUrls(message);
  const body = typeof message.body === 'string' && message.body.length > 0 ? message.body : null;
  const senderLine =
    typeof message.sender_line === 'string' && message.sender_line.length > 0
      ? message.sender_line
      : null;

  return (
    <View style={styles.message}>
      {senderLine ? <Text style={styles.sender}>{senderLine}</Text> : null}
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {images.map((uri, index) => (
        <Image
          key={`${uri}:${index}`}
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ))}
    </View>
  );
};

const MessageThreadScreen = ({ navigation, route }: Props) => {
  const { conversationId } = route.params;
  const headerHeight = useHeaderHeight();
  const { activeSchoolId, activeStudentId, generation } = useGuardianContext();

  const [phase, setPhase] = useState<ThreadPhase>('loading');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [studentActive, setStudentActive] = useState<boolean | undefined>(undefined);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<SendError | null>(null);

  const requestSeq = useRef(0);
  const sendSeq = useRef(0);
  const pendingSentRef = useRef<ConversationMessage[]>([]);
  const conversationRef = useRef<Conversation | null>(null);
  const listRef = useRef<FlatList<ConversationMessage>>(null);

  const contextKey = `${generation}:${activeSchoolId ?? ''}:${activeStudentId ?? ''}:${conversationId}`;
  const contextKeyRef = useRef(contextKey);
  contextKeyRef.current = contextKey;
  const [seenContextKey, setSeenContextKey] = useState(contextKey);
  if (seenContextKey !== contextKey) {
    pendingSentRef.current = [];
    conversationRef.current = null;
    setSeenContextKey(contextKey);
    setMessages([]);
    setConversation(null);
    setStudentActive(undefined);
    setLookupFailed(false);
    setPhase('loading');
    setRefreshing(false);
    setDraft('');
    setSending(false);
    setSendError(null);
  }

  const closed = studentActive === false;
  const canCompose = phase === 'ready' && !closed && conversation != null && !lookupFailed;

  useEffect(() => {
    navigation.setOptions({
      title: conversation
        ? audienceLabel(conversation.audience, conversation.teacher_name)
        : t('tabs.messages'),
    });
  }, [conversation, navigation]);

  useEffect(() => {
    if (phase !== 'ready' || messages.length === 0) {
      return;
    }
    listRef.current?.scrollToEnd({ animated: false });
  }, [phase, messages]);

  useEffect(() => {
    return () => {
      sendSeq.current += 1;
      pendingSentRef.current = [];
    };
  }, []);

  const loadThread = useCallback(
    async (kind: 'focus' | 'refresh') => {
      const schoolId = activeSchoolId;
      const requestContext = `${generation}:${schoolId ?? ''}:${activeStudentId ?? ''}:${conversationId}`;
      const seq = ++requestSeq.current;

      const stale = () => requestSeq.current !== seq || contextKeyRef.current !== requestContext;

      if (schoolId == null || !Number.isSafeInteger(conversationId) || conversationId <= 0) {
        if (!stale()) {
          pendingSentRef.current = [];
          conversationRef.current = null;
          setMessages([]);
          setConversation(null);
          setStudentActive(undefined);
          setLookupFailed(false);
          setPhase('not_found');
          setRefreshing(false);
        }
        return;
      }

      if (kind === 'focus') {
        setMessages([]);
        setConversation(null);
        setStudentActive(undefined);
        setLookupFailed(false);
        setPhase('loading');
        setRefreshing(false);
        setSendError(null);
      } else {
        setRefreshing(true);
      }

      const [messagesResult, conversationsResult] = await Promise.allSettled([
        listMessages(schoolId, conversationId),
        listConversations(schoolId),
      ]);

      if (stale()) {
        return;
      }

      if (messagesResult.status === 'rejected') {
        pendingSentRef.current = [];
        conversationRef.current = null;
        setMessages([]);
        setConversation(null);
        setStudentActive(undefined);
        setLookupFailed(false);
        setRefreshing(false);
        const err = messagesResult.reason;
        if (err instanceof ApiError && err.status === 404) {
          setPhase('not_found');
          return;
        }
        setPhase(err instanceof ApiError ? 'error' : 'offline');
        return;
      }

      const server = messagesResult.value.data;
      const extras = pendingSentRef.current.filter((item) => !server.some((row) => row.id === item.id));
      pendingSentRef.current = extras;

      const matched =
        conversationsResult.status === 'fulfilled'
          ? (conversationsResult.value.find((row) => row?.id === conversationId) ?? null)
          : conversationRef.current?.id === conversationId
            ? conversationRef.current
            : null;
      conversationRef.current = matched;

      setMessages([...server, ...extras]);
      setConversation(matched);
      setStudentActive(messagesResult.value.studentActive);
      setLookupFailed(matched == null && conversationsResult.status === 'rejected');
      setPhase('ready');
      setRefreshing(false);
    },
    [activeSchoolId, activeStudentId, conversationId, generation],
  );

  useFocusEffect(
    useCallback(() => {
      void loadThread('focus');

      return () => {
        requestSeq.current += 1;
      };
    }, [loadThread]),
  );

  const submit = async () => {
    const schoolId = activeSchoolId;
    const openConversation = conversation;
    const body = draft.trim();
    const requestContext = contextKeyRef.current;

    if (!body || schoolId == null || openConversation == null || closed || sending || !canCompose) {
      return;
    }

    const seq = ++sendSeq.current;
    setSending(true);
    setSendError(null);

    const stillCurrent = () => sendSeq.current === seq && contextKeyRef.current === requestContext;

    try {
      const sent = await sendMessage(schoolId, {
        student_id: openConversation.student_id,
        audience: openConversation.audience,
        teacher_id: openConversation.teacher_id,
        body,
      });

      if (!stillCurrent()) {
        return;
      }

      const message = sent.message;
      if (message && typeof message.id === 'number') {
        pendingSentRef.current = [
          ...pendingSentRef.current.filter((item) => item.id !== message.id),
          message,
        ];
        setMessages((current) =>
          current.some((item) => item.id === message.id) ? current : [...current, message],
        );
      }
      setDraft('');
      setSendError(null);
    } catch (err) {
      if (!stillCurrent()) {
        return;
      }
      if (err instanceof ApiError && err.status === 422 && err.code === 'empty_content') {
        setSendError('empty_content');
        return;
      }
      if (err instanceof ApiError && err.status === 409 && err.code === 'student_inactive') {
        setSendError('student_inactive');
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        pendingSentRef.current = [];
        conversationRef.current = null;
        setMessages([]);
        setConversation(null);
        setPhase('not_found');
        return;
      }
      setSendError(err instanceof ApiError ? 'send' : 'network');
    } finally {
      if (stillCurrent()) {
        setSending(false);
      }
    }
  };

  const showComposer = phase === 'ready';
  const sendDisabled = !canCompose || sending || draft.trim().length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      {phase === 'loading' ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
      ) : null}
      {phase === 'not_found' ? (
        <View style={styles.status}>
          <Text style={styles.statusText}>{t('messages.notFound')}</Text>
        </View>
      ) : null}
      {phase === 'error' || phase === 'offline' ? (
        <View style={styles.status}>
          <Text style={styles.errorText}>
            {phase === 'offline' ? t('messages.networkError') : t('messages.loadError')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void loadThread('focus');
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>{t('messages.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {phase === 'ready' ? (
        <FlatList
          ref={listRef}
          style={styles.list}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={<Text style={styles.statusText}>{t('empty.messages')}</Text>}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadThread('refresh');
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      ) : null}
      {showComposer ? (
        <View style={styles.composer}>
          {closed ? <Text style={styles.notice}>{t('messages.closedEnrollment')}</Text> : null}
          {lookupFailed ? (
            <View>
              <Text style={styles.errorText}>{t('messages.loadError')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void loadThread('focus');
                }}
                style={styles.retryButton}
              >
                <Text style={styles.retryLabel}>{t('messages.retry')}</Text>
              </Pressable>
            </View>
          ) : null}
          {sendError ? <Text style={styles.errorText}>{sendErrorText(sendError)}</Text> : null}
          <View style={styles.composerRow}>
            <TextInput
              value={draft}
              onChangeText={(value) => {
                setDraft(value);
                setSendError(null);
              }}
              placeholder={t('messages.composerPlaceholder')}
              placeholderTextColor={colors.textDisabled}
              editable={canCompose && !sending}
              multiline
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('messages.send')}
              accessibilityState={{ disabled: sendDisabled }}
              disabled={sendDisabled}
              onPress={() => {
                void submit();
              }}
              style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
            >
              <Text style={styles.sendLabel}>{t('messages.send')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
  },
  status: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  message: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  sender: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  body: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: colors.surfaceAlt,
  },
  composer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: 8,
  },
  notice: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 16,
  },
  sendButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default MessageThreadScreen;
