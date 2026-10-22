import { forwardRef, useImperativeHandle, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../../i18n';
import { useGuardianContext } from '../../providers/GuardianContext';
import { fetchPreceptorshipReports } from '../../services/preceptorship';
import { colors } from '../../theme/colors';
import { PreceptorshipReport } from '../../types/preceptorship';
import { collectPages, PAGE_LIMIT } from '../../utils/collectPages';
import { isPositiveId } from '../../utils/ids';
import { SectionFailure } from '../../utils/sectionFailure';
import ChildSectionFrame from './ChildSectionFrame';
import PreceptorshipDetailScreen from './PreceptorshipDetailScreen';
import { ChildSectionHandle, SectionPhase, useChildSection } from './useChildSection';

const textOrEmpty = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Display guard. The guardian index is not filtered by student. Keep a row only when it is
 * this child and published. A draft body never reaches the list.
 */
export const publishedForStudent = (
  rows: PreceptorshipReport[],
  schoolId: number,
  studentId: number,
): PreceptorshipReport[] =>
  rows.filter(
    (row) =>
      !!row &&
      isPositiveId(row.id) &&
      row.school_id === schoolId &&
      row.student_id === studentId &&
      row.status === 'published',
  );

const loadReports = async (schoolId: number, studentId: number): Promise<PreceptorshipReport[]> => {
  const rows = await collectPages((page) => fetchPreceptorshipReports(schoolId, page, PAGE_LIMIT));
  if (!Array.isArray(rows)) {
    throw new SectionFailure();
  }
  return publishedForStudent(rows, schoolId, studentId).map((row) => ({
    ...row,
    body: '',
  }));
};

const PreceptorshipSection = forwardRef<ChildSectionHandle>(function PreceptorshipSection(_props, ref) {
  const { activeSchoolId, activeStudentId, generation } = useGuardianContext();
  const { phase, rows, reload } = useChildSection(loadReports);
  useImperativeHandle(ref, () => ({ reload }), [reload]);

  const contextKey = `${generation}:${activeSchoolId ?? ''}:${activeStudentId ?? ''}`;
  const [seenContextKey, setSeenContextKey] = useState(contextKey);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  if (seenContextKey !== contextKey) {
    setSeenContextKey(contextKey);
    setSelectedId(null);
  }

  const visible =
    activeSchoolId != null && activeStudentId != null
      ? publishedForStudent(rows, activeSchoolId, activeStudentId)
      : [];
  const shownPhase: SectionPhase = phase === 'ready' && visible.length === 0 ? 'empty' : phase;

  return (
    <>
      <ChildSectionFrame
        titleKey="child.preceptorship.title"
        phase={shownPhase}
        emptyKey="child.preceptorship.empty"
        notFoundKey="child.notFound"
        loadErrorKey="child.preceptorship.loadError"
        networkErrorKey="child.preceptorship.networkError"
        retryKey="child.retry"
        onRetry={() => {
          void reload('focus');
        }}
      >
        {visible.map((report) => {
          const periodName = textOrEmpty(report.period_name);
          const teacherName = textOrEmpty(report.teacher_name);
          return (
            <Pressable
              key={report.id}
              accessibilityRole="button"
              onPress={() => setSelectedId(report.id)}
              style={styles.card}
            >
              <Text style={styles.primary}>{periodName || t('child.preceptorship.title')}</Text>
              {teacherName ? (
                <Text style={styles.secondary}>
                  {t('child.preceptorship.teacher')}: {teacherName}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ChildSectionFrame>

      <Modal visible={selectedId !== null} animationType="slide" onRequestClose={() => setSelectedId(null)}>
        {selectedId !== null && activeSchoolId != null && activeStudentId != null ? (
          <PreceptorshipDetailScreen
            schoolId={activeSchoolId}
            studentId={activeStudentId}
            reportId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </Modal>
    </>
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
    gap: 8,
  },
  primary: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    color: colors.textSecondary,
    fontSize: 15,
  },
});

export default PreceptorshipSection;
