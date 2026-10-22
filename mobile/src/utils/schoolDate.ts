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

/**
 * Calendar date `YYYY-MM-DD` that is `days` before `isoDate`.
 * Subtracts on the UTC calendar so the result does not depend on the device timezone.
 * Returns null when `isoDate` is not a real calendar day.
 */
export const schoolDateMinusDays = (isoDate: string, days: number): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match || !Number.isInteger(days) || days < 0) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    return null;
  }

  const shifted = new Date(utc.getTime() - days * 24 * 60 * 60 * 1000);
  const shiftedYear = String(shifted.getUTCFullYear()).padStart(4, '0');
  const shiftedMonth = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const shiftedDay = String(shifted.getUTCDate()).padStart(2, '0');
  const result = `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
};
