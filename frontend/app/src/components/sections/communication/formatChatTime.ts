export const formatChatTime = (sentAt: string, locale: string) => {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) {
    return sentAt;
  }

  return date.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PREVIEW_LIMIT = 80;

/** One line of the last message, cut so a long note does not take over the inbox row. */
export const messagePreview = (body: string | null | undefined) => {
  if (!body) {
    return null;
  }

  const trimmed = body.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= PREVIEW_LIMIT) {
    return trimmed;
  }

  return `${trimmed.slice(0, PREVIEW_LIMIT - 1)}…`;
};
