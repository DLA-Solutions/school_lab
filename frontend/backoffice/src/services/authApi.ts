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

export interface ChangePasswordPayload {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

/**
 * PUT /api/v1/auth/password — the signed-in user changing their own password.
 *
 * The API revokes every refresh token on success, so the caller must treat a resolved promise
 * as the end of the session and send the user back to the login screen.
 */
export const changePassword = ({
  currentPassword,
  password,
  passwordConfirmation,
}: ChangePasswordPayload) =>
  request<null>('/api/v1/auth/password', {
    method: 'PUT',
    body: {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    },
  });
