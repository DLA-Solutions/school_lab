import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t, type MessageKey } from '../i18n';
import { useAuth } from '../providers/AuthContext';
import { useGuardianContext } from '../providers/GuardianContext';
import { colors } from '../theme/colors';

type GuardianBlockedScreenProps = {
  variant: 'no_guardian' | 'no_child' | 'error';
};

const MESSAGE_KEYS: Record<GuardianBlockedScreenProps['variant'], MessageKey> = {
  no_guardian: 'context.noGuardian',
  no_child: 'context.noChild',
  error: 'context.loadError',
};

const GuardianBlockedScreen = ({ variant }: GuardianBlockedScreenProps) => {
  const { logout } = useAuth();
  const { retry } = useGuardianContext();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.message}>{t(MESSAGE_KEYS[variant])}</Text>
      {variant === 'error' ? (
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>{t('context.retry')}</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void logout();
        }}
        style={styles.signOut}
      >
        <Text style={styles.signOutLabel}>{t('auth.signOut')}</Text>
      </Pressable>
    </SafeAreaView>
  );
};

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
  button: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  signOut: {
    marginTop: 16,
    paddingVertical: 8,
  },
  signOutLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GuardianBlockedScreen;
