/** Civil date in America/Sao_Paulo, `YYYY-MM-DD`, matching `DailyRoutine.today`. */
export const civilToday = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

/** `YYYY-MM-DD` compared as text is chronological. A date before today is locked. */
export const isBeforeCivilToday = (date: string, today: string = civilToday()) => date < today;

export const formatCivilDate = (isoDate: string, locale: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }

  return new Date(year, month - 1, day).toLocaleDateString(locale);
};
