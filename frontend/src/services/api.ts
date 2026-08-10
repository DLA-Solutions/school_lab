import { ApiErrorBody, RefreshResponse } from 'types/auth';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:3000' : '');

/**
 * Locale the API resolves its i18n error messages against (`docs/api/README.md` → Locale).
 * The product UI locale is pt-BR; the tag is data, not an identifier.
 */
export const API_LOCALE = 'pt-BR';

/**
 * Turns a host-relative path the API returns — Active Storage blobs come back with
 * `only_path: true` — into something the browser can actually fetch. The SPA is served from
 * another origin in development, so a bare `/rails/active_storage/...` resolves against the SPA
 * and 404s: the image simply fails to render, which is how the contract logo looked broken.
 *
 * An absolute URL is handed back untouched, so a provider-hosted file passes through.
 */
export const apiAssetUrl = (path: string | null | undefined) => {
  if (!path) {
    return null;
  }

  return /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path}`;
};

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
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': API_LOCALE,
  };

  // File uploads go up as multipart. The Content-Type must be left to the browser: it is the only
  // party that knows the boundary token it generated for the body.
  const isMultipart = typeof FormData !== 'undefined' && body instanceof FormData;

  if (body !== undefined && !isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const accessToken = getAccessToken();
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined || isMultipart ? (body as BodyInit | undefined) : JSON.stringify(body),
    // Required so the httpOnly refresh cookie is sent and accepted.
    credentials: 'include',
  });
};

/**
 * Rotates the refresh cookie for a new access token. Kept here (and not in authApi) so
 * `request` can transparently recover from an expired access token without a circular import.
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  const response = await send('/api/v1/auth/refresh', {
    method: 'POST',
    body: { client: 'web' },
    auth: false,
  });

  const body = await parseBody(response);

  if (!response.ok) {
    clearAccessToken();
    return false;
  }

  const tokens = body as RefreshResponse | null;
  if (!tokens?.access_token) {
    clearAccessToken();
    return false;
  }

  setAccessToken(tokens.access_token, tokens.access_expires_at);
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
