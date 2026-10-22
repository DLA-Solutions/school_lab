import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { createNavigationContainerRef } from '@react-navigation/native';
import { MainTabParamList } from '../navigation/types';
import { request } from './api';
import { DeviceTokenPlatform, PushNotificationDeepLinkData, RegisterDeviceTokenResponse } from '../types/pushNotifications';

/**
 * Shared with `RootNavigator` (`ref={navigationRef}` on `NavigationContainer`) so a
 * notification tap can navigate without a screen having to pass its own `navigation`
 * prop down to a listener that lives outside the render tree.
 */
export const navigationRef = createNavigationContainerRef<MainTabParamList>();

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
 * `type: 'charge'` opens the Boletos tab. Message taps use `kind: 'message'` and are queued
 * until MainTabs is mounted — a cold start can arrive before the guardian gate is ready.
 */
const DEEP_LINK_ROUTES: Partial<Record<string, keyof MainTabParamList>> = {
  charge: 'Boletos',
};

let mainTabsReady = false;
let pendingConversationId: number | null = null;
let flushingMessageNavigation = false;

/** Positive integer, or a numeric string (FCM data values are often strings). */
const parseConversationId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && /^[0-9]+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

export const clearPendingMessageDeepLink = (): void => {
  pendingConversationId = null;
};

/** Called from MainTabs. A school/child switch remounts the tabs and flushes again. */
export const setMainTabsNavigationReady = (ready: boolean): void => {
  mainTabsReady = ready;
  if (ready) {
    flushPendingMessageNavigation();
  }
};

/**
 * Opens the queued thread only when the container is ready and the authenticated tab tree
 * is mounted. A failed navigate is swallowed so a tap cannot crash the app.
 */
export const flushPendingMessageNavigation = (): void => {
  if (
    flushingMessageNavigation ||
    pendingConversationId == null ||
    !mainTabsReady ||
    !navigationRef.isReady()
  ) {
    return;
  }

  const routeNames = navigationRef.getRootState()?.routeNames;
  if (!routeNames?.includes('Messages')) {
    return;
  }

  const conversationId = pendingConversationId;
  flushingMessageNavigation = true;
  try {
    navigationRef.navigate('Messages', {
      screen: 'Thread',
      params: { conversationId },
      initial: false,
    });
    pendingConversationId = null;
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] failed to open message thread', error);
    }
  } finally {
    flushingMessageNavigation = false;
  }
};

/** Navigates from a tapped notification's `data` payload — no-ops if unmapped or not ready. */
export const navigateFromNotificationData = (data: unknown): void => {
  const payload = (data ?? undefined) as PushNotificationDeepLinkData | undefined;

  if (payload?.kind === 'message') {
    const conversationId = parseConversationId(payload.conversation_id);
    if (conversationId != null) {
      pendingConversationId = conversationId;
      flushPendingMessageNavigation();
    }
    return;
  }

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
    if (routeName === 'Boletos') {
      navigationRef.navigate('Boletos');
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] failed to navigate from notification tap', error);
    }
  }
};
