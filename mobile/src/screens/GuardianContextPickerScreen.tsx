import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { useAuth } from '../providers/AuthContext';
import { useGuardianContext } from '../providers/GuardianContext';
import { colors } from '../theme/colors';
import { Membership } from '../types/auth';

const schoolLabel = (membership: Membership) => {
  const name = membership.school_name?.trim();
  return name ? name : t('context.unnamedSchool');
};

const GuardianContextPickerScreen = () => {
  const { logout } = useAuth();
  const {
    eligibleMemberships,
    draft,
    switching,
    selectMembership,
    selectStudent,
    backToSchools,
    cancelSwitch,
  } = useGuardianContext();

  const showSchoolList = draft === null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.prompt}>{t('context.choosePrompt')}</Text>
        {draft ? <Text style={styles.schoolName}>{schoolLabel(draft.membership)}</Text> : null}

        {draft?.loading ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : null}

        {draft?.error ? <Text style={styles.notice}>{t('context.loadError')}</Text> : null}

        {draft?.empty ? <Text style={styles.notice}>{t('context.schoolHasNoChild')}</Text> : null}

        {showSchoolList
          ? eligibleMemberships.map((membership) => (
              <Pressable
                key={membership.id}
                accessibilityRole="button"
                onPress={() => selectMembership(membership.id)}
                style={styles.option}
              >
                <Text style={styles.optionLabel}>{schoolLabel(membership)}</Text>
              </Pressable>
            ))
          : null}

        {draft && !draft.loading && !draft.error && !draft.empty
          ? draft.students.map((student) => (
              <Pressable
                key={student.id}
                accessibilityRole="button"
                onPress={() => selectStudent(student.id)}
                style={styles.option}
              >
                <Text style={styles.optionLabel}>{student.name}</Text>
              </Pressable>
            ))
          : null}

        {draft?.error ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => selectMembership(draft.membership.id)}
            style={styles.link}
          >
            <Text style={styles.linkLabel}>{t('context.retry')}</Text>
          </Pressable>
        ) : null}

        {draft && eligibleMemberships.length > 1 ? (
          <Pressable accessibilityRole="button" onPress={backToSchools} style={styles.link}>
            <Text style={styles.linkLabel}>{t('context.chooseAnotherSchool')}</Text>
          </Pressable>
        ) : null}

        {switching ? (
          <Pressable accessibilityRole="button" onPress={cancelSwitch} style={styles.link}>
            <Text style={styles.linkLabel}>{t('context.cancel')}</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void logout();
          }}
          style={styles.link}
        >
          <Text style={styles.linkLabel}>{t('auth.signOut')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  prompt: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  schoolName: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 8,
  },
  spinner: {
    marginTop: 32,
  },
  notice: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
  option: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 20,
    paddingVertical: 8,
  },
  linkLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GuardianContextPickerScreen;
