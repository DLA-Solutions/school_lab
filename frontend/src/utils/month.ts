import type { MessageKey } from 'locales';

/** Months are passed around as `YYYY-MM` — the same shape the API takes and returns. */

/** The `t` from `useTranslation`, taken as an argument so these stay plain functions. */
type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

/** 1-12, the shape `month.N` keys are indexed by. */
export const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** The month part of a `YYYY-MM`, as a number. */
export const monthNumber = (value: string) => Number(value.split('-')[1]);

/** The month we are in, e.g. "2026-09". */
export const currentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * "2026-09" → "Setembro de 2026" or "September 2026". The month name and the way it joins the
 * year both come from the catalogue, since English does not put a word between them.
 */
export const formatMonth = (value: string, t: Translate) => {
  const [year, month] = value.split('-');
  const name = t(`month.${Number(month)}` as MessageKey);

  return name ? t('month.of', { month: name, year }) : value;
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
