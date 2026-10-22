import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { t, type MessageKey } from '../../i18n';
import { colors } from '../../theme/colors';
import { SectionPhase } from './useChildSection';

type ChildSectionFrameProps = {
  titleKey: MessageKey;
  phase: SectionPhase;
  emptyKey: MessageKey;
  notFoundKey: MessageKey;
  loadErrorKey: MessageKey;
  networkErrorKey: MessageKey;
  retryKey: MessageKey;
  onRetry: () => void;
  children?: ReactNode;
};

const ChildSectionFrame = ({
  titleKey,
  phase,
  emptyKey,
  notFoundKey,
  loadErrorKey,
  networkErrorKey,
  retryKey,
  onRetry,
  children,
}: ChildSectionFrameProps) => (
  <View>
    <Text style={styles.sectionTitle}>{t(titleKey)}</Text>
    {phase === 'loading' ? (
      <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
    ) : null}
    {phase === 'not_found' ? <Text style={styles.statusText}>{t(notFoundKey)}</Text> : null}
    {phase === 'error' || phase === 'offline' ? (
      <View>
        <Text style={styles.errorText}>
          {phase === 'offline' ? t(networkErrorKey) : t(loadErrorKey)}
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryLabel}>{t(retryKey)}</Text>
        </Pressable>
      </View>
    ) : null}
    {phase === 'empty' ? <Text style={styles.statusText}>{t(emptyKey)}</Text> : null}
    {phase === 'ready' ? children : null}
  </View>
);

const styles = StyleSheet.create({
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
});

export default ChildSectionFrame;
