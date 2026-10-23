import { Alert, AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { createNavigationContainerRef } from '@react-navigation/native';
import { t } from '../i18n';
import { MainTabParamList } from '../navigation/types';
import { request } from './api';
import { acceptFcmRegistrationToken, readFcmRegistrationToken } from './fcmRegistrationToken';
import { routineChildSnapshot, switchRoutineChild } from './routineChildSwitch';
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

/** Android 8+ requires a channel before a token or permission prompt is meaningful. */
const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: t('push.channel.name'),
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
};

const mobilePlatform = (): Extract<DeviceTokenPlatform, 'ios' | 'android'> | null => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return null;
};

const warnRegistrationFailed = () => {
  if (__DEV__) {
    console.warn('[push] device token registration failed');
  }
};

type PostedFcmToken = { token: string; platform: 'ios' | 'android' };

let lastPostedFcmToken: PostedFcmToken | null = null;
let registeringDeviceToken = false;

export const resetPostedFcmToken = (): void => {
  lastPostedFcmToken = null;
};

const postFcmToken = async (token: string, platform: 'ios' | 'android'): Promise<void> => {
  const accepted = acceptFcmRegistrationToken(token);
  if (!accepted) {
    return;
  }
  if (lastPostedFcmToken?.token === accepted && lastPostedFcmToken.platform === platform) {
    return;
  }

  await request<RegisterDeviceTokenResponse>('/me/device_tokens', {
    method: 'POST',
    body: {
      device_token: {
        token: accepted,
        platform,
      },
    },
  });
  lastPostedFcmToken = { token: accepted, platform };
};

const confirmNotificationRationale = (): Promise<boolean> =>
  new Promise((resolve) => {
    Alert.alert(
      t('push.rationale.title'),
      t('push.rationale.body'),
      [
        {
          text: t('push.rationale.notNow'),
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: t('push.rationale.continue'),
          onPress: () => resolve(true),
        },
      ],
      { cancelable: false },
    );
  });

const readAndPostFcmToken = async (platform: 'ios' | 'android'): Promise<void> => {
  const token = await readFcmRegistrationToken();
  if (!token) {
    return;
  }
  await postFcmToken(token, platform);
};

/**
 * Requests notification permission when it is still undetermined, then registers this
 * device's FCM token (`POST /me/device_tokens`) for ios or android.
 *
 * Best-effort: permission denial, missing Firebase config, a simulator, or an API
 * failure must not throw. `prompt: false` re-reads only when permission is already
 * granted and does not show the rationale again.
 */
export const registerDeviceToken = async (options: { prompt: boolean }): Promise<void> => {
  if (registeringDeviceToken) {
    return;
  }
  registeringDeviceToken = true;

  try {
    const platform = mobilePlatform();
    if (!platform) {
      return;
    }

    await ensureAndroidChannel();

    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'denied') {
      return;
    }

    if (status !== 'granted') {
      if (status !== 'undetermined' || !options.prompt) {
        return;
      }
      const proceed = await confirmNotificationRationale();
      if (!proceed) {
        return;
      }
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.status !== 'granted') {
        return;
      }
    }

    await readAndPostFcmToken(platform);
  } catch {
    warnRegistrationFailed();
  } finally {
    registeringDeviceToken = false;
  }
};

/**
 * Android FCM rotation. iOS listener payloads are APNs tokens and are ignored.
 * Do not call `getDevicePushTokenAsync` here — it re-enters this listener.
 */
export const subscribeAndroidFcmTokenRefresh = (isSessionActive: () => boolean): (() => void) => {
  const subscription = Notifications.addPushTokenListener((deviceToken) => {
    if (Platform.OS !== 'android' || deviceToken.type !== 'android' || !isSessionActive()) {
      return;
    }
    const token = acceptFcmRegistrationToken(deviceToken.data);
    if (!token) {
      return;
    }
    void postFcmToken(token, 'android').catch(() => {
      warnRegistrationFailed();
    });
  });

  return () => subscription.remove();
};

/** Re-reads the FCM token when the app becomes active and permission is already granted. */
export const subscribeFcmTokenRefreshOnActive = (isSessionActive: () => boolean): (() => void) => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state !== 'active' || !isSessionActive()) {
      return;
    }
    void registerDeviceToken({ prompt: false });
  });

  return () => subscription.remove();
};

/**
 * Message taps use `kind: 'message'` and are queued until MainTabs is mounted.
 * Routine taps open Início, switching the active child only when `student_id` is already linked.
 * `type: 'charge'` queues that charge's detail, or the boletos list when it has no id.
 * A cold start can arrive before the guardian gate is ready.
 */
let mainTabsReady = false;
let pendingConversationId: number | null = null;
let flushingMessageNavigation = false;
let pendingChargeNavigation: PendingChargeNavigation | null = null;
let flushingChargeNavigation = false;
let pendingRoutineNavigation: PendingRoutineNavigation | null = null;
let suppressRoutineSwitch = false;
let routineSwitchInFlight: number | null = null;
let navigationTicket = 0;
let messageTicket = 0;
let chargeTicket = 0;
let routineTicket = 0;
let flushingDeepLinks = false;

