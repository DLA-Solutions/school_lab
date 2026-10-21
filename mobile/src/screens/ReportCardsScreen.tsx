import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useGuardianContext } from '../providers/GuardianContext';
import { fetchReportCards } from '../services/reportCards';
import { ReportCardListItem as ReportCardListItemData } from '../types/reportCards';
import ReportCardListItem from '../components/reportCards/ReportCardListItem';
import ReportCardDetailScreen from './ReportCardDetailScreen';

interface ReportCardSection {
  title: string;
  data: ReportCardListItemData[];
}

const ReportCardsScreen = () => {
  const {
    activeSchoolId: schoolId,
    activeStudentId,
    activeStudentName,
    generation,
  } = useGuardianContext();

  const [items, setItems] = useState<ReportCardListItemData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPublicationId, setSelectedPublicationId] = useState<number | null>(null);
  const requestSeq = useRef(0);

  const contextKey = `${generation}:${schoolId ?? ''}:${activeStudentId ?? ''}`;
  const [seenContextKey, setSeenContextKey] = useState(contextKey);
  if (seenContextKey !== contextKey) {
    setSeenContextKey(contextKey);
    setItems([]);
    setError(null);
    setSelectedPublicationId(null);
  }

  const fetchData = useCallback(
    async (refresh = false) => {
      if (!schoolId || activeStudentId == null) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const seq = ++requestSeq.current;

      if (!refresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const response = await fetchReportCards(schoolId, { studentId: activeStudentId });
        if (requestSeq.current !== seq) {
          return;
        }
        setItems(response.data);
      } catch (err) {
        if (requestSeq.current !== seq) {
          return;
        }
        let message = 'Erro ao carregar boletins';
        if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
        console.error('Failed to fetch report cards:', err);
      } finally {
        if (requestSeq.current === seq) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [schoolId, activeStudentId],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData, generation]);

  const handleRefresh = () => {
    void fetchData(true);
  };

  const studentName = useCallback(
    (id: number) => (id === activeStudentId && activeStudentName ? activeStudentName : `Aluno #${id}`),
    [activeStudentId, activeStudentName],
  );

  // Grouped by academic period — the API gives us `academic_period_id` only (no name) on
  // guardian-scoped routes, so the section label mirrors the web SPA's guardian report cards
  // page ("Período #<id>"). The full period name is available once a publication's detail is
  // opened, since the released snapshot payload carries it.
  const sections = useMemo<ReportCardSection[]>(() => {
    const byPeriod = new Map<number, ReportCardListItemData[]>();
    items.forEach((item) => {
      const bucket = byPeriod.get(item.academic_period_id) ?? [];
      bucket.push(item);
      byPeriod.set(item.academic_period_id, bucket);
    });

    return Array.from(byPeriod.entries()).map(([periodId, data]) => ({
      title: `Período #${periodId}`,
      data,
    }));
  }, [items]);

  const selectedStudentName = selectedPublicationId
    ? studentName(items.find((item) => item.publication_id === selectedPublicationId)?.student_id ?? 0)
    : '';

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="school-outline" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyText}>Nenhum boletim disponível</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
      <Text style={styles.errorText}>Erro ao carregar boletins</Text>
      <Text style={styles.errorDetail}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryText}>Tentar novamente</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {renderError()}
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.publication_id.toString()}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          renderItem={({ item }) =>
            schoolId ? (
              <ReportCardListItem
                item={item}
                schoolId={schoolId}
                studentName={studentName(item.student_id)}
                onPress={(pressedItem) => setSelectedPublicationId(pressedItem.publication_id)}
              />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      <Modal
        visible={selectedPublicationId !== null}
        animationType="slide"
        onRequestClose={() => setSelectedPublicationId(null)}
      >
        {selectedPublicationId !== null && schoolId && (
          <ReportCardDetailScreen
            schoolId={schoolId}
            publicationId={selectedPublicationId}
            studentName={selectedStudentName}
            onClose={() => setSelectedPublicationId(null)}
          />
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: colors.background,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  errorDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ReportCardsScreen;
