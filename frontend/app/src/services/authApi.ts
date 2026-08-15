import { AuthUser, LoginResponse, MeResponse } from 'types/auth';
import { parseAuthUser } from './parseAuthUser';
import { request } from './api';

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/** POST /api/v1/auth/login */
export const login = async ({ email, password, rememberMe = false }: LoginPayload) => {
  const response = await request<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password, remember_me: rememberMe, client: 'web' },
  });

  return { ...response, user: parseAuthUser(response.user)! };
};

/** GET /api/v1/me */
export const fetchCurrentUser = async (): Promise<AuthUser | null> => {
  const response = await request<MeResponse>('/api/v1/me', { retryOnUnauthorized: false });
  return parseAuthUser(response.data);
};

/** POST /api/v1/auth/logout — revokes the refresh token and clears the cookie. */
export const logout = () =>
  request<null>('/api/v1/auth/logout', { method: 'POST', retryOnUnauthorized: false });

/**
 * POST /api/v1/auth/access — a guardian asking for their own way in, by the CPF the school
 * registered them under.
 *
 * Always resolves, whatever the CPF. The API deliberately answers the same for a match, a miss
 * and a deactivated guardian, so nothing here can be used to find out who is registered.
 */
export const requestGuardianAccess = (cpf: string) =>
  request<null>('/api/v1/auth/access', { method: 'POST', body: { cpf } });

/** POST /api/v1/auth/password — mails a reset link. Answers the same for an unknown address. */
export const requestPasswordReset = (email: string) =>
  request<null>('/api/v1/auth/password', { method: 'POST', body: { email } });

/** POST /api/v1/auth/password/reset — exchanges the token from that mail for a new password. */
export const resetPassword = (payload: {
  token: string;
  password: string;
  password_confirmation: string;
}) => request<null>('/api/v1/auth/password/reset', { method: 'POST', body: payload });
