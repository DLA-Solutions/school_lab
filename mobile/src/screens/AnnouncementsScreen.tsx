import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { listAnnouncements } from '../services/announcements';
import { colors } from '../theme/colors';
import { Announcement } from '../types/announcements';
import { displayPublishedAt } from '../utils/format';

type Props = NativeStackScreenProps<MessagesStackParamList, 'Announcements'>;

type FeedPhase = 'loading' | 'ready' | 'unavailable' | 'error' | 'offline';

/**
 * Display guard. School and class targeting stay on the API.
 * Drop a row unless `id` is a safe positive integer.
 * Drop a numeric `school_id` that is not the active school. A missing `school_id` stays:
 * the request was already school-scoped. Class-scoped rows are not filtered here.
 */
const forActiveSchool = (rows: Announcement[], schoolId: number): Announcement[] =>
  rows.filter(
    (row) =>
      row != null &&
      typeof row.id === 'number' &&
      Number.isSafeInteger(row.id) &&
      row.id > 0 &&
      (typeof row.school_id !== 'number' || row.school_id === schoolId),
  );

const textOrEmpty = (value: unknown): string => (typeof value === 'string' ? value : '');

const AnnouncementsScreen = ({ navigation }: Props) => {
  const { activeSchoolId, activeStudentId, generation } = useGuardianContext();
  const [phase, setPhase] = useState<FeedPhase>('loading');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const requestSeq = useRef(0);

  const contextKey = `${generation}:${activeSchoolId ?? ''}:${activeStudentId ?? ''}`;
  const contextKeyRef = useRef(contextKey);
  contextKeyRef.current = contextKey;
  const [seenContextKey, setSeenContextKey] = useState(contextKey);
  if (seenContextKey !== contextKey) {
    setSeenContextKey(contextKey);
    setAnnouncements([]);
    setPhase('loading');
    setRefreshing(false);
  }

  const loadFeed = useCallback(
    async (kind: 'focus' | 'refresh') => {
      const schoolId = activeSchoolId;
      const requestContext = `${generation}:${schoolId ?? ''}:${activeStudentId ?? ''}`;
      const seq = ++requestSeq.current;

      if (schoolId == null) {
        if (contextKeyRef.current === requestContext && requestSeq.current === seq) {
          setAnnouncements([]);
          setPhase('ready');
          setRefreshing(false);
        }
        return;
      }

      if (kind === 'focus') {
        setAnnouncements([]);
        setPhase('loading');
        setRefreshing(false);
      } else {
        setRefreshing(true);
      }

      const apply = (nextPhase: FeedPhase, nextRows: Announcement[]) => {
        if (requestSeq.current !== seq || contextKeyRef.current !== requestContext) {
          return;
        }
        setAnnouncements(nextRows);
        setPhase(nextPhase);
        setRefreshing(false);
      };

      try {
        const response = await listAnnouncements(schoolId);
        if (!Array.isArray(response?.data)) {
          apply('error', []);
          return;
        }
        apply('ready', forActiveSchool(response.data, schoolId));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          apply('unavailable', []);
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
      void loadFeed('focus');

      return () => {
        requestSeq.current += 1;
      };
    }, [loadFeed]),
  );

  const openAnnouncement = (item: Announcement) => {
    if (activeSchoolId == null || typeof item.id !== 'number' || !Number.isSafeInteger(item.id) || item.id <= 0) {
      return;
    }

    const publishedAt = typeof item.published_at === 'string' ? item.published_at : undefined;
    navigation.navigate('AnnouncementDetail', {
      id: item.id,
      schoolId: activeSchoolId,
      title: textOrEmpty(item.title),
      body: textOrEmpty(item.body),
      ...(publishedAt !== undefined ? { publishedAt } : {}),
    });
  };

  return (
    <View style={styles.screen}>
      {phase === 'loading' ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
      ) : null}
      {phase === 'unavailable' ? (
        <ScrollView
          contentContainerStyle={styles.status}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadFeed('refresh');
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <Text style={styles.statusText}>{t('announcements.unavailable')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void loadFeed('focus');
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>{t('announcements.retry')}</Text>
          </Pressable>
        </ScrollView>
      ) : null}
      {phase === 'error' || phase === 'offline' ? (
        <ScrollView
          contentContainerStyle={styles.status}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadFeed('refresh');
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <Text style={styles.errorText}>
            {phase === 'offline' ? t('announcements.networkError') : t('announcements.loadError')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void loadFeed('focus');
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>{t('announcements.retry')}</Text>
          </Pressable>
        </ScrollView>
      ) : null}
      {phase === 'ready' ? (
        <FlatList
          data={announcements}
          keyExtractor={(item) => String(item.id)}
          style={styles.listFlex}
          contentContainerStyle={announcements.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState messageKey="empty.announcements" />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadFeed('refresh');
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const title = textOrEmpty(item.title).trim();
            const body = textOrEmpty(item.body).trim();
            const published =
              typeof item.published_at === 'string' ? displayPublishedAt(item.published_at) : '';

            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => openAnnouncement(item)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                {title.length > 0 ? <Text style={styles.title}>{title}</Text> : null}
                {published.length > 0 ? <Text style={styles.date}>{published}</Text> : null}
                {body.length > 0 ? (
                  <Text style={styles.body} numberOfLines={3}>
                    {body}
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
    flexGrow: 1,
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
  listFlex: {
    flex: 1,
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
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  date: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  body: {
    color: colors.textPrimary,
    fontSize: 16,
  },
});

export default AnnouncementsScreen;
