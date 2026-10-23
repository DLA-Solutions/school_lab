import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { t } from '../i18n';
import { useGuardianContext } from '../providers/GuardianContext';
import { ApiError } from '../services/api';
import { fetchDailyRoutineEntries } from '../services/dailyRoutine';
import { colors } from '../theme/colors';
import { DailyRoutineEntry } from '../types/dailyRoutine';
import { todayInSchoolTimezone } from '../utils/schoolDate';

type RoutinePhase = 'loading' | 'ready' | 'empty' | 'not_found' | 'error' | 'offline';

/**
 * Display guard only. The API already returns sent rows for the requested range and 404s
 * another family. Ignore a draft, another date, or another student if one is ever present.
 */
const sentEntryForToday = (
  rows: DailyRoutineEntry[],
  today: string,
  studentId: number,
): DailyRoutineEntry | null =>
  rows.find(
    (row) =>
      !!row && row.status === 'sent' && row.date === today && row.student_id === studentId,
  ) ?? null;

const snackLabel = (value: boolean | null): string => {
  if (value === true) {
    return t('routine.snackEaten');
  }
  if (value === false) {
    return t('routine.snackNotEaten');
  }

  return t('routine.snackNotRecorded');
};

const HomeScreen = () => {
  const { activeMembership, activeStudent, activeSchoolId, activeStudentId, canSwitch, beginSwitch, generation } =
    useGuardianContext();
  const trimmedSchoolName = activeMembership?.school_name?.trim() ?? '';
  const schoolName = trimmedSchoolName || t('context.unnamedSchool');

  const [phase, setPhase] = useState<RoutinePhase>('loading');
  const [entry, setEntry] = useState<DailyRoutineEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestSeq = useRef(0);

  const contextKey = `${generation}:${activeSchoolId ?? ''}:${activeStudentId ?? ''}`;
  const contextKeyRef = useRef(contextKey);
  contextKeyRef.current = contextKey;
  const [seenContextKey, setSeenContextKey] = useState(contextKey);
  if (seenContextKey !== contextKey) {
    setSeenContextKey(contextKey);
    setEntry(null);
    setPhase('loading');
    setRefreshing(false);
  }

  const loadRoutine = useCallback(
    async (kind: 'focus' | 'refresh') => {
      const schoolId = activeSchoolId;
      const studentId = activeStudentId;
      const requestContext = `${generation}:${schoolId ?? ''}:${studentId ?? ''}`;
      const seq = ++requestSeq.current;

      if (schoolId == null || studentId == null) {
        if (contextKeyRef.current === requestContext && requestSeq.current === seq) {
          setEntry(null);
          setPhase('empty');
          setRefreshing(false);
        }
        return;
      }

      if (kind === 'focus') {
        setEntry(null);
        setPhase('loading');
        setRefreshing(false);
      } else {
        setRefreshing(true);
      }

      const apply = (nextPhase: RoutinePhase, nextEntry: DailyRoutineEntry | null) => {
        if (requestSeq.current !== seq || contextKeyRef.current !== requestContext) {
          return;
        }
        setEntry(nextEntry);
        setPhase(nextPhase);
        setRefreshing(false);
      };

      try {
        const today = todayInSchoolTimezone();
        if (!today) {
          apply('error', null);
          return;
        }

        const response = await fetchDailyRoutineEntries(schoolId, studentId, today, today);
        if (!Array.isArray(response?.data)) {
          apply('error', null);
          return;
        }

        const match = sentEntryForToday(response.data, today, studentId);
        apply(match ? 'ready' : 'empty', match);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          apply('not_found', null);
          return;
        }
        if (err instanceof ApiError) {
          apply('error', null);
          return;
        }
        apply('offline', null);
      }
    },
    [activeSchoolId, activeStudentId, generation],
  );

  useFocusEffect(
    useCallback(() => {
      void loadRoutine('focus');

      return () => {
        requestSeq.current += 1;
      };
    }, [loadRoutine]),
  );

  const today = todayInSchoolTimezone();
  const visibleEntry =
    phase === 'ready' &&
    entry &&
    today != null &&
    entry.status === 'sent' &&
    entry.date === today &&
    entry.student_id === activeStudentId
      ? entry
      : null;
  const notesText = visibleEntry?.notes && visibleEntry.notes.trim() ? visibleEntry.notes : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void loadRoutine('refresh');
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Text style={styles.roleLabel}>{t('shell.roleLabel')}</Text>
      <Text style={styles.roleValue}>{t('role.guardian')}</Text>

      <Text style={styles.metaLabel}>{t('shell.childLabel')}</Text>
      <Text style={styles.metaValue}>{activeStudent?.name ?? ''}</Text>

      <Text style={styles.metaLabel}>{t('shell.schoolLabel')}</Text>
      <Text style={styles.metaValue}>{schoolName}</Text>

      {canSwitch ? (
        <Pressable accessibilityRole="button" onPress={beginSwitch} style={styles.switchButton}>
          <Text style={styles.switchLabel}>{t('context.change')}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>{t('routine.todayTitle')}</Text>
      {phase === 'loading' ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
      ) : null}
      {phase === 'not_found' ? <Text style={styles.statusText}>{t('routine.notFound')}</Text> : null}
      {phase === 'error' || phase === 'offline' ? (
        <View>
          <Text style={styles.errorText}>
            {phase === 'offline' ? t('routine.networkError') : t('routine.loadError')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void loadRoutine('focus');
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>{t('routine.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {phase === 'empty' || (phase === 'ready' && !visibleEntry) ? (
        <Text style={styles.statusText}>{t('routine.empty')}</Text>
      ) : null}
      {visibleEntry ? (
        <View style={styles.routineCard}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('routine.snack')}</Text>
            <Text style={styles.fieldValue}>{snackLabel(visibleEntry.snack_eaten)}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('routine.poop')}</Text>
            <Text style={styles.fieldValue}>{String(visibleEntry.poop_count)}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('routine.pee')}</Text>
            <Text style={styles.fieldValue}>{String(visibleEntry.pee_count)}</Text>
          </View>
          {notesText ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('routine.notes')}</Text>
              <Text style={styles.notesValue}>{notesText}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  roleLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  switchButton: {
    marginTop: 28,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 32,
  },
  loading: {
    marginTop: 24,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    marginTop: 12,
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
  routineCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  notesValue: {
    color: colors.textPrimary,
    fontSize: 16,
  },
});

export default HomeScreen;
