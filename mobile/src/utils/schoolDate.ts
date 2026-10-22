const SCHOOL_TIME_ZONE = 'America/Sao_Paulo';

/**
 * Calendar date `YYYY-MM-DD` in America/Sao_Paulo.
 * That zone is the schema default for `schools.timezone`. Membership payloads carry no
 * timezone, so Início uses this instead of fetching a school record.
 * `en-CA` formats the calendar date as year-month-day; parts are joined so the query
 * value stays `YYYY-MM-DD` even if the formatted string uses a different separator.
 */
export const todayInSchoolTimezone = (now: Date = new Date()): string | null => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: SCHOOL_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
      return null;
    }

    const isoDate = `${year}-${month}-${day}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : null;
  } catch {
    return null;
  }
};
