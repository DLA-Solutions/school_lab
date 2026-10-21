import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthContext';
import { useGuardianContext } from '../providers/GuardianContext';
import { navigationRef } from '../services/pushNotifications';
import GuardianBlockedScreen from '../screens/GuardianBlockedScreen';
import GuardianContextPickerScreen from '../screens/GuardianContextPickerScreen';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    primary: colors.primary,
    text: colors.textPrimary,
    border: colors.border,
  },
};

const Splash = () => (
  <View style={styles.splash}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

const RootNavigator = () => {
  const { status } = useAuth();
  const { gate, generation, activeSchoolId, activeStudentId } = useGuardianContext();

  let content = <AuthStack />;
  if (status === 'loading' || (status === 'authenticated' && (gate === 'idle' || gate === 'resolving'))) {
    content = <Splash />;
  } else if (status === 'authenticated' && gate === 'no_guardian') {
    content = <GuardianBlockedScreen variant="no_guardian" />;
  } else if (status === 'authenticated' && gate === 'no_child') {
    content = <GuardianBlockedScreen variant="no_child" />;
  } else if (status === 'authenticated' && gate === 'error') {
    content = <GuardianBlockedScreen variant="error" />;
  } else if (status === 'authenticated' && gate === 'needs_choice') {
    content = <GuardianContextPickerScreen />;
  } else if (status === 'authenticated' && gate === 'ready') {
    content = <MainTabs key={`${generation}:${activeSchoolId ?? ''}:${activeStudentId ?? ''}`} />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {content}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});

export default RootNavigator;
