import { StyleSheet, Text, View } from 'react-native';
import { t, type MessageKey } from '../i18n';
import { colors } from '../theme/colors';

type EmptyStateProps = {
  messageKey: MessageKey;
};

const EmptyState = ({ messageKey }: EmptyStateProps) => (
  <View style={styles.container}>
    <Text style={styles.message}>{t(messageKey)}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default EmptyState;