type PendingChargeNavigation = { kind: 'detail'; chargeId: number } | { kind: 'list' };
type PendingRoutineNavigation = { studentId: number | null };

/** Positive integer, or a numeric string (FCM data values are often strings). */
const parsePositiveId = (value: unknown): number | null => {
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

const isRoutineMarker = (value: unknown): boolean => value === 'daily_routine' || value === 'routine';

const isRoutineNotification = (payload: PushNotificationDeepLinkData): boolean =>
  isRoutineMarker(payload.kind) ||
  isRoutineMarker(payload.channel_key) ||
  isRoutineMarker(payload.type) ||
  payload.source_type === 'DailyRoutineEntry';

export const clearPendingMessageDeepLink = (): void => {
  pendingConversationId = null;
};

export const clearPendingChargeDeepLink = (): void => {
  pendingChargeNavigation = null;
};

export const clearPendingRoutineDeepLink = (): void => {
  pendingRoutineNavigation = null;
  suppressRoutineSwitch = false;
  routineSwitchInFlight = null;
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

const flushPendingRoutineNavigation = (): void => {
  if (pendingRoutineNavigation == null || !mainTabsReady || !navigationRef.isReady()) {
    return;
  }

  const routeNames = navigationRef.getRootState()?.routeNames;
  if (!routeNames?.includes('Home')) {
    return;
  }

  try {
    navigationRef.navigate('Home');
    pendingRoutineNavigation = null;
    suppressRoutineSwitch = false;
    routineSwitchInFlight = null;
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] failed to open home', error);
    }
  }
};

const routineNeedsChildSwitch = (): boolean => {
  if (suppressRoutineSwitch || !mainTabsReady || pendingRoutineNavigation?.studentId == null) {
    return false;
  }

  const studentId = pendingRoutineNavigation.studentId;
  const snapshot = routineChildSnapshot();
  if (!snapshot.linkedStudentIds.includes(studentId) || snapshot.activeStudentId === studentId) {
    if (routineSwitchInFlight === studentId && snapshot.activeStudentId === studentId) {
      routineSwitchInFlight = null;
    }
    return false;
  }

  return true;
};

const startRoutineChildSwitch = (): void => {
  const studentId = pendingRoutineNavigation?.studentId;
  if (studentId == null || routineSwitchInFlight != null) {
    return;
  }

  routineSwitchInFlight = studentId;
  void switchRoutineChild(studentId).then((switched) => {
    if (switched) {
      return;
    }
    if (pendingRoutineNavigation?.studentId !== studentId) {
      return;
    }
    routineSwitchInFlight = null;
    suppressRoutineSwitch = true;
    flushPendingDeepLinks();
  });
};

/** Flushes queued message, charge, and routine taps. The newer one stays on top. */
export const flushPendingDeepLinks = (): void => {
  if (flushingDeepLinks) {
    return;
  }

  flushingDeepLinks = true;
  try {
    if (routineNeedsChildSwitch()) {
      startRoutineChildSwitch();
      return;
    }

    const steps: { ticket: number; run: () => void }[] = [];
    if (pendingChargeNavigation != null) {
      steps.push({ ticket: chargeTicket, run: flushPendingChargeNavigation });
    }
    if (pendingConversationId != null) {
      steps.push({ ticket: messageTicket, run: flushPendingMessageNavigation });
    }
    if (pendingRoutineNavigation != null) {
      steps.push({ ticket: routineTicket, run: flushPendingRoutineNavigation });
    }
    steps.sort((left, right) => left.ticket - right.ticket);
    for (const step of steps) {
      step.run();
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
  const fromChargeId = parsePositiveId(payload.charge_id);
  if (payload.type === 'charge') {
    const fromId = parsePositiveId(payload.id);
    if (fromId != null) {
      return fromId;
    }
    return fromChargeId;
  }

  return fromChargeId;
};

/** Navigates from a tapped notification's `data` payload — queues until MainTabs is mounted. */
export const navigateFromNotificationData = (data: unknown): void => {
  if (!data || typeof data !== 'object') {
    return;
  }

  const payload = data as PushNotificationDeepLinkData;

  if (payload.kind === 'message') {
    const conversationId = parsePositiveId(payload.conversation_id);
    if (conversationId != null) {
      pendingConversationId = conversationId;
      messageTicket = ++navigationTicket;
      flushPendingDeepLinks();
    }
    return;
  }

  if (isRoutineNotification(payload)) {
    pendingRoutineNavigation = { studentId: parsePositiveId(payload.student_id) };
    suppressRoutineSwitch = false;
    routineTicket = ++navigationTicket;
    flushPendingDeepLinks();
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
