import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { useGuardianContext } from '../providers/GuardianContext';
import { colors } from '../theme/colors';

const HomeScreen = () => {
  const { activeMembership, activeStudent, canSwitch, beginSwitch } = useGuardianContext();
  const trimmedSchoolName = activeMembership?.school_name?.trim() ?? '';
  const schoolName = trimmedSchoolName || t('context.unnamedSchool');

  return (
    <View style={styles.container}>
      <Text style={styles.roleLabel}>{t('shell.roleLabel')}</Text>
      <Text style={styles.roleValue}>{t('role.guardian')}</Text>

      <Text style={styles.metaLabel}>{t('shell.childLabel')}</Text>
      <Text style={styles.metaValue}>{activeStudent?.name ?? ''}</Text>

      <Text style={styles.metaLabel}>{t('shell.schoolLabel')}</Text>
      <Text style={styles.metaValue}>{schoolName}</Text>

      {canSwitch ? (
        <Pressable accessibilityRole="button" onPress={beginSwitch} style={styles.switchButton}>
          <Text style={styles.switchLabel}>{t('context.change')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

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
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  switchButton: {
    marginTop: 28,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
