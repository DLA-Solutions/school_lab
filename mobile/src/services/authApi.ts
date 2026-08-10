import { AuthUser, LoginResponse, MeResponse } from '../types/auth';
import { request } from './api';
import { getRefreshToken } from './tokenStore';

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/** POST /api/v1/auth/login */
export const login = ({ email, password, rememberMe = false }: LoginPayload) =>
  request<LoginResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password, remember_me: rememberMe, client: 'mobile' },
  });

/** GET /api/v1/me */
export const fetchCurrentUser = async (): Promise<AuthUser> => {
  const response = await request<MeResponse>('/me', { retryOnUnauthorized: false });
  return response.data;
};

/**
 * POST /api/v1/auth/logout — revokes this device's refresh token. Passing it explicitly
 * (rather than omitting it) keeps other logged-in sessions, e.g. the web app, alive.
 */
export const logout = async () => {
  const refreshToken = await getRefreshToken();
  return request<null>('/auth/logout', {
    method: 'POST',
    retryOnUnauthorized: false,
    body: refreshToken ? { refresh_token: refreshToken } : undefined,
  });
};
