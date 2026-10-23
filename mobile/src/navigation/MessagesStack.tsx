import { Pressable, StyleSheet, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { t } from '../i18n';
import { useAuth } from '../providers/AuthContext';
import AnnouncementDetailScreen from '../screens/AnnouncementDetailScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import MessageThreadScreen from '../screens/MessageThreadScreen';
import MessagesScreen from '../screens/MessagesScreen';
import { colors } from '../theme/colors';
import { MessagesStackParamList } from './types';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

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

const MessagesStack = () => (
  <Stack.Navigator
    initialRouteName="Inbox"
    screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.textPrimary,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
      headerRight: () => <SignOutButton />,
    }}
  >
    <Stack.Screen name="Inbox" component={MessagesScreen} options={{ title: t('tabs.messages') }} />
    <Stack.Screen
      name="Thread"
      component={MessageThreadScreen}
      options={{ title: t('tabs.messages') }}
    />
    <Stack.Screen
      name="Announcements"
      component={AnnouncementsScreen}
      options={{ title: t('announcements.title') }}
    />
    <Stack.Screen
      name="AnnouncementDetail"
      component={AnnouncementDetailScreen}
      options={{ title: t('announcements.title') }}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  signOut: { marginRight: 16, paddingVertical: 8 },
  signOutLabel: { color: colors.primary, fontSize: 16, fontWeight: '600' },
});

export default MessagesStack;
