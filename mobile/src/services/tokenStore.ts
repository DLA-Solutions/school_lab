import * as SecureStore from 'expo-secure-store';

/**
 * The access token lives in memory only (short TTL, never worth persisting).
 * The refresh token has no cookie jar on iOS or Android, so it is stored in
 * the platform keychain/keystore via expo-secure-store.
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
  SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const setRefreshToken = (token: string): Promise<void> =>
  SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);

export const clearRefreshToken = (): Promise<void> =>
  SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
