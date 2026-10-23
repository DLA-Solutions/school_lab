import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { t } from '../../i18n';
import { useGuardianContext } from '../../providers/GuardianContext';
import { fetchDailyRoutineEntries } from '../../services/dailyRoutine';
import { colors } from '../../theme/colors';
import { DailyRoutineEntry } from '../../types/dailyRoutine';
import { formatCalendarDateBR } from '../../utils/format';
import { schoolDateMinusDays, todayInSchoolTimezone } from '../../utils/schoolDate';
import { isPositiveId } from '../../utils/ids';
import { SectionFailure } from '../../utils/sectionFailure';
import ChildSectionFrame from './ChildSectionFrame';
import { ChildSectionHandle, SectionPhase, useChildSection } from './useChildSection';

/** Two school years, so an earlier sent entry still falls inside the requested range. */
const ROUTINE_HISTORY_DAYS = 730;

const historyRange = (): { from: string; to: string } | null => {
  const to = todayInSchoolTimezone();
  if (!to) {
    return null;
  }
  const from = schoolDateMinusDays(to, ROUTINE_HISTORY_DAYS);
  if (!from) {
    return null;
  }
  return { from, to };
};

/**
 * Display guard. The API already returns sent rows for the requested range and 404s another
 * family. Drop a draft, a date outside the range, or another student if one is ever present.
 * Order is the API order (`date` desc).
 */
export const sentHistoryEntries = (
  rows: DailyRoutineEntry[],
  studentId: number,
  from: string,
  to: string,
): DailyRoutineEntry[] =>
  rows.filter(
    (row) =>
      !!row &&
      isPositiveId(row.id) &&
      row.status === 'sent' &&
      row.student_id === studentId &&
      typeof row.date === 'string' &&
      row.date >= from &&
      row.date <= to,
  );

const loadRoutineHistory = async (schoolId: number, studentId: number): Promise<DailyRoutineEntry[]> => {
  const range = historyRange();
  if (!range) {
    throw new SectionFailure();
  }

  const response = await fetchDailyRoutineEntries(schoolId, studentId, range.from, range.to);
  if (!Array.isArray(response?.data)) {
    throw new SectionFailure();
  }

  return sentHistoryEntries(response.data, studentId, range.from, range.to);
};

const snackLabel = (value: boolean | null): string => {
  if (value === true) {
    return t('routine.snackEaten');
  }
  if (value === false) {
    return t('routine.snackNotEaten');
  }
  return t('routine.snackNotRecorded');
};

const RoutineHistorySection = forwardRef<ChildSectionHandle>(function RoutineHistorySection(_props, ref) {
  const { activeStudentId } = useGuardianContext();
  const { phase, rows, reload } = useChildSection(loadRoutineHistory);
  useImperativeHandle(ref, () => ({ reload }), [reload]);

  const range = historyRange();
  const visible =
    range && activeStudentId != null
      ? sentHistoryEntries(rows, activeStudentId, range.from, range.to)
      : [];
  const shownPhase: SectionPhase =
    phase === 'ready' && (range == null || visible.length === 0)
      ? range == null
        ? 'error'
        : 'empty'
      : phase;

  return (
    <ChildSectionFrame
      titleKey="child.routine.title"
      phase={shownPhase}
      emptyKey="child.routine.empty"
      notFoundKey="routine.notFound"
      loadErrorKey="routine.loadError"
      networkErrorKey="routine.networkError"
      retryKey="routine.retry"
      onRetry={() => {
        void reload('focus');
      }}
    >
      {visible.map((entry) => {
        const dateLabel = formatCalendarDateBR(entry.date) || entry.date;
        const notesText = typeof entry.notes === 'string' && entry.notes.trim() ? entry.notes.trim() : null;
        return (
          <View key={entry.id} style={styles.card}>
            <Text style={styles.date}>{dateLabel}</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('routine.snack')}</Text>
              <Text style={styles.fieldValue}>{snackLabel(entry.snack_eaten)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('routine.poop')}</Text>
              <Text style={styles.fieldValue}>{String(entry.poop_count)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('routine.pee')}</Text>
              <Text style={styles.fieldValue}>{String(entry.pee_count)}</Text>
            </View>
            {notesText ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('routine.notes')}</Text>
                <Text style={styles.notesValue}>{notesText}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </ChildSectionFrame>
  );
});

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  date: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
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

export default RoutineHistorySection;
