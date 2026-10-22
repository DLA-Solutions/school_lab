/**
 * Format an amount in cents as BRL currency (pt-BR locale).
 * @param cents - Amount in cents
 * @returns Formatted string (e.g., "R$ 1.234,56")
 */
export const formatCurrencyBRL = (cents: number): string => {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  return formatter.format(cents / 100);
};

/**
 * Format an ISO 8601 date string as a human-readable pt-BR date.
 * @param isoDate - ISO 8601 date string (e.g., "2024-12-25T00:00:00Z")
 * @returns Formatted string (e.g., "25 de dezembro de 2024")
 */
export const formatDateBR = (isoDate: string): string => {
  const date = new Date(isoDate);
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return formatter.format(date);
};

/**
 * Format a calendar date `YYYY-MM-DD` in pt-BR from its year/month/day parts.
 * `new Date('YYYY-MM-DD')` is UTC midnight and can show the previous day in America/Sao_Paulo.
 */
export const formatCalendarDateBR = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return '';
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};
