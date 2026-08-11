import { createContext, useContext } from 'react';
import {
  CATALOGUES,
  DEFAULT_LOCALE,
  format,
  Language,
  LocaleCode,
  MessageKey,
} from 'locales';

export interface I18nContextValue {
  locale: LocaleCode;
  language: Language;
  setLocale: (locale: LocaleCode) => void;
  /** Look up a localized message by key. */
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
}

/**
 * A default that works without a provider, so a component rendered in isolation — a story, a
 * focused unit test — still reads its own strings instead of blowing up or printing keys.
 */
export const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  language: { code: DEFAULT_LOCALE, label: 'Português (Brasil)', flag: 'twemoji:flag-brazil' },
  setLocale: () => {},
  t: (key, values) => format(CATALOGUES[DEFAULT_LOCALE][key] ?? key, values),
});

export const useTranslation = () => useContext(I18nContext);
