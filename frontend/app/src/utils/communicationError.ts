import { MessageKey } from 'locales';
import { ApiError } from 'services/api';

const CODE_KEYS: Record<string, MessageKey> = {
  file_too_large: 'communication.errors.fileTooLarge',
  too_many_files: 'communication.errors.tooManyFiles',
  unsupported_media_type: 'communication.errors.unsupportedMediaType',
  empty_content: 'communication.errors.emptyContent',
  routine_day_locked: 'communication.errors.routineDayLocked',
  not_infantil: 'communication.errors.notInfantil',
  routine_already_sent: 'communication.errors.routineAlreadySent',
  discomfort_detail_required: 'communication.errors.discomfortDetailRequired',
  not_found: 'communication.errors.notFound',
};

/** Known API codes become product copy. Anything else keeps the message the API already translated. */
export const communicationErrorText = (
  error: unknown,
  t: (key: MessageKey) => string,
  fallback: MessageKey,
) => {
  if (error instanceof ApiError) {
    const key = CODE_KEYS[error.code];
    if (key) {
      return t(key);
    }

    if (error.message) {
      return error.message;
    }
  }

  return t(fallback);
};
