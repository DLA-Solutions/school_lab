import { Pressable, StyleSheet, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { t } from '../i18n';
import { useAuth } from '../providers/AuthContext';
import BoletosScreen from '../screens/BoletosScreen';
import ChargeDetailScreen from '../screens/ChargeDetailScreen';
import { colors } from '../theme/colors';
import { BoletosStackParamList } from './types';

const Stack = createNativeStackNavigator<BoletosStackParamList>();

const SignOutButton = () => {
  const { logout } = useAuth();

  return (
    <Pressable
      onPress={() => {
        void logout();
      }}
      accessibilityRole="button"
      style={styles.signOut}
    >
      <Text style={styles.signOutLabel}>{t('auth.signOut')}</Text>
    </Pressable>
  );
};

const BoletosStack = () => (
  <Stack.Navigator
    initialRouteName="List"
    screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.textPrimary,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
      headerRight: () => <SignOutButton />,
    }}
  >
    <Stack.Screen name="List" component={BoletosScreen} options={{ title: t('tabs.boletos') }} />
    <Stack.Screen name="Detail" component={ChargeDetailScreen} options={{ title: t('tabs.boletos') }} />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  signOut: { marginRight: 16, paddingVertical: 8 },
  signOutLabel: { color: colors.primary, fontSize: 16, fontWeight: '600' },
});

export default BoletosStack;
