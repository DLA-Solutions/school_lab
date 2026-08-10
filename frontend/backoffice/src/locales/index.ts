import ptBR from './pt-BR';
import enUS from './en-US';

/**
 * The locales the product ships in.
 *
 * pt-BR is the default: the schools using this are Brazilian, and Portuguese is what a screen
 * should read in before anyone touches the flag. English (US) is a real second locale, not a
 * decoration — the menu used to offer four languages that translated nothing, and picking one
 * only changed the flag.
 *
 * A message is looked up by key. `ptBR` is the source of truth for what keys exist; `Messages`
 * is derived from it, so an English catalogue missing a key fails to compile rather than
 * shipping a Portuguese sentence into an English screen.
 */
export interface Language {
  /** BCP 47 tag. Travels to the API as `Accept-Language`. */
  code: LocaleCode;
  label: string;
  /** Iconify name of the flag shown in the topbar. */
  flag: string;
}

export type LocaleCode = 'pt-BR' | 'en-US';

export type MessageKey = keyof typeof ptBR;
export type Messages = Record<MessageKey, string>;

export const LANGUAGES: Language[] = [
  {
    code: 'pt-BR',
    label: 'Português (Brasil)',
    flag: 'twemoji:flag-brazil',
  },
  {
    code: 'en-US',
    label: 'English (US)',
    flag: 'twemoji:flag-united-states',
  },
];

export const DEFAULT_LOCALE: LocaleCode = 'pt-BR';

export const DEFAULT_LANGUAGE = LANGUAGES.find((item) => item.code === DEFAULT_LOCALE)!;

export const CATALOGUES: Record<LocaleCode, Messages> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

export const languageFor = (code: string): Language =>
  LANGUAGES.find((item) => item.code === code) ?? DEFAULT_LANGUAGE;

/**
 * Fills `{name}` placeholders. Deliberately the only formatting this does: a message that needs
 * more than substitution is a message that should be split, not a template language.
 */
export const format = (message: string, values?: Record<string, string | number>) => {
  if (!values) {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
};

export { ptBR, enUS };
