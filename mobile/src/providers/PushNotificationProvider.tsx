import { PropsWithChildren, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import { useGuardianContext } from './GuardianContext';
import {
  clearPendingChargeDeepLink,
  clearPendingMessageDeepLink,
  clearPendingRoutineDeepLink,
  navigateFromNotificationData,
  registerDeviceToken,
  resetPostedFcmToken,
  subscribeAndroidFcmTokenRefresh,
  subscribeFcmTokenRefreshOnActive,
} from '../services/pushNotifications';

const canRegisterPush = (isAuthenticated: boolean, gate: string): boolean =>
  isAuthenticated && (gate === 'ready' || gate === 'needs_choice' || gate === 'no_child');

/**
 * Registers this device's FCM token once a guardian session can use the app, and wires
 * foreground display plus tap-to-navigate handling. Mount inside `AuthProvider` and
 * `GuardianContextProvider`. Teachers and staff (`no_guardian`) are not registered.
 */
const PushNotificationProvider = ({ children }: PropsWithChildren) => {
  const { isAuthenticated } = useAuth();
  const { gate } = useGuardianContext();
  const promptedRef = useRef(false);
  const authenticatedRef = useRef(false);
  const sessionRef = useRef(false);

  const sessionActive = canRegisterPush(isAuthenticated, gate);
  sessionRef.current = sessionActive;

  useEffect(() => {
    if (!isAuthenticated) {
      promptedRef.current = false;
      resetPostedFcmToken();
      return;
    }

    if (!sessionActive || promptedRef.current) {
      return;
    }
    promptedRef.current = true;
    void registerDeviceToken({ prompt: true });
  }, [isAuthenticated, sessionActive]);

  useEffect(() => subscribeAndroidFcmTokenRefresh(() => sessionRef.current), []);

  useEffect(() => subscribeFcmTokenRefreshOnActive(() => sessionRef.current), []);

  // Drop queued message, charge, and routine deep links only after a real logout. The first
  // paint is unauthenticated while the session restores, and that must not discard a cold-start tap.
  useEffect(() => {
    if (isAuthenticated) {
      authenticatedRef.current = true;
      return;
    }

    if (authenticatedRef.current) {
      authenticatedRef.current = false;
      clearPendingMessageDeepLink();
      clearPendingChargeDeepLink();
      clearPendingRoutineDeepLink();
    }
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
