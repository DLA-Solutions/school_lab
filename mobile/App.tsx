import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthProvider from './src/providers/AuthProvider';
import GuardianContextProvider from './src/providers/GuardianContextProvider';
import PushNotificationProvider from './src/providers/PushNotificationProvider';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <GuardianContextProvider>
            <PushNotificationProvider>
              <RootNavigator />
            </PushNotificationProvider>
          </GuardianContextProvider>
        </AuthProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
