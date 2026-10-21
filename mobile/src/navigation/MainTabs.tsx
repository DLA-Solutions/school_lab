import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { t } from '../i18n';
import { useAuth } from '../providers/AuthContext';
import { colors } from '../theme/colors';
import HomeScreen from '../screens/HomeScreen';
import MessagesScreen from '../screens/MessagesScreen';
import BoletosTabScreen from '../screens/BoletosTabScreen';
import ChildScreen from '../screens/ChildScreen';

export type MainTabParamList = {
  Home: undefined;
  Messages: undefined;
  Boletos: undefined;
  Child: undefined;
};

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof MainTabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Messages: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Boletos: { active: 'document-text', inactive: 'document-text-outline' },
  Child: { active: 'person', inactive: 'person-outline' },
};

const Tab = createBottomTabNavigator<MainTabParamList>();

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

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => {
      const icons = TAB_ICONS[route.name];

      return {
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        headerRight: () => <SignOutButton />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.background },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />
        ),
      };
    }}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tabs.home'), title: t('tabs.home') }} />
    <Tab.Screen
      name="Messages"
      component={MessagesScreen}
      options={{ tabBarLabel: t('tabs.messages'), title: t('tabs.messages') }}
    />
    <Tab.Screen
      name="Boletos"
      component={BoletosTabScreen}
      options={{ tabBarLabel: t('tabs.boletos'), title: t('tabs.boletos') }}
    />
    <Tab.Screen name="Child" component={ChildScreen} options={{ tabBarLabel: t('tabs.child'), title: t('tabs.child') }} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  signOut: { marginRight: 16, paddingVertical: 8 },
  signOutLabel: { color: colors.primary, fontSize: 16, fontWeight: '600' },
});

export default MainTabs;
