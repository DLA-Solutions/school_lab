import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { createNavigationContainerRef } from '@react-navigation/native';
import { request } from './api';
import { DeviceTokenPlatform, PushNotificationDeepLinkData, RegisterDeviceTokenResponse } from '../types/pushNotifications';

/**
 * Shared with `RootNavigator` (`ref={navigationRef}` on `NavigationContainer`) so a
 * notification tap can navigate without a screen having to pass its own `navigation`
 * prop down to a listener that lives outside the render tree.
 */
export const navigationRef = createNavigationContainerRef();

/**
 * Foreground presentation — without this, expo-notifications shows nothing while the
 * app is open (see expo-notifications docs: "the default behavior when the handler is
 * not set ... is not to show the notification").
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL_ID = 'default';

/** Android 8+ requires a channel before a token/permission prompt is meaningful. */
const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Geral',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
};

const toBackendPlatform = (): DeviceTokenPlatform => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
};

/**
 * Requests notification permission and, if granted, registers this device's native
 * push token with the API (`POST /me/device_tokens`).
 *
 * Uses `getDevicePushTokenAsync` (the raw FCM registration token on Android / APNs
 * token on iOS) rather than `getExpoPushTokenAsync` (Expo's own push-service proxy
 * token). The backend `DeviceToken#token` column expects a raw platform token, and
 * the FCM send pipeline (`docs/web-stack.md` "Push notifications") talks to Firebase
 * directly rather than through Expo's push service — so the device token is the
 * right fit here. Revisit only if the gateway is deliberately changed to send via
 * Expo's push API instead (it would then need `getExpoPushTokenAsync` + a
 * `projectId`).
 *
 * Best-effort: permission denial, a simulator without push capability, or a
 * transient API failure must never block app usage, so failures are swallowed here
 * (logged in dev only) rather than thrown.
 */
export const registerDeviceToken = async (): Promise<void> => {
  try {
    await ensureAndroidChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') {
      return;
    }

    const devicePushToken = await Notifications.getDevicePushTokenAsync();

    await request<RegisterDeviceTokenResponse>('/me/device_tokens', {
      method: 'POST',
      body: {
        device_token: {
          token: devicePushToken.data,
          platform: toBackendPlatform(),
        },
      },
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] device token registration failed', error);
    }
  }
};

/**
 * Routes not yet built (e.g. a message thread or a charge detail screen — see
 * `mobile/src/navigation/MainDrawer.tsx`) have no mapping here on purpose: navigating
 * to an unregistered route name throws. Extend this map as those screens ship instead
 * of guessing their eventual names.
 */
const DEEP_LINK_ROUTES: Partial<Record<string, string>> = {
  charge: 'Boletos',
};

/** Navigates from a tapped notification's `data` payload — no-ops if unmapped or not ready. */
export const navigateFromNotificationData = (data: unknown): void => {
  const payload = data as PushNotificationDeepLinkData | undefined;
  const routeName = payload?.type ? DEEP_LINK_ROUTES[payload.type] : undefined;

  if (!routeName) {
    if (__DEV__ && payload?.type) {
      console.warn(`[push] no route mapped yet for notification type "${payload.type}"`);
    }
    return;
  }

  if (!navigationRef.isReady()) {
    return;
  }

  try {
    navigationRef.navigate(routeName as never);
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] failed to navigate from notification tap', error);
    }
  }
};
