import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../components/EmptyState';
import { t } from '../i18n';
import { MessagesStackParamList } from '../navigation/types';
import { useGuardianContext } from '../providers/GuardianContext';
import { ApiError } from '../services/api';
import { listConversations } from '../services/communication';
import { colors } from '../theme/colors';
import { Conversation } from '../types/communication';
import { audienceLabel } from '../utils/conversationAudience';

type Props = NativeStackScreenProps<MessagesStackParamList, 'Inbox'>;

type InboxPhase = 'loading' | 'ready' | 'not_found' | 'error' | 'offline';

/** Display guard. Family isolation stays on the API; this only keeps the active child. */
const forActiveChild = (rows: Conversation[], studentId: number): Conversation[] =>
  rows.filter((row) => row != null && row.student_id === studentId && typeof row.id === 'number');

const MessagesScreen = ({ navigation }: Props) => {
  const { activeSchoolId, activeStudentId, generation } = useGuardianContext();
  const [phase, setPhase] = useState<InboxPhase>('loading');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const requestSeq = useRef(0);

  const contextKey = `${generation}:${activeSchoolId ?? ''}:${activeStudentId ?? ''}`;
  const contextKeyRef = useRef(contextKey);
  contextKeyRef.current = contextKey;
  const [seenContextKey, setSeenContextKey] = useState(contextKey);
  if (seenContextKey !== contextKey) {
    setSeenContextKey(contextKey);
    setConversations([]);
    setPhase('loading');
    setRefreshing(false);
  }

  const loadInbox = useCallback(
    async (kind: 'focus' | 'refresh') => {
      const schoolId = activeSchoolId;
      const studentId = activeStudentId;
      const requestContext = `${generation}:${schoolId ?? ''}:${studentId ?? ''}`;
      const seq = ++requestSeq.current;

      if (schoolId == null || studentId == null) {
        if (contextKeyRef.current === requestContext && requestSeq.current === seq) {
          setConversations([]);
          setPhase('ready');
          setRefreshing(false);
        }
        return;
      }

      if (kind === 'focus') {
        setConversations([]);
        setPhase('loading');
        setRefreshing(false);
      } else {
        setRefreshing(true);
      }

      const apply = (nextPhase: InboxPhase, nextRows: Conversation[]) => {
        if (requestSeq.current !== seq || contextKeyRef.current !== requestContext) {
          return;
        }
        setConversations(nextRows);
        setPhase(nextPhase);
        setRefreshing(false);
      };

      try {
        const rows = await listConversations(schoolId);
        apply('ready', forActiveChild(rows, studentId));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          apply('not_found', []);
          return;
        }
        if (err instanceof ApiError) {
          apply('error', []);
          return;
        }
        apply('offline', []);
      }
    },
    [activeSchoolId, activeStudentId, generation],
  );

  useFocusEffect(
    useCallback(() => {
      void loadInbox('focus');

      return () => {
        requestSeq.current += 1;
      };
    }, [loadInbox]),
  );

  const openThread = (conversationId: number) => {
    navigation.navigate('Thread', { conversationId });
  };

  return (
    <View style={styles.screen}>
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
              void loadInbox('focus');
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>{t('messages.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {phase === 'ready' ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={conversations.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState messageKey="empty.messages" />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadInbox('refresh');
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const preview = item.last_message_body;
            const showPreview = typeof preview === 'string' && preview.trim().length > 0;
            const senderLine = item.sender_line?.trim() ? item.sender_line : null;

            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => openThread(item.id)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={styles.audience}>{audienceLabel(item.audience, item.teacher_name)}</Text>
                {senderLine ? (
                  <Text style={styles.sender} numberOfLines={2}>
                    {senderLine}
                  </Text>
                ) : null}
                {showPreview ? (
                  <Text style={styles.preview} numberOfLines={3}>
                    {preview}
                  </Text>
                ) : null}
              </Pressable>
            );
          }}
        />
      ) : null}
    </View>
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
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  row: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  rowPressed: {
    opacity: 0.7,
  },
  audience: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  sender: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  preview: {
    color: colors.textPrimary,
    fontSize: 16,
  },
});

export default MessagesScreen;
