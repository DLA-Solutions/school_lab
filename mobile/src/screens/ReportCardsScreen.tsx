import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../providers/AuthContext';
import { fetchGuardianStudents, fetchReportCards } from '../services/reportCards';
import { GuardianStudent, ReportCardListItem as ReportCardListItemData } from '../types/reportCards';
import ReportCardListItem from '../components/reportCards/ReportCardListItem';
import ReportCardDetailScreen from './ReportCardDetailScreen';

interface ReportCardSection {
  title: string;
  data: ReportCardListItemData[];
}

const ReportCardsScreen = () => {
  const { user } = useAuth();
  const schoolId = user?.memberships?.[0]?.school_id;

  const [students, setStudents] = useState<GuardianStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const [items, setItems] = useState<ReportCardListItemData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPublicationId, setSelectedPublicationId] = useState<number | null>(null);

  // Best-effort — the list/detail payloads only carry `student_id`, so this resolves it to a
  // name for the filter chips and each row. If it fails, rows fall back to "Aluno #<id>".
  useEffect(() => {
    if (!schoolId) {
      return;
    }

    let cancelled = false;

    fetchGuardianStudents(schoolId)
      .then((response) => {
        if (!cancelled) {
          setStudents(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStudents([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const fetchData = useCallback(
    async (refresh = false) => {
      if (!schoolId) return;

      if (!refresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const response = await fetchReportCards(schoolId, {
          studentId: selectedStudentId ?? undefined,
        });
        setItems(response.data);
      } catch (err) {
        let message = 'Erro ao carregar boletins';
        if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
        console.error('Failed to fetch report cards:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [schoolId, selectedStudentId],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    void fetchData(true);
  };

  const studentName = useCallback(
    (id: number) => students.find((student) => student.id === id)?.name ?? `Aluno #${id}`,
    [students],
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
      {students.length > 1 && (
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            <Pressable
              style={[styles.filterChip, selectedStudentId === null && styles.filterChipActive]}
              onPress={() => setSelectedStudentId(null)}
            >
              <Text
                style={[styles.filterChipText, selectedStudentId === null && styles.filterChipTextActive]}
              >
                Todos
              </Text>
            </Pressable>
            {students.map((student) => (
              <Pressable
                key={student.id}
                style={[styles.filterChip, selectedStudentId === student.id && styles.filterChipActive]}
                onPress={() => setSelectedStudentId(student.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedStudentId === student.id && styles.filterChipTextActive,
                  ]}
                >
                  {student.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

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
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
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
