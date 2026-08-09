/**
 * The API keeps every amount as an integer of cents (`negotiated_amount_cents`), never a float —
 * so conversion happens only at the edges, here.
 */

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 85000 → "R$ 850,00". */
export const formatCents = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? '—' : formatter.format(cents / 100);

/**
 * "850,00" / "R$ 1.250,50" → 125050. Returns null when the input holds no digits, so an empty
 * field stays empty rather than becoming zero.
 */
export const parseCents = (value: string): number | null => {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  return Number(digits);
};

/** Formats digits as they are typed: "85000" → "850,00". Always two decimal places. */
export const formatCentsInput = (value: string) => {
  const cents = parseCents(value);
  if (cents === null) {
    return '';
  }

  // Group the integer part only — running the thousands regex over the whole string would put
  // separators inside the decimals too.
  const [whole, decimals] = (cents / 100).toFixed(2).split('.');

  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimals}`;
};
