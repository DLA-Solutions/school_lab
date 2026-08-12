import { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AuthUser } from 'types/auth';
import { refreshAccessToken } from 'services/api';
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from 'services/authApi';
import { clearAccessToken, setAccessToken } from 'services/tokenStore';
import { AuthContext, AuthStatus, LoginCredentials } from './AuthContext';

const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const bootstrapped = useRef(false);

  /**
   * On a page load there is no access token in memory, only the httpOnly refresh cookie.
   * Rotate it for a fresh access token and reload the profile from GET /api/v1/me.
   */
  useEffect(() => {
    if (bootstrapped.current) {
      return;
    }
    // The ref guard keeps the refresh-token rotation from running twice under StrictMode;
    // no per-run cancellation flag, since a discarded result would strand the splash screen.
    bootstrapped.current = true;

    const restoreSession = async () => {
      try {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          throw new Error('no active session');
        }

        const profile = await fetchCurrentUser();
        if (!profile) {
          throw new Error('no active session');
        }

        setUser(profile);
        setStatus('authenticated');
      } catch {
        clearAccessToken();
        setUser(null);
        setStatus('unauthenticated');
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async ({ email, password, rememberMe }: LoginCredentials) => {
    const tokens = await loginRequest({ email, password, rememberMe });

    setAccessToken(tokens.access_token, tokens.access_expires_at);
    setUser(tokens.user);
    setStatus('authenticated');
    return tokens.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // The session is dropped locally even if the revoke call fails.
    } finally {
      clearAccessToken();
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await fetchCurrentUser();
    if (!profile) {
      throw new Error('profile unavailable');
    }

    // Flush before navigation so onboarding guards read the updated memberships.
    flushSync(() => {
      setUser(profile);
      setStatus('authenticated');
    });
    return profile;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
      refreshUser,
    }),
    [user, status, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
