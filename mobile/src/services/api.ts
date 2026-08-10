import { ApiErrorBody, RefreshResponse } from '../types/auth';
import {
  clearAccessToken,
  clearRefreshToken,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from './tokenStore';

/**
 * Base already includes /api/v1 (see .env.example) so call sites use short paths like
 * '/auth/login'. iOS Simulator can reach the host's localhost directly; an Android
 * emulator needs 10.0.2.2 instead — see README.
 */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/$/, '');

/** The API tags every error response with `{ error: { code, message, details } }`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the bearer access token (default true). */
  auth?: boolean;
  /** Refresh the access token and replay the request once on a 401 (default true). */
  retryOnUnauthorized?: boolean;
}

const parseBody = async (response: Response) => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const toApiError = (response: Response, body: unknown) => {
  const error = (body as ApiErrorBody | null)?.error;

  return new ApiError(
    response.status,
    error?.code ?? 'unexpected_error',
    error?.message ?? `Request failed with status ${response.status}`,
    error?.details ?? {},
  );
};

const send = async (path: string, { method = 'GET', body, auth = true }: RequestOptions) => {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const accessToken = getAccessToken();
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
};

/**
 * Rotates the refresh token for a new access token. Short-circuits without a network
 * call when there is nothing in SecureStore yet (cold start, never logged in).
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await send('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken, client: 'mobile' },
    auth: false,
  });

  const body = await parseBody(response);

  if (!response.ok) {
    clearAccessToken();
    await clearRefreshToken();
    return false;
  }

  const tokens = body as RefreshResponse | null;
  if (!tokens?.access_token || !tokens.refresh_token) {
    clearAccessToken();
    await clearRefreshToken();
    return false;
  }

  setAccessToken(tokens.access_token);
  await setRefreshToken(tokens.refresh_token);
  return true;
};

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { retryOnUnauthorized = true, ...rest } = options;
  let response = await send(path, rest);

  if (response.status === 401 && retryOnUnauthorized && rest.auth !== false) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await send(path, rest);
    }
  }

  const body = await parseBody(response);

  if (!response.ok) {
    throw toApiError(response, body);
  }

  return body as T;
};
