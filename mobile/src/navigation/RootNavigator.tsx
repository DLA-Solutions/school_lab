import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthContext';
import { navigationRef } from '../services/pushNotifications';
import AuthStack from './AuthStack';
import MainDrawer from './MainDrawer';

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

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {status === 'loading' ? <Splash /> : status === 'authenticated' ? <MainDrawer /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});

export default RootNavigator;
