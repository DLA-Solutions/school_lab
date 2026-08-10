import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * The access token lives in memory only (short TTL, never worth persisting).
 * The refresh token has no cookie jar to sit in on native, so it goes into the
 * platform keychain/keystore via SecureStore instead. SecureStore has no web
 * implementation (there is no Keychain/Keystore in a browser), so Web falls back to
 * localStorage — fine for local dev, since Web isn't this app's real target.
 */
const REFRESH_TOKEN_KEY = 'school-lab.auth.refresh-token';

let accessToken: string | null = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const clearAccessToken = () => {
  accessToken = null;
};

export const getRefreshToken = (): Promise<string | null> =>
  Platform.OS === 'web'
    ? Promise.resolve(localStorage.getItem(REFRESH_TOKEN_KEY))
    : SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const setRefreshToken = (token: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    return Promise.resolve();
  }
  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
};

export const clearRefreshToken = (): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return Promise.resolve();
  }
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};
