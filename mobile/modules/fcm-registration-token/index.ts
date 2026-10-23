import { requireOptionalNativeModule } from 'expo-modules-core';

type FcmRegistrationTokenNativeModule = {
  getRegistrationToken(): Promise<string | null>;
};

/**
 * iOS only. Android JS must not call this; the app reads the FCM token from
 * expo-notifications on Android. A missing plist, unconfigured Firebase, or an
 * unlinked module resolves null.
 */
export const getRegistrationToken = async (): Promise<string | null> => {
  try {
    const nativeModule = requireOptionalNativeModule<FcmRegistrationTokenNativeModule>(
      'FcmRegistrationToken',
    );
    if (!nativeModule) {
      return null;
    }
    const token = await nativeModule.getRegistrationToken();
    return typeof token === 'string' ? token : null;
  } catch {
    return null;
  }
};
