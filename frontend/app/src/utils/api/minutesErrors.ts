import type { MessageKey } from 'locales';
import { ApiError } from 'services/api';
import { resolveApiErrorMessage } from './resolveApiErrorMessage';

type TranslateFn = (key: MessageKey) => string;

/**
 * `details` comes back as `{ field: ["message", ...] }` (participant errors are keyed
 * `participants.<index>.<field>`). Flattened to one sentence per key; anything else is ignored.
 */
export const flattenErrorDetails = (details: Record<string, unknown> | undefined) => {
  const flat: Record<string, string> = {};

  Object.entries(details ?? {}).forEach(([key, value]) => {
    const messages = (Array.isArray(value) ? value : [value]).filter(
      (item): item is string => typeof item === 'string' && item !== '',
    );

    if (messages.length > 0) {
      flat[key] = messages.join(' ');
    }
  });

  return flat;
};

/**
 * One product-facing sentence for a failed Livro Ata call: `409` (state moved on) and `502`
 * (Autentique unreachable) get their own copy; a `422` surfaces the API's own `details.base`
 * (no signer, signer missing e-mail/CPF, provider refused), already localised by `Accept-Language`.
 */
export const minutesErrorMessage = (err: unknown, t: TranslateFn, fallbackKey: MessageKey) => {
  if (!(err instanceof ApiError)) {
    return t(fallbackKey);
  }

  if (err.status === 409) {
    return t('minutes.error.conflict');
  }

  if (err.status === 502 || err.code === 'provider_error') {
    return t('minutes.error.provider');
  }

  if (err.status === 422) {
    const flat = flattenErrorDetails(err.details);

    return flat.base ?? err.message ?? t(fallbackKey);
  }

  return resolveApiErrorMessage(err, t, fallbackKey);
};
