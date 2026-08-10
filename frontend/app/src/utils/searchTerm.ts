/**
 * Accent- and case-insensitive matching for text filtered in the browser.
 *
 * Records are filtered by the API, which has its own collation; this is for the lists the SPA
 * holds itself — the menu, mostly — where "matematica" should still find "Matemática".
 */
export const foldForSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

export const matchesTerm = (haystack: string, term: string) =>
  foldForSearch(haystack).includes(foldForSearch(term));
