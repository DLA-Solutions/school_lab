import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const EXPO_PUSH_TOKEN_MARK = 'ExponentPushToken';
const EXPO_PUSH_TOKEN_ALT = 'ExpoPushToken';
const RAW_APNS_TOKEN = /^[0-9a-fA-F]{64}$/;

/**
 * Accepts an FCM registration token.
 * Rejects non-strings, blank values, Expo push tokens, and a raw APNs device token.
 * Never logs the value.
 */
export const acceptFcmRegistrationToken = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const token = value.trim();
  if (token.length === 0) {
    return null;
  }

  if (token.includes(EXPO_PUSH_TOKEN_MARK) || token.includes(EXPO_PUSH_TOKEN_ALT)) {
    return null;
  }

  if (RAW_APNS_TOKEN.test(token)) {
    return null;
  }

  return token;
};

const readIosFcmRegistrationToken = async (): Promise<string | null> => {
  try {
    const nativeModule = await import('../../modules/fcm-registration-token');
    return acceptFcmRegistrationToken(await nativeModule.getRegistrationToken());
  } catch {
    return null;
  }
};

/**
 * Android: `getDevicePushTokenAsync` is FirebaseMessaging.getInstance().token.
 * iOS: the local module reads Messaging.messaging().token. This function does not
 * call `getDevicePushTokenAsync` or `getExpoPushTokenAsync` on iOS.
 */
export const readFcmRegistrationToken = async (): Promise<string | null> => {
  if (Platform.OS === 'android') {
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    if (devicePushToken.type !== 'android') {
      return null;
    }
    return acceptFcmRegistrationToken(devicePushToken.data);
  }

  if (Platform.OS === 'ios') {
    return readIosFcmRegistrationToken();
  }

  return null;
};
