import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../theme/colors';
import { fetchReportCardPdfDataUri, fetchReportCardPublication } from '../services/reportCards';
import { ReportCardPublication } from '../types/reportCards';

interface ReportCardDetailScreenProps {
  schoolId: number;
  publicationId: number;
  studentName: string;
  onClose: () => void;
}

const formatDate = (iso: string | null) => {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('pt-BR');
};

/**
 * Rendered as a full-screen Modal from ReportCardsScreen rather than its own drawer/stack route —
 * the guardian drawer only registers one new screen (Boletins), matching the additive-only nav
 * boundary for this feature.
 */
const ReportCardDetailScreen = ({
  schoolId,
  publicationId,
  studentName,
  onClose,
}: ReportCardDetailScreenProps) => {
  const [publication, setPublication] = useState<ReportCardPublication | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchReportCardPublication(schoolId, publicationId);
      setPublication(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar boletim';
      setError(message);
      console.error('Failed to fetch report card publication:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, publicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDownload = async () => {
    const snapshot = publication?.active_snapshot;
    if (!snapshot || downloading) {
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const dataUri = await fetchReportCardPdfDataUri(schoolId, publicationId, snapshot.id);
      await WebBrowser.openBrowserAsync(dataUri);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível baixar o boletim.';
      setError(message);
      console.error('Failed to open report card PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const snapshot = publication?.active_snapshot;
  const payload = snapshot?.snapshot;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>Boletim</Text>
        <View style={styles.closeButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && !publication ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : !snapshot || !payload ? (
        <View style={styles.errorContainer}>
          <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Nenhuma versão liberada para este boletim</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.studentName}>{payload.student.name || studentName}</Text>
            <Text style={styles.subLabel}>
              {payload.period.name} · {payload.school_class.name}
            </Text>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Liberado em</Text>
              <Text style={styles.metaValue}>{formatDate(snapshot.released_at)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Versão</Text>
              <Text style={styles.metaValue}>v{snapshot.version}</Text>
            </View>

            {snapshot.correction_reason && (
              <View style={styles.correctionBanner}>
                <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.correctionText}>{snapshot.correction_reason}</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Frequência</Text>
            <View style={styles.attendanceGrid}>
              <View style={styles.attendanceCell}>
                <Text style={styles.attendanceValue}>
                  {payload.attendance.percentage !== null ? `${payload.attendance.percentage}%` : '—'}
                </Text>
                <Text style={styles.attendanceLabel}>Frequência</Text>
              </View>
              <View style={styles.attendanceCell}>
                <Text style={styles.attendanceValue}>{payload.attendance.present_count}</Text>
                <Text style={styles.attendanceLabel}>Presenças</Text>
              </View>
              <View style={styles.attendanceCell}>
                <Text style={styles.attendanceValue}>{payload.attendance.absent_count}</Text>
                <Text style={styles.attendanceLabel}>Faltas</Text>
              </View>
              <View style={styles.attendanceCell}>
                <Text style={styles.attendanceValue}>{payload.attendance.late_count}</Text>
                <Text style={styles.attendanceLabel}>Atrasos</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Disciplinas</Text>
            {payload.disciplines.length === 0 ? (
              <Text style={styles.emptyDisciplines}>Nenhuma disciplina neste boletim</Text>
            ) : (
              payload.disciplines.map((discipline) => (
                <View key={discipline.class_discipline_id} style={styles.disciplineRow}>
                  <Text style={styles.disciplineName}>{discipline.subject_name}</Text>
                  <Text style={styles.disciplineValue}>{discipline.final_value ?? '—'}</Text>
                </View>
              ))
            )}
          </View>

          {error && <Text style={styles.inlineError}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.downloadButton, pressed && styles.pressed]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={styles.downloadButtonText}>Baixar PDF</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  studentName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  subLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  correctionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  correctionText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  attendanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  attendanceCell: {
    minWidth: '22%',
    alignItems: 'center',
  },
  attendanceValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  attendanceLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  disciplineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  disciplineName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  disciplineValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyDisciplines: {
    color: colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  inlineError: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ReportCardDetailScreen;
