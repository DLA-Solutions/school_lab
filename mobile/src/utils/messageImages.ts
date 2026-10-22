const TEXT_FIELDS = new Set(['body', 'sender_line', 'sent_at']);
const ABSOLUTE_HTTP_URL = /^https?:\/\/\S+$/i;

/**
 * Absolute http(s) URLs on fields the text renderer does not already show.
 * The current message blueprint has none of these; when one is absent, the thread is text only.
 */
export const messageImageUrls = (message: object): string[] => {
  const urls: string[] = [];

  for (const [key, value] of Object.entries(message)) {
    if (TEXT_FIELDS.has(key) || typeof value !== 'string') {
      continue;
    }

    if (ABSOLUTE_HTTP_URL.test(value)) {
      urls.push(value);
    }
  }

  return urls;
};
