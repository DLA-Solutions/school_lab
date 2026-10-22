import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { t } from '../i18n';
import { ApiError } from '../services/api';
import { fetchReportCardPdfDataUri, fetchReportCardPublication } from '../services/reportCards';
import { colors } from '../theme/colors';
import { ReportCardPublication, ReportCardSnapshot } from '../types/reportCards';

interface ReportCardDetailScreenProps {
  schoolId: number;
  publicationId: number;
  studentId: number;
  studentName: string;
  onClose: () => void;
}

type DetailPhase = 'loading' | 'ready' | 'not_found' | 'error' | 'offline';

const formatDate = (iso: string | null) => {
  if (!iso) {
    return '—';
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleDateString('pt-BR');
};

/**
 * A 404 is not a retry that can reveal a draft. Not-found renders the sentence only.
 * A publication for another student is treated the same way.
 */
const releasedForStudent = (
  publication: ReportCardPublication | null | undefined,
  studentId: number,
): ReportCardSnapshot | null => {
  if (!publication || publication.student_id !== studentId) {
    return null;
  }
  return publication.active_snapshot;
};

const ReportCardDetailScreen = ({
  schoolId,
  publicationId,
  studentId,
  studentName,
  onClose,
}: ReportCardDetailScreenProps) => {
  const [publication, setPublication] = useState<ReportCardPublication | null>(null);
  const [phase, setPhase] = useState<DetailPhase>('loading');
  const [downloading, setDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setPhase('loading');
    setPublication(null);
    setDownloadFailed(false);

    const apply = (nextPhase: DetailPhase, nextPublication: ReportCardPublication | null) => {
      if (requestSeq.current !== seq) {
        return;
      }
      setPublication(nextPublication);
      setPhase(nextPhase);
    };

    try {
      const response = await fetchReportCardPublication(schoolId, publicationId);
      if (!response?.data || response.data.student_id !== studentId) {
        apply('not_found', null);
        return;
      }
      apply('ready', response.data);
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
  }, [publicationId, schoolId, studentId]);

  useEffect(() => {
    void load();
    return () => {
      requestSeq.current += 1;
    };
  }, [load]);

  const handleDownload = async () => {
    const snapshot = releasedForStudent(publication, studentId);
    if (!snapshot || downloading || phase !== 'ready') {
      return;
    }

    setDownloading(true);
    setDownloadFailed(false);

    try {
      const dataUri = await fetchReportCardPdfDataUri(schoolId, publicationId, snapshot.id);
      await WebBrowser.openBrowserAsync(dataUri);
    } catch {
      setDownloadFailed(true);
    } finally {
      setDownloading(false);
    }
  };

  const snapshot = phase === 'ready' ? releasedForStudent(publication, studentId) : null;
  const embedded = snapshot?.snapshot ?? null;
  const foreignSnapshot = embedded != null && embedded.student?.id !== studentId;
  const payload = embedded != null && !foreignSnapshot ? embedded : null;
  const showReleased = phase === 'ready' && snapshot != null && payload != null;
  const showMissingSnapshot =
    phase === 'ready' && publication?.student_id === studentId && !foreignSnapshot && !showReleased;
  const showNotFound = phase === 'not_found' || (phase === 'ready' && foreignSnapshot);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('child.close')}
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t('reportCards.title')}</Text>
        <View style={styles.closeButton} />
      </View>

      {phase === 'loading' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}

      {showNotFound ? (
        <View style={styles.errorContainer}>
          <Text style={styles.emptyText}>{t('reportCards.notFound')}</Text>
        </View>
      ) : null}

      {phase === 'error' || phase === 'offline' ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>
            {phase === 'offline' ? t('reportCards.networkError') : t('reportCards.loadError')}
          </Text>
          <Pressable accessibilityRole="button" style={styles.retryButton} onPress={() => void load()}>
            <Text style={styles.retryText}>{t('reportCards.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {showMissingSnapshot ? (
        <View style={styles.errorContainer}>
          <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>{t('reportCards.noReleased')}</Text>
        </View>
      ) : null}

      {showReleased && snapshot && payload ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.studentName}>{payload.student.name || studentName}</Text>
            <Text style={styles.subLabel}>
              {payload.period.name} · {payload.school_class.name}
            </Text>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t('reportCards.releasedOn')}</Text>
              <Text style={styles.metaValue}>{formatDate(snapshot.released_at)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t('reportCards.version')}</Text>
              <Text style={styles.metaValue}>v{snapshot.version}</Text>
            </View>

            {snapshot.correction_reason ? (
              <View style={styles.correctionBanner}>
                <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.correctionText}>{snapshot.correction_reason}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('reportCards.attendance')}</Text>
            <View style={styles.attendanceGrid}>
              <View style={styles.attendanceCell}>
                <Text style={styles.attendanceValue}>
                  {payload.attendance.percentage !== null ? `${payload.attendance.percentage}%` : '—'}
                </Text>
                <Text style={styles.attendanceLabel}>{t('reportCards.attendance')}</Text>
              </View>
              <View style={styles.attendanceCell}>
                <Text style={styles.attendanceValue}>{payload.attendance.present_count}</Text>
                <Text style={styles.attendanceLabel}>{t('reportCards.present')}</Text>
              </View>
              <View style={styles.attendanceCell}>
                <Text style={styles.attendanceValue}>{payload.attendance.absent_count}</Text>
                <Text style={styles.attendanceLabel}>{t('reportCards.absent')}</Text>
              </View>
              <View style={styles.attendanceCell}>
                <Text style={styles.attendanceValue}>{payload.attendance.late_count}</Text>
                <Text style={styles.attendanceLabel}>{t('reportCards.late')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('reportCards.disciplines')}</Text>
            {payload.disciplines.length === 0 ? (
              <Text style={styles.emptyDisciplines}>{t('reportCards.noDisciplines')}</Text>
            ) : (
              payload.disciplines.map((discipline) => (
                <View key={discipline.class_discipline_id} style={styles.disciplineRow}>
                  <Text style={styles.disciplineName}>{discipline.subject_name}</Text>
                  <Text style={styles.disciplineValue}>{discipline.final_value ?? '—'}</Text>
                </View>
              ))
            )}
          </View>

          {downloadFailed ? <Text style={styles.inlineError}>{t('reportCards.downloadError')}</Text> : null}

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.downloadButton, pressed && styles.pressed]}
            onPress={() => {
              void handleDownload();
            }}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.downloadButtonText}>{t('reportCards.downloadPdf')}</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      ) : null}
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
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    color: colors.primary,
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
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ReportCardDetailScreen;
