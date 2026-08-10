/**
 * The access token lives in memory only — the refresh token is kept by the API in an
 * httpOnly cookie (`client: 'web'`), so a page reload restores the session through
 * POST /api/v1/auth/refresh instead of reading a token from storage.
 */
let accessToken: string | null = null;
let accessExpiresAt: string | null = null;

export const getAccessToken = () => accessToken;

export const getAccessExpiresAt = () => accessExpiresAt;

export const setAccessToken = (token: string, expiresAt: string) => {
  accessToken = token;
  accessExpiresAt = expiresAt;
};

export const clearAccessToken = () => {
  accessToken = null;
  accessExpiresAt = null;
};
