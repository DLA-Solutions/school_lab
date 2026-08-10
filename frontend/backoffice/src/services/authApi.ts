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
