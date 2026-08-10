/**
 * CPF and CEP helpers, mirroring `web/app/models/concerns/cpf.rb`.
 *
 * The API stores both as bare digits and validates the CPF check digits server-side. Repeating
 * the rules here is not a substitute for that — it is what lets the form reject a typo before a
 * round trip, and what formats the stored digits back into the shape people read.
 */

const onlyDigits = (value: string) => value.replace(/\D/g, '');

export const normalizeCpf = (value: string) => onlyDigits(value).slice(0, 11);

/** "12345678909" → "123.456.789-09". Partial input is formatted as far as it goes, so the mask
 *  builds up while typing instead of snapping into place at the eleventh digit. */
export const formatCpf = (value: string | null | undefined) => {
  const digits = normalizeCpf(value ?? '');

  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
};

const checkDigit = (digits: number[]) => {
  const weight = digits.length + 1;
  const sum = digits.reduce((total, digit, index) => total + digit * (weight - index), 0);
  const remainder = (sum * 10) % 11;

  return remainder === 10 ? 0 : remainder;
};

/** The two trailing check digits are what separate a real CPF from any 11-digit string. */
export const isValidCpf = (value: string | null | undefined) => {
  const digits = normalizeCpf(value ?? '');
  if (digits.length !== 11) {
    return false;
  }
  // Repdigits satisfy the arithmetic by accident.
  if (new Set(digits).size === 1) {
    return false;
  }

  const numbers = digits.split('').map(Number);

  return (
    numbers[9] === checkDigit(numbers.slice(0, 9)) &&
    numbers[10] === checkDigit(numbers.slice(0, 10))
  );
};

export const normalizeZipCode = (value: string) => onlyDigits(value).slice(0, 8);

/** "01310100" → "01310-100". */
export const formatZipCode = (value: string | null | undefined) =>
  normalizeZipCode(value ?? '').replace(/^(\d{5})(\d)/, '$1-$2');

/** The 26 states plus the Federal District, as the API's `state` check constraint expects them. */
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;
