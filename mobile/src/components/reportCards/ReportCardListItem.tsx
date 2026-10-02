import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../../theme/colors';
import { fetchReportCardPdfDataUri } from '../../services/reportCards';
import { ReportCardListItem as ReportCardListItemData } from '../../types/reportCards';

interface ReportCardListItemProps {
  item: ReportCardListItemData;
  schoolId: number;
  studentName: string;
  onPress: (item: ReportCardListItemData) => void;
}

const formatReleasedAt = (iso: string | null) => {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('pt-BR');
};

const ReportCardListItem = ({ item, schoolId, studentName, onPress }: ReportCardListItemProps) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const hasPdf = item.snapshot_id !== null;

  const handleDownload = async () => {
    if (!hasPdf || downloading || item.snapshot_id === null) {
      return;
    }

    setDownloading(true);
    setDownloadError(null);

    try {
      const dataUri = await fetchReportCardPdfDataUri(schoolId, item.publication_id, item.snapshot_id);
      await WebBrowser.openBrowserAsync(dataUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível baixar o boletim.';
      setDownloadError(message);
      console.error('Failed to open report card PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.itemContainer, pressed && styles.pressed]}
      onPress={() => onPress(item)}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.studentName}>{studentName}</Text>
          <Text style={styles.periodLabel}>Período #{item.academic_period_id}</Text>
        </View>
        {item.version !== null && (
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v{item.version}</Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text style={styles.date}>Liberado em {formatReleasedAt(item.released_at)}</Text>

        <Pressable
          style={({ pressed }) => [
            styles.downloadButton,
            pressed && styles.pressed,
            !hasPdf && styles.downloadButtonDisabled,
          ]}
          onPress={handleDownload}
          disabled={!hasPdf || downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons
                name="download-outline"
                size={16}
                color={hasPdf ? colors.primary : colors.textDisabled}
              />
              <Text style={[styles.downloadText, !hasPdf && styles.downloadTextDisabled]}>PDF</Text>
            </>
          )}
        </Pressable>
      </View>

      {!hasPdf && <Text style={styles.unavailableText}>Boletim ainda não disponível</Text>}
      {downloadError && <Text style={styles.errorText}>{downloadError}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginVertical: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  studentName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  periodLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  versionBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  versionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  date: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  downloadButtonDisabled: {
    opacity: 0.5,
  },
  downloadText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  downloadTextDisabled: {
    color: colors.textDisabled,
  },
  unavailableText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 8,
  },
});

export default ReportCardListItem;
