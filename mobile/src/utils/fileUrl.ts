import { API_BASE_URL } from '../services/api';

/**
 * Signed Active Storage paths are host-relative (`/rails/active_storage/...`).
 * `API_BASE_URL` already ends in `/api/v1`, which is not a prefix of that path.
 * Strip it and keep an absolute http(s) URL. Already-absolute URLs are unchanged.
 * Callers must not attach the access token or log the result.
 */
export const absoluteStorageUrl = (fileUrl: string | null | undefined): string | null => {
  if (typeof fileUrl !== 'string') {
    return null;
  }

  const trimmed = fileUrl.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return null;
  }

  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const absolute = `${origin}${path}`;
  return /^https?:\/\//i.test(absolute) ? absolute : null;
};
