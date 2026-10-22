import { forwardRef, useImperativeHandle, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import ReportCardListItem from '../components/reportCards/ReportCardListItem';
import { t } from '../i18n';
import { useGuardianContext } from '../providers/GuardianContext';
import { fetchReportCards } from '../services/reportCards';
import { colors } from '../theme/colors';
import { ReportCardListItem as ReportCardListItemData } from '../types/reportCards';
import { isPositiveId } from '../utils/ids';
import { SectionFailure } from '../utils/sectionFailure';
import ChildSectionFrame from './child/ChildSectionFrame';
import { ChildSectionHandle, SectionPhase, useChildSection } from './child/useChildSection';
import ReportCardDetailScreen from './ReportCardDetailScreen';

const REPORT_CARD_LIMIT = 100;

/**
 * Display guard. The request already passes the active child's `student_id`.
 * Drop any other student if one is ever present.
 */
export const reportCardsForStudent = (
  rows: ReportCardListItemData[],
  studentId: number,
): ReportCardListItemData[] =>
  rows.filter(
    (row) => !!row && isPositiveId(row.publication_id) && row.student_id === studentId,
  );

const loadReportCards = async (schoolId: number, studentId: number): Promise<ReportCardListItemData[]> => {
  const response = await fetchReportCards(schoolId, { studentId, limit: REPORT_CARD_LIMIT });
  if (!Array.isArray(response?.data)) {
    throw new SectionFailure();
  }
  return reportCardsForStudent(response.data, studentId);
};

interface ReportCardGroup {
  periodId: number;
  items: ReportCardListItemData[];
}

/** Keeps API order. Period blocks follow the first row of each period. */
const groupByPeriod = (items: ReportCardListItemData[]): ReportCardGroup[] => {
  const groups: ReportCardGroup[] = [];
  const indexByPeriod = new Map<number, number>();

  items.forEach((item) => {
    const existing = indexByPeriod.get(item.academic_period_id);
    if (existing === undefined) {
      indexByPeriod.set(item.academic_period_id, groups.length);
      groups.push({ periodId: item.academic_period_id, items: [item] });
      return;
    }
    groups[existing].items.push(item);
  });

  return groups;
};

/**
 * Released report cards for the active child, rendered as rows inside the Filho scroll.
 * Not a VirtualizedList — the parent screen owns the vertical scroll.
 */
const ReportCardsScreen = forwardRef<ChildSectionHandle>(function ReportCardsScreen(_props, ref) {
  const { activeSchoolId, activeStudentId, activeStudentName, generation } = useGuardianContext();
  const { phase, rows, reload } = useChildSection(loadReportCards);
  useImperativeHandle(ref, () => ({ reload }), [reload]);

  const contextKey = `${generation}:${activeSchoolId ?? ''}:${activeStudentId ?? ''}`;
  const [seenContextKey, setSeenContextKey] = useState(contextKey);
  const [selectedPublicationId, setSelectedPublicationId] = useState<number | null>(null);
  if (seenContextKey !== contextKey) {
    setSeenContextKey(contextKey);
    setSelectedPublicationId(null);
  }

  const visible = activeStudentId != null ? reportCardsForStudent(rows, activeStudentId) : [];
  const shownPhase: SectionPhase = phase === 'ready' && visible.length === 0 ? 'empty' : phase;
  const groups = groupByPeriod(visible);
  const studentName = activeStudentName ?? '';

  return (
    <>
      <ChildSectionFrame
        titleKey="child.reportCards.title"
        phase={shownPhase}
        emptyKey="child.reportCards.empty"
        notFoundKey="child.notFound"
        loadErrorKey="child.reportCards.loadError"
        networkErrorKey="child.reportCards.networkError"
        retryKey="child.retry"
        onRetry={() => {
          void reload('focus');
        }}
      >
        {groups.map((group) => (
          <View key={group.periodId}>
            <Text style={styles.periodHeader}>
              {t('reportCards.periodPrefix')}
              {group.periodId}
            </Text>
            {group.items.map((item) =>
              activeSchoolId != null && item.student_id === activeStudentId ? (
                <ReportCardListItem
                  key={item.publication_id}
                  item={item}
                  schoolId={activeSchoolId}
                  studentName={studentName}
                  onPress={(pressed) => {
                    if (pressed.student_id === activeStudentId) {
                      setSelectedPublicationId(pressed.publication_id);
                    }
                  }}
                />
              ) : null,
            )}
          </View>
        ))}
      </ChildSectionFrame>

      <Modal
        visible={selectedPublicationId !== null}
        animationType="slide"
        onRequestClose={() => setSelectedPublicationId(null)}
      >
        {selectedPublicationId !== null && activeSchoolId != null && activeStudentId != null ? (
          <ReportCardDetailScreen
            schoolId={activeSchoolId}
            publicationId={selectedPublicationId}
            studentId={activeStudentId}
            studentName={studentName}
            onClose={() => setSelectedPublicationId(null)}
          />
        ) : null}
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  periodHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
  },
});

export default ReportCardsScreen;
