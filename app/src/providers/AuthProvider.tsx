import { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthUser } from '../types/auth';
import { refreshAccessToken } from '../services/api';
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../services/authApi';
import { clearAccessToken, clearRefreshToken, setAccessToken, setRefreshToken } from '../services/tokenStore';
import { AuthContext, AuthStatus, LoginCredentials } from './AuthContext';

const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const bootstrapped = useRef(false);

  // Cold start: no access token in memory yet, only a possible refresh token in
  // SecureStore. Rotate it for a fresh access token and reload the profile.
  useEffect(() => {
    if (bootstrapped.current) {
      return;
    }
    bootstrapped.current = true;

    const restoreSession = async () => {
      try {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          throw new Error('no active session');
        }

        setUser(await fetchCurrentUser());
        setStatus('authenticated');
      } catch {
        clearAccessToken();
        await clearRefreshToken();
        setUser(null);
        setStatus('unauthenticated');
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async ({ email, password, rememberMe }: LoginCredentials) => {
    const tokens = await loginRequest({ email, password, rememberMe });

    setAccessToken(tokens.access_token);
    await setRefreshToken(tokens.refresh_token);
    setUser(tokens.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // The session is dropped locally even if the revoke call fails.
    } finally {
      clearAccessToken();
      await clearRefreshToken();
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
    }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
