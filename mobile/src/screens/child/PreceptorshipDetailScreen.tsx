import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../../i18n';
import { ApiError } from '../../services/api';
import { fetchPreceptorshipReport } from '../../services/preceptorship';
import { colors } from '../../theme/colors';
import { PreceptorshipReport } from '../../types/preceptorship';

type DetailPhase = 'loading' | 'ready' | 'not_found' | 'error' | 'offline';

type PreceptorshipDetailScreenProps = {
  schoolId: number;
  studentId: number;
  reportId: number;
  onClose: () => void;
};

const textOrEmpty = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Show endpoint only. A 404, a draft, or another child's row renders the not-found sentence
 * and never the body.
 */
const publishedDetail = (
  report: PreceptorshipReport | null | undefined,
  schoolId: number,
  studentId: number,
  reportId: number,
): PreceptorshipReport | null => {
  if (
    !report ||
    report.id !== reportId ||
    report.school_id !== schoolId ||
    report.student_id !== studentId ||
    report.status !== 'published'
  ) {
    return null;
  }
  return report;
};

const PreceptorshipDetailScreen = ({
  schoolId,
  studentId,
  reportId,
  onClose,
}: PreceptorshipDetailScreenProps) => {
  const [phase, setPhase] = useState<DetailPhase>('loading');
  const [report, setReport] = useState<PreceptorshipReport | null>(null);
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setPhase('loading');
    setReport(null);

    const apply = (nextPhase: DetailPhase, nextReport: PreceptorshipReport | null) => {
      if (requestSeq.current !== seq) {
        return;
      }
      setReport(nextReport);
      setPhase(nextPhase);
    };

    try {
      const response = await fetchPreceptorshipReport(schoolId, reportId);
      const visible = publishedDetail(response?.data, schoolId, studentId, reportId);
      if (!visible) {
        apply('not_found', null);
        return;
      }
      apply('ready', visible);
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
  }, [reportId, schoolId, studentId]);

  useEffect(() => {
    void load();
    return () => {
      requestSeq.current += 1;
    };
  }, [load]);

  const visible = phase === 'ready' ? publishedDetail(report, schoolId, studentId, reportId) : null;
  const periodName = textOrEmpty(visible?.period_name);
  const teacherName = textOrEmpty(visible?.teacher_name);
  const body = visible && typeof visible.body === 'string' ? visible.body : null;

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
        <Text style={styles.topBarTitle}>{t('child.preceptorship.title')}</Text>
        <View style={styles.closeButton} />
      </View>

      {phase === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
      {phase === 'not_found' || (phase === 'ready' && !visible) ? (
        <View style={styles.centered}>
          <Text style={styles.statusText}>{t('child.notFound')}</Text>
        </View>
      ) : null}
      {phase === 'error' || phase === 'offline' ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {phase === 'offline' ? t('child.preceptorship.networkError') : t('child.preceptorship.loadError')}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retryButton}>
            <Text style={styles.retryLabel}>{t('child.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {visible ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {periodName ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('child.preceptorship.period')}</Text>
              <Text style={styles.fieldValue}>{periodName}</Text>
            </View>
          ) : null}
          {teacherName ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('child.preceptorship.teacher')}</Text>
              <Text style={styles.fieldValue}>{teacherName}</Text>
            </View>
          ) : null}
          {body != null ? <Text style={styles.body}>{body}</Text> : null}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
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
  scrollContent: {
    padding: 20,
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
  body: {
    color: colors.textPrimary,
    fontSize: 16,
  },
});

export default PreceptorshipDetailScreen;
