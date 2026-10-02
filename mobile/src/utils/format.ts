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
