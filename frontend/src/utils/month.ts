/** Months are passed around as `YYYY-MM` — the same shape the API takes and returns. */

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** Short labels for a chart axis, in the same order. */
export const SHORT_MONTH_NAMES = MONTH_NAMES.map((name) => name.slice(0, 3));

/** The month we are in, e.g. "2026-09". */
export const currentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/** "2026-09" → "Setembro de 2026". */
export const formatMonth = (value: string) => {
  const [year, month] = value.split('-');
  const name = MONTH_NAMES[Number(month) - 1];

  return name ? `${name} de ${year}` : value;
};

/** "2026-01" → "2025-12". */
export const previousMonth = (value: string) => {
  const [year, index] = value.split('-').map(Number);
  const date = new Date(year, index - 2, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/** The last `count` months, most recent first. */
export const recentMonths = (count: number) => {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
};

/** How many days the month has — the upper bound of a month-wide date filter. */
export const lastDayOfMonth = (value: string) => {
  const [year, index] = value.split('-').map(Number);

  return new Date(year, index, 0).getDate();
};
