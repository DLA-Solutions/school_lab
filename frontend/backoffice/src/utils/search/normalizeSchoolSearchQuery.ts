/** Strip CNPJ punctuation so partial digit searches match formatted values in the API. */
export const normalizeSchoolSearchQuery = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const digitsOnly = trimmed.replace(/\D/g, '');

  if (digitsOnly.length >= 8 && digitsOnly.length === trimmed.replace(/[.\-/]/g, '').length) {
    return digitsOnly;
  }

  return trimmed;
};
