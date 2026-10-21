import { StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { colors } from '../theme/colors';

const HomeScreen = () => (
  <View style={styles.container}>
    <Text style={styles.roleLabel}>{t('shell.roleLabel')}</Text>
    <Text style={styles.roleValue}>{t('role.guardian')}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  roleLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
});

export default HomeScreen;
