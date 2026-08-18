import type { MessageKey } from 'locales';
import { ApiError } from 'services/api';

type TranslateFn = (key: MessageKey) => string;

/** Maps known API error codes to product-facing messages; falls back to the API message or locale key. */
export const resolveApiErrorMessage = (
  err: unknown,
  t: TranslateFn,
  fallbackKey: MessageKey,
): string => {
  if (!(err instanceof ApiError)) {
    return t(fallbackKey);
  }

  if (err.status === 404 && err.code === 'not_found') {
    return t('errors.schoolAccessDenied');
  }

  if (err.status === 403 && err.code === 'forbidden') {
    return t('errors.accessDenied');
  }

  if (err.code === 'membership_suspended') {
    return t('errors.membershipSuspended');
  }

  if (err.code === 'membership_invited') {
    return t('errors.membershipInvited');
  }

  return err.message || t(fallbackKey);
};
