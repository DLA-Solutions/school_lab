import { PropsWithChildren, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import { navigateFromNotificationData, registerDeviceToken } from '../services/pushNotifications';

/**
 * Registers this device's push token once the user is authenticated (not before —
 * `POST /me/device_tokens` requires an authenticated `Current.user`), and wires
 * foreground display plus tap-to-navigate handling for background and cold-start
 * opens. Mount inside `AuthProvider` (it reads `useAuth`), wrapping `RootNavigator`.
 */
const PushNotificationProvider = ({ children }: PropsWithChildren) => {
  const { isAuthenticated } = useAuth();
  const registeredRef = useRef(false);

  // Register once per authenticated session; re-arms on the next login after a logout.
  useEffect(() => {
    if (!isAuthenticated) {
      registeredRef.current = false;
      return;
    }

    if (registeredRef.current) {
      return;
    }
    registeredRef.current = true;

    registerDeviceToken();
  }, [isAuthenticated]);

  useEffect(() => {
    // Cold start: the app was launched by tapping a notification (not running in
    // background/foreground when the tap happened). Synchronous in this SDK —
    // `getLastNotificationResponseAsync` is the deprecated counterpart.
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      navigateFromNotificationData(lastResponse.notification.request.content.data);
    }

    // Warm tap: app was backgrounded or foregrounded when the notification was tapped.
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotificationData(response.notification.request.content.data);
    });

    // Foreground delivery: presentation is handled by setNotificationHandler in
    // services/pushNotifications.ts. There is no in-app notification inbox screen to
    // refresh yet (BC4 UC-N04 is not in the mobile MVP scope), so nothing else to do
    // here — the listener only needs to exist so expo-notifications doesn't warn
    // about an unhandled foreground notification.
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {});

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, []);

  return <>{children}</>;
};

export default PushNotificationProvider;
