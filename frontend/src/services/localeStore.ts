import { DEFAULT_LOCALE, LANGUAGES, LocaleCode } from 'locales';

/**
 * The chosen locale, readable outside React.
 *
 * `request()` is a plain function, not a hook, and it has to put `Accept-Language` on every call
 * so an error printed under a field arrives in the same language as the field's own label. It
 * therefore needs the locale without a component around it — the same reason `tokenStore` exists.
 *
 * The choice is remembered across reloads: a school that works in Portuguese should not re-pick
 * it every morning.
 */
export const LOCALE_STORAGE_KEY = 'school-lab-locale';

const isLocale = (value: string | null): value is LocaleCode =>
  LANGUAGES.some((language) => language.code === value);

const readStoredLocale = (): LocaleCode => {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);

    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    // Storage can be unavailable — private browsing, a locked-down profile. The default is a
    // working answer, so this is not worth failing over.
    return DEFAULT_LOCALE;
  }
};

let locale: LocaleCode = readStoredLocale();

export const getLocale = () => locale;

export const setLocale = (next: LocaleCode) => {
  locale = next;

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    // Not remembering the choice is a smaller failure than refusing to make it.
  }
};
