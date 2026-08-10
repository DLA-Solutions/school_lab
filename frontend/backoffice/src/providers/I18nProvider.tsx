import { PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { CATALOGUES, format, languageFor, LocaleCode, MessageKey } from 'locales';
import { getLocale, setLocale as persistLocale } from 'services/localeStore';
import { I18nContext, I18nContextValue } from './I18nContext';

/**
 * Holds the chosen language and hands `t` to the tree below.
 *
 * The choice is written to `localeStore` as well as to state, because `request()` reads it from
 * there to set `Accept-Language` — so switching the flag changes both what the screen says and
 * what language the API answers validation errors in.
 */
const I18nProvider = ({ children }: PropsWithChildren) => {
  const [locale, setLocaleState] = useState<LocaleCode>(getLocale);

  const setLocale = useCallback((next: LocaleCode) => {
    persistLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const catalogue = CATALOGUES[locale];

    return {
      locale,
      language: languageFor(locale),
      setLocale,
      // An unknown key renders as itself rather than as `undefined`: a missing translation should
      // read as an obvious mistake on screen, not as a blank where a label belongs.
      t: (key: MessageKey, values?: Record<string, string | number>) =>
        format(catalogue[key] ?? key, values),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export default I18nProvider;
