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
 * Message taps use `kind: 'message'` and are queued until MainTabs is mounted.
 * `type: 'charge'` queues that charge's detail, or the boletos list when it has no id.
 * A cold start can arrive before the guardian gate is ready.
 */
let mainTabsReady = false;
let pendingConversationId: number | null = null;
let flushingMessageNavigation = false;
let pendingChargeNavigation: PendingChargeNavigation | null = null;
let flushingChargeNavigation = false;
let navigationTicket = 0;
let messageTicket = 0;
let chargeTicket = 0;
let flushingDeepLinks = false;

type PendingChargeNavigation = { kind: 'detail'; chargeId: number } | { kind: 'list' };

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

export const clearPendingChargeDeepLink = (): void => {
  pendingChargeNavigation = null;
};

/** Called from MainTabs. A school/child switch remounts the tabs and flushes again. */
export const setMainTabsNavigationReady = (ready: boolean): void => {
  mainTabsReady = ready;
  if (ready) {
    flushPendingDeepLinks();
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

/**
 * Opens the queued boleto detail, or the list when the charge notification had no id.
 * A failed navigate is swallowed so a tap cannot crash the app.
 */
const flushPendingChargeNavigation = (): void => {
  if (
    flushingChargeNavigation ||
    pendingChargeNavigation == null ||
    !mainTabsReady ||
    !navigationRef.isReady()
  ) {
    return;
  }

  const routeNames = navigationRef.getRootState()?.routeNames;
  if (!routeNames?.includes('Boletos')) {
    return;
  }

  const pending = pendingChargeNavigation;
  flushingChargeNavigation = true;
  try {
    if (pending.kind === 'detail') {
      navigationRef.navigate('Boletos', {
        screen: 'Detail',
        params: { chargeId: pending.chargeId },
        initial: false,
      });
    } else {
      navigationRef.navigate('Boletos', { screen: 'List' });
    }
    pendingChargeNavigation = null;
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] failed to open boleto', error);
    }
  } finally {
    flushingChargeNavigation = false;
  }
};

/** Flushes queued message and charge taps from the same readiness path. The newer one stays on top. */
export const flushPendingDeepLinks = (): void => {
  if (flushingDeepLinks) {
    return;
  }

  flushingDeepLinks = true;
  try {
    if (messageTicket >= chargeTicket) {
      flushPendingChargeNavigation();
      flushPendingMessageNavigation();
    } else {
      flushPendingMessageNavigation();
      flushPendingChargeNavigation();
    }
  } finally {
    flushingDeepLinks = false;
  }
};

/**
 * Charge id from a notification. `id` wins when `type` is `charge`.
 * `charge_id` is only read when it is already on the payload. `conversation_id` is never a charge id.
 */
const chargeIdFromPayload = (payload: PushNotificationDeepLinkData): number | null => {
  const fromChargeId = parseConversationId(payload.charge_id);
  if (payload.type === 'charge') {
    const fromId = parseConversationId(payload.id);
    if (fromId != null) {
      return fromId;
    }
    return fromChargeId;
  }

  return fromChargeId;
};

/** Navigates from a tapped notification's `data` payload — queues until MainTabs is mounted. */
export const navigateFromNotificationData = (data: unknown): void => {
  const payload = (data ?? undefined) as PushNotificationDeepLinkData | undefined;

  if (payload?.kind === 'message') {
    const conversationId = parseConversationId(payload.conversation_id);
    if (conversationId != null) {
      pendingConversationId = conversationId;
      messageTicket = ++navigationTicket;
      flushPendingDeepLinks();
    }
    return;
  }

  if (!payload) {
    return;
  }

  const chargeId = chargeIdFromPayload(payload);
  const isChargeNotification = payload.type === 'charge' || chargeId != null;
  if (!isChargeNotification) {
    if (__DEV__ && payload.type) {
      console.warn(`[push] no route mapped yet for notification type "${payload.type}"`);
    }
    return;
  }

  pendingChargeNavigation = chargeId != null ? { kind: 'detail', chargeId } : { kind: 'list' };
  chargeTicket = ++navigationTicket;
  flushPendingDeepLinks();
};
