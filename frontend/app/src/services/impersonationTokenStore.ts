const IMPERSONATION_TOKEN_KEY = 'impersonation_token';
const IMPERSONATION_EXPIRES_KEY = 'impersonation_access_expires_at';

/** Reads impersonation handoff params from the URL and persists them for the session. */
export const bootstrapImpersonationFromUrl = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const token = params.get('impersonation_token');
  const expiresAt = params.get('access_expires_at');

  if (!token) {
    return false;
  }

  sessionStorage.setItem(IMPERSONATION_TOKEN_KEY, token);

  if (expiresAt) {
    sessionStorage.setItem(IMPERSONATION_EXPIRES_KEY, expiresAt);
  }

  params.delete('impersonation_token');
  params.delete('access_expires_at');

  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', nextUrl);

  return true;
};

export const getStoredImpersonationToken = () => sessionStorage.getItem(IMPERSONATION_TOKEN_KEY);

export const getStoredImpersonationExpiresAt = () =>
  sessionStorage.getItem(IMPERSONATION_EXPIRES_KEY);

export const clearStoredImpersonationToken = () => {
  sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY);
  sessionStorage.removeItem(IMPERSONATION_EXPIRES_KEY);
};

export const isImpersonationSession = () => Boolean(getStoredImpersonationToken());
